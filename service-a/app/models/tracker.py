"""
tracker.py — ByteTrack multi-object tracker wrapper.

One ByteTrack instance is maintained per camera_id to ensure tracking state
does not bleed across different camera feeds.

ByteTrack requires a matching algorithm. We use scipy.optimize.linear_sum_assignment
as a pure-Python fallback (no lap required), making the service GPU- and
dependency-free.
"""
from __future__ import annotations

import logging
import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np

from app.models.detector import Detection

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────
# Minimal ByteTrack-style tracker
# ──────────────────────────────────────────────────────────────────
# We implement a lightweight, dependency-free ByteTrack-inspired tracker
# that handles the fixed-camera use case well.  The full ByteTrack paper
# two-stage (high-score + low-score) association is implemented below.
# If the `ultralytics` BOTSORT or `bytetracker` package is available it
# can be swapped in here without changing the public interface.

@dataclass
class Track:
    track_id: int
    bbox: Tuple[float, float, float, float]   # cx, cy, w, h
    confidence: float
    hits: int = 1
    age: int = 0           # frames since last update
    state: str = "active"  # "active" | "lost" | "removed"
    kalman_mean: np.ndarray = field(default_factory=lambda: np.zeros(8))
    kalman_cov: np.ndarray = field(default_factory=lambda: np.eye(8))


class SimpleByteTracker:
    """
    Lightweight ByteTrack-inspired tracker for fixed-camera feeds.

    Maintains a set of active tracks and associates new detections using
    IoU-based Hungarian matching, identical in spirit to ByteTrack's high-
    confidence first-pass association.
    """

    def __init__(
        self,
        track_thresh: float = 0.5,
        high_thresh: float = 0.6,
        match_thresh: float = 0.8,
        max_age: int = 30,
    ):
        self.track_thresh = track_thresh
        self.high_thresh = high_thresh
        self.match_thresh = match_thresh
        self.max_age = max_age
        self._tracks: List[Track] = []
        self._next_id: int = 1

    def update(self, detections: List[Detection]) -> List[Tuple[int, Detection]]:
        """
        Update tracker with new detections.

        Args:
            detections: List of Detection objects from YOLO.

        Returns:
            List of (track_id, Detection) pairs for detections that were matched
            or newly initialised.
        """
        # Predict step: age all existing tracks
        for t in self._tracks:
            t.age += 1

        # Split detections into high / low confidence
        high_dets = [d for d in detections if d.confidence >= self.high_thresh]
        low_dets = [d for d in detections if d.confidence < self.high_thresh and d.confidence >= self.track_thresh]

        active_tracks = [t for t in self._tracks if t.state == "active"]

        # ── Pass 1: match high-confidence detections to active tracks ──
        matched, unmatched_tracks, unmatched_dets = self._associate(
            active_tracks, high_dets
        )

        results: List[Tuple[int, Detection]] = []

        # Update matched tracks
        for t_idx, d_idx in matched:
            track = active_tracks[t_idx]
            det = high_dets[d_idx]
            track.bbox = _det_to_xywh(det)
            track.confidence = det.confidence
            track.hits += 1
            track.age = 0
            results.append((track.track_id, det))

        # ── Pass 2: match low-confidence detections to unmatched tracks ──
        unmatched_active = [active_tracks[i] for i in unmatched_tracks]
        matched2, still_unmatched_tracks, _ = self._associate(unmatched_active, low_dets)

        for t_idx, d_idx in matched2:
            track = unmatched_active[t_idx]
            det = low_dets[d_idx]
            track.bbox = _det_to_xywh(det)
            track.confidence = det.confidence
            track.hits += 1
            track.age = 0
            results.append((track.track_id, det))

        # ── Initialise new tracks for unmatched high-confidence detections ──
        for d_idx in unmatched_dets:
            det = high_dets[d_idx]
            new_track = Track(
                track_id=self._next_id,
                bbox=_det_to_xywh(det),
                confidence=det.confidence,
            )
            self._next_id += 1
            self._tracks.append(new_track)
            results.append((new_track.track_id, det))

        # ── Mark lost / remove stale tracks ──
        for t in self._tracks:
            if t.age > self.max_age:
                t.state = "removed"
        self._tracks = [t for t in self._tracks if t.state != "removed"]

        return results

    def _associate(
        self, tracks: List[Track], dets: List[Detection]
    ) -> Tuple[List[Tuple[int, int]], List[int], List[int]]:
        """IoU-based Hungarian assignment. Returns (matched, unmatched_track_ids, unmatched_det_ids)."""
        if not tracks or not dets:
            return [], list(range(len(tracks))), list(range(len(dets)))

        cost = np.zeros((len(tracks), len(dets)), dtype=np.float32)
        for ti, track in enumerate(tracks):
            for di, det in enumerate(dets):
                cost[ti, di] = 1.0 - _iou_xywh(track.bbox, _det_to_xywh(det))

        from scipy.optimize import linear_sum_assignment
        row_ind, col_ind = linear_sum_assignment(cost)

        matched, unmatched_t, unmatched_d = [], [], []
        matched_t = set()
        matched_d = set()

        for ri, ci in zip(row_ind, col_ind):
            if cost[ri, ci] > (1.0 - self.match_thresh):
                unmatched_t.append(ri)
                unmatched_d.append(ci)
            else:
                matched.append((ri, ci))
                matched_t.add(ri)
                matched_d.add(ci)

        for ti in range(len(tracks)):
            if ti not in matched_t:
                unmatched_t.append(ti)
        for di in range(len(dets)):
            if di not in matched_d:
                unmatched_d.append(di)

        return matched, unmatched_t, unmatched_d


# ──────────────────────────────────────────────────────────────────
# Per-camera tracker registry
# ──────────────────────────────────────────────────────────────────

class TrackerRegistry:
    """
    Maintains one SimpleByteTracker per camera_id.
    Thread-safety: not required for single Uvicorn worker.
    """

    def __init__(self):
        self._trackers: Dict[str, SimpleByteTracker] = {}

    def get_or_create(self, camera_id: str) -> SimpleByteTracker:
        if camera_id not in self._trackers:
            self._trackers[camera_id] = SimpleByteTracker()
        return self._trackers[camera_id]

    def update(
        self, camera_id: str, detections: List[Detection]
    ) -> List[Tuple[int, Detection]]:
        return self.get_or_create(camera_id).update(detections)


# ──────────────────────────────────────────────────────────────────
# Geometry helpers
# ──────────────────────────────────────────────────────────────────

def _det_to_xywh(det: Detection) -> Tuple[float, float, float, float]:
    cx = (det.x1 + det.x2) / 2
    cy = (det.y1 + det.y2) / 2
    w = det.x2 - det.x1
    h = det.y2 - det.y1
    return (cx, cy, w, h)


def _iou_xywh(
    a: Tuple[float, float, float, float],
    b: Tuple[float, float, float, float],
) -> float:
    ax1, ay1 = a[0] - a[2] / 2, a[1] - a[3] / 2
    ax2, ay2 = a[0] + a[2] / 2, a[1] + a[3] / 2
    bx1, by1 = b[0] - b[2] / 2, b[1] - b[3] / 2
    bx2, by2 = b[0] + b[2] / 2, b[1] + b[3] / 2
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
    union = (ax2 - ax1) * (ay2 - ay1) + (bx2 - bx1) * (by2 - by1) - inter
    return inter / union if union > 0 else 0.0


# Module-level singleton
tracker_registry = TrackerRegistry()
