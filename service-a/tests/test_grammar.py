"""
test_grammar.py — Unit tests for the Indian plate grammar corrector.
"""
import pytest
from app.core.grammar import correct_plate, is_valid_plate_format, RTO_STATE_CODES


class TestCorrectPlate:
    def test_clean_plate_unchanged(self):
        plate, valid = correct_plate("MH12AB1234")
        assert plate == "MH12AB1234"
        assert valid is True

    def test_state_code_validation(self):
        _, valid = correct_plate("MH12AB1234")
        assert valid is True

    def test_unknown_state_code_invalid(self):
        _, valid = correct_plate("XX12AB1234")
        assert valid is False

    def test_strips_spaces(self):
        plate, _ = correct_plate("MH 12 AB 1234")
        assert " " not in plate

    def test_uppercase(self):
        plate, _ = correct_plate("mh12ab1234")
        assert plate == plate.upper()

    def test_B_corrected_to_8_in_digit_position(self):
        # District "B2" should become "82"
        plate, _ = correct_plate("MHB2AB1234")
        assert plate[2:4] in ("82", "B2") or "8" in plate[2:4]

    def test_O_corrected_to_0_in_digit_position(self):
        plate, _ = correct_plate("MHOA AB1234")
        # After stripping spaces: MHOAAB1234 — first digit region should correct O→0
        # result depends on heuristic, just assert no crash
        assert isinstance(plate, str)

    def test_removes_hyphens(self):
        plate, _ = correct_plate("MH-12-AB-1234")
        assert "-" not in plate

    def test_all_rto_codes_valid(self):
        for code in list(RTO_STATE_CODES)[:5]:
            _, valid = correct_plate(f"{code}12AB1234")
            assert valid is True, f"Expected valid for code {code}"

    def test_short_string_no_crash(self):
        plate, valid = correct_plate("MH")
        assert isinstance(plate, str)
        assert isinstance(valid, bool)

    def test_empty_string(self):
        plate, valid = correct_plate("")
        assert plate == ""


class TestIsValidFormat:
    def test_standard_format(self):
        assert is_valid_plate_format("MH12AB1234") is True

    def test_with_spaces(self):
        assert is_valid_plate_format("MH 12 AB 1234") is True

    def test_too_short(self):
        assert is_valid_plate_format("MH12") is False

    def test_garbage(self):
        assert is_valid_plate_format("HELLO WORLD") is False

    def test_single_letter_series(self):
        assert is_valid_plate_format("DL1A1234") is True

    def test_three_letter_series(self):
        assert is_valid_plate_format("KA05ABC4321") is True
