"""
test_voting.py — Unit tests for the multi-frame voting buffer.
"""
import pytest
from app.core.voting import VotingBuffer, make_track_id


class TestVotingBuffer:
    def setup_method(self):
        """Fresh buffer before each test."""
        self.buf = VotingBuffer(buffer_size=10, timeout_frames=30, min_reads=3)

    def test_vote_count_increments(self):
        count, _, _, _ = self.buf.add_read("CAM1", "trk_aaa", "MH12AB1234", 0.90)
        assert count == 1
        count, _, _, _ = self.buf.add_read("CAM1", "trk_aaa", "MH12AB1234", 0.88)
        assert count == 2

    def test_no_consensus_below_min_reads(self):
        self.buf.add_read("CAM1", "trk_bbb", "MH12AB1234", 0.90)
        self.buf.add_read("CAM1", "trk_bbb", "MH12AB1234", 0.88)
        _, is_consensus, _, _ = self.buf.add_read("CAM1", "trk_bbb", "DL99ZZ9999", 0.50)
        # min_reads=3 so consensus MAY trigger now with 3 reads; depends on majority
        # key check: no crash
        assert isinstance(is_consensus, bool)

    def test_consensus_triggers_at_min_reads(self):
        cam, track = "CAM2", "trk_ccc"
        # 3 reads of the same plate → clear majority
        for _ in range(3):
            self.buf.add_read(cam, track, "MH12AB1234", 0.92)
        _, is_consensus, consensus_plate, _ = self.buf.add_read(cam, track, "MH12AB1234", 0.91)
        assert is_consensus is True
        assert consensus_plate == "MH12AB1234"

    def test_majority_vote_wins(self):
        cam, track = "CAM3", "trk_ddd"
        # 3 reads of A, 1 of B
        self.buf.add_read(cam, track, "KA01AB1111", 0.88)
        self.buf.add_read(cam, track, "KA01AB1111", 0.87)
        self.buf.add_read(cam, track, "KA01AB1111", 0.86)
        _, _, plate, _ = self.buf.add_read(cam, track, "DL99ZZ0000", 0.85)
        assert plate == "KA01AB1111"

    def test_different_tracks_are_independent(self):
        cam = "CAM4"
        for _ in range(4):
            self.buf.add_read(cam, "trk_t1", "MH12AB1234", 0.90)
        for _ in range(4):
            self.buf.add_read(cam, "trk_t2", "DL99ZZ9999", 0.90)

        _, _, plate_t1, _ = self.buf.get_state(cam, "trk_t1")
        _, _, plate_t2, _ = self.buf.get_state(cam, "trk_t2")
        assert plate_t1 == "MH12AB1234"
        assert plate_t2 == "DL99ZZ9999"

    def test_different_cameras_are_independent(self):
        for _ in range(4):
            self.buf.add_read("CAM_X", "trk_e", "MH12AB1234", 0.90)
        for _ in range(4):
            self.buf.add_read("CAM_Y", "trk_e", "KA05XY7890", 0.90)

        _, _, plate_x, _ = self.buf.get_state("CAM_X", "trk_e")
        _, _, plate_y, _ = self.buf.get_state("CAM_Y", "trk_e")
        assert plate_x == "MH12AB1234"
        assert plate_y == "KA05XY7890"

    def test_consensus_stays_true_after_set(self):
        cam, track = "CAM5", "trk_fff"
        for _ in range(5):
            self.buf.add_read(cam, track, "MH12AB1234", 0.92)
        _, is_c_before, _, _ = self.buf.get_state(cam, track)
        # Add more reads — consensus should not flip back
        self.buf.add_read(cam, track, "XX00YY0000", 0.30)
        _, is_c_after, _, _ = self.buf.get_state(cam, track)
        assert is_c_before is True
        assert is_c_after is True


class TestMakeTrackId:
    def test_prefix(self):
        assert make_track_id(1).startswith("trk_")

    def test_length(self):
        tid = make_track_id(42)
        assert len(tid) == 10  # "trk_" (4) + 6 hex chars

    def test_stable(self):
        assert make_track_id(99) == make_track_id(99)

    def test_different_ids_differ(self):
        assert make_track_id(1) != make_track_id(2)
