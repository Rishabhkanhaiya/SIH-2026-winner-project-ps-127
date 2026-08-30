"""
grammar.py — Indian licence-plate grammar validation and character-level correction.

Indian plate formats (BH series excluded for MVP):
    Standard : SS NN AA NNNN   e.g. MH 12 AB 1234
    Old style : SS N NNNN      e.g. MH 1 1234

Where:
    SS  = 2-letter RTO state/UT code
    NN  = 2-digit district code
    AA  = 1-2 letters (series)
    NNNN= 1-4 digits (serial)

Common character confusions corrected by position:
    In a numeric position: B→8, O→0, I→1, S→5, Z→2, G→6, Q→0
    In an alpha  position: 8→B, 0→O, 1→I, 5→S, 2→Z, 6→G
"""
from __future__ import annotations

import re
from typing import Tuple

# All valid 2-letter Indian RTO state / UT codes (as of 2026)
RTO_STATE_CODES = {
    "AN", "AP", "AR", "AS", "BR", "CG", "CH", "DD", "DL", "DN",
    "GA", "GJ", "HP", "HR", "JH", "JK", "KA", "KL", "LA", "LD",
    "MH", "ML", "MN", "MP", "MZ", "NL", "OD", "PB", "PY", "RJ",
    "SK", "TN", "TR", "TS", "UK", "UP", "WB",
}

# Character substitution maps
_NUM_TO_ALPHA: dict[str, str] = {
    "8": "B", "0": "O", "1": "I", "5": "S", "2": "Z", "6": "G",
}
_ALPHA_TO_NUM: dict[str, str] = {v: k for k, v in _NUM_TO_ALPHA.items()}
# Extra fixes specific to numeric positions
_ALPHA_TO_NUM.update({"Q": "0", "D": "0"})


# Standard Indian plate regex (allows for spaces/no-spaces in raw OCR)
# Captures: state(2) + district(1-2) + series(1-3) + serial(1-4)
_PLATE_PATTERN = re.compile(
    r"^([A-Z]{2})\s*(\d{1,2})\s*([A-Z]{1,3})\s*(\d{1,4})$"
)


def _fix_char(ch: str, expect_digit: bool) -> str:
    """Return corrected character based on expected position type."""
    if expect_digit:
        return _ALPHA_TO_NUM.get(ch, ch)
    else:
        return _NUM_TO_ALPHA.get(ch, ch)


def correct_plate(raw: str) -> Tuple[str, bool]:
    """
    Apply Indian plate grammar correction to a raw OCR string.

    Steps:
    1. Strip whitespace, uppercase.
    2. Remove any remaining spaces.
    3. Attempt to parse into SS-NN-AA-NNNN segments.
    4. Within each segment, fix character confusions by position type.
    5. Validate state code.

    Args:
        raw: Raw OCR string, e.g. "MH12A81234" or "MH 12 AB 1234".

    Returns:
        Tuple of (corrected_plate, state_code_valid).
        corrected_plate: Best-effort corrected string (uppercase, no spaces).
        state_code_valid: True if first two chars match a known RTO code.
    """
    # Normalise
    cleaned = raw.upper().replace(" ", "").replace("-", "")

    # Try to apply position-aware correction
    corrected = _positional_correct(cleaned)

    # Validate state code
    state_code = corrected[:2] if len(corrected) >= 2 else ""
    state_code_valid = state_code in RTO_STATE_CODES

    return corrected, state_code_valid


def _positional_correct(s: str) -> str:
    """
    Attempt position-aware character correction on a stripped plate string.

    The standard format has positions:
        0-1 : alpha  (state code)
        2-3 : digit  (district)
        4-6 : alpha  (series, 1-3 chars)
        7+  : digit  (serial, 1-4 digits)

    We try to parse and correct; if the string doesn't fit, we do a simpler
    best-effort correction using the regex.
    """
    if len(s) < 6:
        return s  # Too short to meaningfully correct

    # First try: regex-based segmentation (works on already-clean strings)
    m = _PLATE_PATTERN.match(s)
    if m:
        state, district, series, serial = m.groups()
        # district and serial are digits — fix alpha-in-digit-position
        district_fixed = "".join(_fix_char(c, True) for c in district)
        serial_fixed = "".join(_fix_char(c, True) for c in serial)
        # state and series are alpha — fix digit-in-alpha-position
        state_fixed = "".join(_fix_char(c, False) for c in state)
        series_fixed = "".join(_fix_char(c, False) for c in series)
        return f"{state_fixed}{district_fixed}{series_fixed}{serial_fixed}"

    # Second try: heuristic positional scan
    # Assume first 2 are alpha, next 2 are digits, rest follows
    result = []
    for i, ch in enumerate(s):
        if i < 2:
            result.append(_fix_char(ch, False))   # expect alpha
        elif i < 4:
            result.append(_fix_char(ch, True))    # expect digit
        elif i < 7:
            # Series region — if char looks like a digit in a short string, it's alpha
            result.append(_fix_char(ch, False))   # expect alpha
        else:
            result.append(_fix_char(ch, True))    # expect digit
    return "".join(result)


def is_valid_plate_format(plate: str) -> bool:
    """Return True if the plate matches standard Indian plate format."""
    return bool(_PLATE_PATTERN.match(plate.replace(" ", "").upper()))
