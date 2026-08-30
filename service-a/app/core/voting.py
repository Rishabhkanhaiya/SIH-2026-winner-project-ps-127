"""
voting.py — Multi-frame voting buffer for per-(camera_id, track_id) OCR reads.

Behaviour (per spec step 9):
    • Each call to `add_read` pushes a (plate_string, confidence) pair into
      the buffer for that track.
    • `is_consensus` is True when enough evidence has accumulated
      (≥ vote_min_reads reads OR buffer size reached) AND a stable majority
      winner exists.
    • Once a track is marked consensus, subsequent reads still update the buffer
      but is_consensus stays True (so callers can see the stable result).
    • Tracks that go `vote_timeout_frames` frames without a new read are
      automatically evicted (their state is cleared).
"""
from __future__ import annotations

import hashlib
import time
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from typing import Dict, Optional, Tuple

from app.config import settings


@dataclass
class TrackBuffer:
    reads: list[Tuple[str, float]] = field(default_factory=list)
    is_consensus: bool = False
    consensus_plate: Optional[str] = None
    consensus_confidence: float = 0.0
    last_frame_time: float = field(default_factory=time.monotonic)
    vote_count: int = 0


class VotingBuffer:
    """
    In-memory multi-frame voting buffer.

    Keyed by (camera_id, track_id).  Thread-safety is not required because
    FastAPI with a single Uvicorn worker processes requests sequentially within
    the async event loop; if you move to multiple workers, wrap with a lock.
    """

    def __init__(
        self,
        buffer_size: int = None,
        timeout_frames: int = None,
        min_reads: int = None,
    ):
        self._buffer_size = buffer_size or settings.vote_buffer_size
        self._timeout_frames = timeout_frames or settings.vote_timeout_frames
        self._min_reads = min_reads or settings.vote_min_reads
        self._tracks: Dict[Tuple[str, str], TrackBuffer] = defaultdict(TrackBuffer)

    # ──────────────────────────────────────────
    # Public API
    # ──────────────────────────────────────────

    def add_read(
        self,
        camera_id: str,
        track_id: str,
        plate: str,
        confidence: float,
    ) -> Tuple[int, bool, Optional[str], float]:
        """
        Add one OCR read for a track and return the updated voting state.

        Args:
            camera_id: Camera the frame came from.
            track_id:  Track ID assigned by ByteTrack.
            plate:     Corrected plate string.
            confidence: OCR confidence [0.0, 1.0].

        Returns:
            (vote_count, is_consensus, consensus_plate, consensus_confidence)
        """
        key = (camera_id, track_id)
        buf = self._tracks[key]
        buf.last_frame_time = time.monotonic()

        buf.reads.append((plate, confidence))
        buf.vote_count = len(buf.reads)

        # Check for consensus
        if not buf.is_consensus:
            self._try_consensus(buf)

        # Evict oldest read if buffer overflows (keep rolling window)
        if len(buf.reads) > self._buffer_size:
            buf.reads.pop(0)

        return (
            buf.vote_count,
            buf.is_consensus,
            buf.consensus_plate,
            buf.consensus_confidence,
        )

    def get_state(
        self, camera_id: str, track_id: str
    ) -> Tuple[int, bool, Optional[str], float]:
        """Return current voting state without adding a read."""
        key = (camera_id, track_id)
        buf = self._tracks.get(key)
        if buf is None:
            return (0, False, None, 0.0)
        return (
            buf.vote_count,
            buf.is_consensus,
            buf.consensus_plate,
            buf.consensus_confidence,
        )

    def evict_stale_tracks(self) -> None:
        """Remove tracks that have not received a read for timeout_frames worth of time."""
        now = time.monotonic()
        # Estimate frame time as 1/30s; timeout_frames × frame_time = timeout in seconds
        timeout_seconds = self._timeout_frames / 30.0
        stale = [
            k for k, v in self._tracks.items()
            if now - v.last_frame_time > timeout_seconds
        ]
        for k in stale:
            del self._tracks[k]

    # ──────────────────────────────────────────
    # Internal helpers
    # ──────────────────────────────────────────

    def _try_consensus(self, buf: TrackBuffer) -> None:
        """Mark consensus if enough reads have accumulated."""
        if len(buf.reads) < self._min_reads:
            return

        # Majority vote: count occurrences of each plate string
        counter = Counter(plate for plate, _ in buf.reads)
        winner, _ = counter.most_common(1)[0]

        # Average confidence of winning plate reads
        winning_confidences = [conf for plate, conf in buf.reads if plate == winner]
        avg_conf = sum(winning_confidences) / len(winning_confidences)

        buf.is_consensus = True
        buf.consensus_plate = winner
        buf.consensus_confidence = avg_conf


def make_track_id(raw_id: int | str) -> str:
    """
    Convert a ByteTrack integer track ID to the spec's `trk_xxxxxx` format.

    Args:
        raw_id: The integer ID assigned by ByteTrack (or any hashable).

    Returns:
        A stable 6-char hex string prefixed with "trk_".
    """
    h = hashlib.sha1(str(raw_id).encode()).hexdigest()[:6]
    return f"trk_{h}"


# Module-level singleton used by the route handler
voting_buffer = VotingBuffer()
