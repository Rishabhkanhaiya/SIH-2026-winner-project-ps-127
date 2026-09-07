"""
Indian Government Number Plate Grammar & Zero-Confusion OCR Disambiguation System
Conforms to MoRTH (Ministry of Road Transport and Highways) vehicle registration standards.

Guarantees 100% structural slot determinism:
    Slot 1 (State Code) : 2 LETTERS (Valid Indian State/UT code)
    Slot 2 (RTO Code)   : 1-2 DIGITS (padded to 2 digits in canonical format)
    Slot 3 (Series)     : 1-2 (or 3) LETTERS
    Slot 4 (Number)     : 1-4 DIGITS (padded to 4 digits in canonical format)

Features:
    - Default placeholder detection (flags 'MH 01 AB 1234' / 'MH 12 AB 1234' as 'Wrong Read')
    - Confidence scoring (0.0 to 1.0 and percentage) combining model confidence, grammar validity, and image quality
    - Complete slot-based letter/digit confusion auto-repair (0 vs O, 1 vs I, 0 vs D, etc.)
"""

import re
from typing import Dict, Any, Optional, Tuple, List

# Official MoRTH State and Union Territory codes
INDIAN_STATE_CODES: Dict[str, str] = {
    "AN": "Andaman and Nicobar Islands",
    "AP": "Andhra Pradesh",
    "AR": "Arunachal Pradesh",
    "AS": "Assam",
    "BR": "Bihar",
    "CG": "Chhattisgarh",
    "CH": "Chandigarh",
    "DD": "Daman and Diu",
    "DL": "Delhi",
    "DN": "Dadra and Nagar Haveli and Daman and Diu",
    "GA": "Goa",
    "GJ": "Gujarat",
    "HP": "Himachal Pradesh",
    "HR": "Haryana",
    "JH": "Jharkhand",
    "JK": "Jammu and Kashmir",
    "KA": "Karnataka",
    "KL": "Kerala",
    "LA": "Ladakh",
    "LD": "Lakshadweep",
    "MH": "Maharashtra",
    "ML": "Meghalaya",
    "MN": "Manipur",
    "MP": "Madhya Pradesh",
    "MZ": "Mizoram",
    "NL": "Nagaland",
    "OD": "Odisha",
    "OR": "Odisha",  # Older registration prefix
    "PB": "Punjab",
    "PY": "Puducherry",
    "RJ": "Rajasthan",
    "SK": "Sikkim",
    "TN": "Tamil Nadu",
    "TR": "Tripura",
    "TS": "Telangana",
    "UA": "Uttarakhand",  # Older registration prefix
    "UK": "Uttarakhand",
    "UP": "Uttar Pradesh",
    "WB": "West Bengal",
}

# Known default hallucination/placeholder plates to reject as "Wrong Read"
DEFAULT_PLACEHOLDER_PLATES = {
    "MH 01 AB 1234",
    "MH 12 AB 1234",
    "MH01AB1234",
    "MH12AB1234"
}

# Mapping letters/symbols to digits (for RTO and Number slots)
LETTER_TO_DIGIT: Dict[str, str] = {
    'O': '0', 'o': '0', 'Q': '0', 'D': '0',
    'I': '1', 'i': '1', 'l': '1', '|': '1', '!': '1',
    'Z': '2', 'z': '2',
    'E': '3',
    'A': '4',
    'S': '5', 's': '5',
    'G': '6', 'b': '6',
    'T': '7',
    'B': '8',
    'g': '9', 'q': '9'
}

# Mapping digits to candidate letters (for Series and State slots)
DIGIT_TO_LETTER: Dict[str, str] = {
    '0': 'O',
    '1': 'I',
    '2': 'Z',
    '3': 'E',
    '4': 'A',
    '5': 'S',
    '6': 'G',
    '7': 'T',
    '8': 'B',
    '9': 'G'
}

# Specialized candidate mapping for 2-letter state code search
STATE_CHAR_CANDIDATES: Dict[str, List[str]] = {
    '0': ['D', 'O'],
    '1': ['I', 'L', 'T', 'J'],
    '2': ['Z'],
    '3': ['E'],
    '4': ['A'],
    '5': ['S'],
    '6': ['G', 'C'],
    '7': ['T'],
    '8': ['B'],
    '9': ['G'],
    'O': ['D', 'O'],
    'D': ['D', 'O'],
    'I': ['I', 'L', 'T'],
    'L': ['L', 'I'],
    'B': ['B', '8'],
}

STRICT_REGEX = re.compile(r"^([A-Z]{2})\s*([0-9]{2})\s*([A-Z]{2})\s*([0-9]{4})$")
STANDARD_MORTH_REGEX = re.compile(r"^([A-Z]{2})\s*([0-9]{1,2})\s*([A-Z]{1,3})\s*([0-9]{1,4})$")
BHARAT_SERIES_REGEX = re.compile(r"^([0-9]{2})\s*(BH)\s*([0-9]{4})\s*([A-Z]{1,2})$")


class PlateGrammar:
    """
    Validates, parses, normalizes, disambiguates, and scores confidence for Indian vehicle registration plates.
    """

    @classmethod
    def to_digit(cls, char: str) -> str:
        """Deterministically converts a character to a digit."""
        return LETTER_TO_DIGIT.get(char, char)

    @classmethod
    def to_letter(cls, char: str) -> str:
        """Deterministically converts a character to an uppercase letter."""
        if char.isdigit():
            return DIGIT_TO_LETTER.get(char, char)
        return char.upper()

    @classmethod
    def is_default_placeholder(cls, plate_text: str) -> bool:
        """
        Checks if the plate matches known default examples (e.g. MH 01 AB 1234 or MH 12 AB 1234).
        """
        if not plate_text:
            return False
        clean = re.sub(r'[^A-Za-z0-9]', '', plate_text).upper()
        for placeholder in DEFAULT_PLACEHOLDER_PLATES:
            if clean == re.sub(r'[^A-Za-z0-9]', '', placeholder):
                return True
        return False

    @classmethod
    def repair_state_code(cls, state_raw: str) -> Tuple[Optional[str], Optional[str], bool]:
        """
        Validates and repairs the 2-letter Indian state code.
        Returns: (repaired_code, state_name, was_repaired)
        """
        if len(state_raw) != 2:
            return None, None, False

        raw_upper = state_raw.upper()
        if raw_upper in INDIAN_STATE_CODES:
            return raw_upper, INDIAN_STATE_CODES[raw_upper], False

        c0_list = STATE_CHAR_CANDIDATES.get(raw_upper[0], [raw_upper[0]])
        c1_list = STATE_CHAR_CANDIDATES.get(raw_upper[1], [raw_upper[1]])

        for c0 in c0_list:
            for c1 in c1_list:
                cand = c0 + c1
                if cand in INDIAN_STATE_CODES:
                    return cand, INDIAN_STATE_CODES[cand], True

        return None, None, False

    @classmethod
    def repair_rto(cls, rto_raw: str, state_code: Optional[str] = None) -> Tuple[Optional[str], bool]:
        """Forces RTO code to be numeric digits (e.g. O1 -> 01, D1 -> 01, 1 -> 01)."""
        if not rto_raw:
            return None, False
        # Special case: Delhi category RTO (e.g. 1C, 2C, 3C, 4C, 1S, etc.)
        if state_code == "DL" and len(rto_raw) == 2 and rto_raw[0].isdigit() and rto_raw[1].isalpha():
            return rto_raw.upper(), False
        repaired = "".join(cls.to_digit(c) for c in rto_raw)
        if repaired.isdigit() and 1 <= len(repaired) <= 2:
            padded = repaired.zfill(2)
            was_repaired = (padded != rto_raw)
            return padded, was_repaired
        return None, False

    @classmethod
    def repair_series(cls, series_raw: str) -> Tuple[Optional[str], bool]:
        """
        Forces vehicle series code to be uppercase letters (e.g. A8 -> AB, 4B -> AB, CD -> CD).
        Preserves 'D' as letter 'D' because this is a strictly alphabetic slot.
        """
        if not series_raw:
            return None, False
        repaired = "".join(cls.to_letter(c) for c in series_raw)
        if repaired.isalpha() and 1 <= len(repaired) <= 3:
            was_repaired = (repaired != series_raw)
            return repaired, was_repaired
        return None, False

    @classmethod
    def repair_number(cls, num_raw: str) -> Tuple[Optional[str], bool]:
        """
        Forces registration number to be numeric digits (e.g. 12D4 -> 1204, D001 -> 0001, I234 -> 1234).
        """
        if not num_raw:
            return None, False
        repaired = "".join(cls.to_digit(c) for c in num_raw)
        if repaired.isdigit() and 1 <= len(repaired) <= 4:
            padded = repaired.zfill(4)
            was_repaired = (padded != num_raw)
            return padded, was_repaired
        return None, False

    @classmethod
    def _split_into_slots(cls, raw_text: str) -> Optional[Tuple[str, str, str, str]]:
        """Splits input text into 4 raw slots (State, RTO, Series, Number)."""
        tokens = re.findall(r'[A-Za-z0-9]+', raw_text)
        if not tokens:
            return None

        # Case 1: Exactly 4 tokens
        if len(tokens) == 4:
            return tokens[0], tokens[1], tokens[2], tokens[3]

        # Case 2: 2 tokens (Stacked plate)
        if len(tokens) == 2:
            t1, t2 = tokens[0], tokens[1]
            if len(t1) >= 3 and len(t2) >= 3:
                state_raw = t1[:2]
                rto_raw = t1[2:]
                if len(t2) > 4:
                    series_raw = t2[:-4]
                    num_raw = t2[-4:]
                else:
                    series_raw = t2[:1]
                    num_raw = t2[1:]
                return state_raw, rto_raw, series_raw, num_raw

        # Case 3: 3 tokens
        if len(tokens) == 3:
            if len(tokens[0]) >= 3:
                return tokens[0][:2], tokens[0][2:], tokens[1], tokens[2]
            if len(tokens[1]) >= 3:
                return tokens[0], tokens[1][:2], tokens[1][2:], tokens[2]
            if len(tokens[2]) > 4:
                return tokens[0], tokens[1], tokens[2][:-4], tokens[2][-4:]

        # Case 4: Single continuous string
        full = "".join(tokens)
        if len(full) == 10:
            return full[0:2], full[2:4], full[4:6], full[6:10]
        elif len(full) == 9:
            return full[0:2], full[2:4], full[4:5], full[5:9]
        elif len(full) == 8:
            return full[0:2], full[2:3], full[3:4], full[4:8]

        return None

    @classmethod
    def calculate_confidence(
        cls,
        is_valid: bool,
        is_strict: bool,
        is_wrong_read: bool,
        ocr_repaired: bool,
        model_confidence: Optional[float] = None,
        image_quality: Optional[str] = None
    ) -> float:
        """
        Calculates a composite confidence score (0.0 to 1.0) based on:
        - Detection validity & strictness
        - Placeholder 'Wrong read' detection
        - Model self-assessment
        - OCR character repairs
        - Visual image quality
        """
        if is_wrong_read or not is_valid:
            return 0.0

        # Base score
        if model_confidence is not None and 0.0 <= model_confidence <= 1.0:
            base = model_confidence
        else:
            base = 0.94 if is_strict else 0.86

        # Strict grammar bonus
        if is_strict:
            base = min(1.0, base + 0.03)

        # Repair penalty (minor deduction if characters had to be fixed)
        if ocr_repaired:
            base = max(0.1, base - 0.05)

        # Image quality adjustments
        if image_quality:
            q = image_quality.lower()
            if q in ("high", "clear", "good"):
                base = min(1.0, base + 0.02)
            elif q in ("blurry", "low", "dark", "glare", "degraded"):
                base = max(0.2, base - 0.12)
            elif q in ("medium", "average"):
                base = max(0.4, base - 0.02)

        return round(min(1.0, max(0.0, base)), 3)

    @classmethod
    def validate_and_parse(
        cls,
        raw_text: str,
        auto_repair: bool = True,
        model_confidence: Optional[float] = None,
        image_quality: Optional[str] = None,
        check_placeholders: bool = True
    ) -> Dict[str, Any]:
        """
        Validates, parses, normalizes, disambiguates, and scores vehicle registration plates.
        """
        if not raw_text or not raw_text.strip():
            return {
                "is_valid": False,
                "is_strict": False,
                "is_wrong_read": False,
                "format_matched": None,
                "normalized_plate": "",
                "confidence": 0.0,
                "confidence_percent": "0.0%",
                "components": {
                    "state_code": None,
                    "state_name": None,
                    "rto_code": None,
                    "series": None,
                    "number": None,
                },
                "errors": ["Empty registration plate string."],
                "ocr_repaired": False,
            }

        # 1. Check for Default Placeholder Hallucinations ('MH 01 AB 1234' / 'MH 12 AB 1234')
        if check_placeholders and cls.is_default_placeholder(raw_text):
            return {
                "is_valid": False,
                "is_strict": False,
                "is_wrong_read": True,
                "format_matched": "WRONG_READ_DEFAULT_PLACEHOLDER",
                "normalized_plate": "Wrong read",
                "confidence": 0.0,
                "confidence_percent": "0.0%",
                "components": {
                    "state_code": None,
                    "state_name": None,
                    "rto_code": None,
                    "series": None,
                    "number": None,
                },
                "errors": ["Wrong read: Detected default placeholder plate ('MH 01 AB 1234' / 'MH 12 AB 1234'). The image is either illegible or a hallucination occurred."],
                "ocr_repaired": False,
            }

        compact = re.sub(r'[^A-Za-z0-9]', '', raw_text).upper()

        # Check Bharat Series: YY BH DDDD XX
        bh_match = BHARAT_SERIES_REGEX.match(compact)
        if bh_match:
            year, bh, number, series = bh_match.groups()
            norm = f"{year} {bh} {number} {series}"
            conf = cls.calculate_confidence(True, False, False, False, model_confidence, image_quality)
            return {
                "is_valid": True,
                "is_strict": False,
                "is_wrong_read": False,
                "format_matched": "BHARAT_SERIES",
                "normalized_plate": norm,
                "confidence": conf,
                "confidence_percent": f"{round(conf * 100, 1)}%",
                "components": {
                    "state_code": "BH",
                    "state_name": "Bharat Series (All India)",
                    "rto_code": year,
                    "series": series,
                    "number": number,
                },
                "errors": [],
                "ocr_repaired": False,
            }

        # Attempt slot-based extraction and disambiguation
        slots = cls._split_into_slots(raw_text)
        if slots:
            state_raw, rto_raw, series_raw, num_raw = slots

            # 1. State Code (Letters)
            state_code, state_name, state_repaired = cls.repair_state_code(state_raw)
            if state_code:
                # 2. RTO Code (Digits or Delhi category)
                rto_code, rto_repaired = cls.repair_rto(rto_raw, state_code)
                # 3. Series Code (Letters)
                series_code, series_repaired = cls.repair_series(series_raw)
                # 4. Number Code (Digits)
                num_code, num_repaired = cls.repair_number(num_raw)

                if rto_code and series_code and num_code:
                    was_repaired = state_repaired or rto_repaired or series_repaired or num_repaired
                    is_strict = (len(state_code) == 2 and len(rto_code) == 2 and len(series_code) in (1, 2) and len(num_code) == 4)
                    norm_plate = f"{state_code} {rto_code} {series_code} {num_code}"

                    # Secondary check for placeholder after normalization
                    if check_placeholders and cls.is_default_placeholder(norm_plate):
                        return {
                            "is_valid": False,
                            "is_strict": False,
                            "is_wrong_read": True,
                            "format_matched": "WRONG_READ_DEFAULT_PLACEHOLDER",
                            "normalized_plate": "Wrong read",
                            "confidence": 0.0,
                            "confidence_percent": "0.0%",
                            "components": {
                                "state_code": None,
                                "state_name": None,
                                "rto_code": None,
                                "series": None,
                                "number": None,
                            },
                            "errors": ["Wrong read: Detected default placeholder plate ('MH 01 AB 1234' / 'MH 12 AB 1234'). The image is either illegible or a hallucination occurred."],
                            "ocr_repaired": False,
                        }

                    conf = cls.calculate_confidence(True, is_strict, False, was_repaired, model_confidence, image_quality)

                    return {
                        "is_valid": True,
                        "is_strict": is_strict,
                        "is_wrong_read": False,
                        "format_matched": "STRICT_CC_DD_CC_DDDD" if is_strict else "STANDARD_MoRTH",
                        "normalized_plate": norm_plate,
                        "confidence": conf,
                        "confidence_percent": f"{round(conf * 100, 1)}%",
                        "components": {
                            "state_code": state_code,
                            "state_name": state_name,
                            "rto_code": rto_code,
                            "series": series_code,
                            "number": num_code,
                        },
                        "errors": [],
                        "ocr_repaired": was_repaired,
                    }

        # Fallback standard regex test for unpadded / irregular inputs
        morth_match = STANDARD_MORTH_REGEX.match(compact)
        if morth_match:
            st, rto, ser, num = morth_match.groups()
            st_name = INDIAN_STATE_CODES.get(st)
            if st_name:
                f_rto, f_num = rto.zfill(2), num.zfill(4)
                norm_plate = f"{st} {f_rto} {ser} {f_num}"

                if check_placeholders and cls.is_default_placeholder(norm_plate):
                    return {
                        "is_valid": False,
                        "is_strict": False,
                        "is_wrong_read": True,
                        "format_matched": "WRONG_READ_DEFAULT_PLACEHOLDER",
                        "normalized_plate": "Wrong read",
                        "confidence": 0.0,
                        "confidence_percent": "0.0%",
                        "components": {
                            "state_code": None,
                            "state_name": None,
                            "rto_code": None,
                            "series": None,
                            "number": None,
                        },
                        "errors": ["Wrong read: Detected default placeholder plate ('MH 01 AB 1234' / 'MH 12 AB 1234'). The image is either illegible or a hallucination occurred."],
                        "ocr_repaired": False,
                    }

                is_strict = (len(st) == 2 and len(f_rto) == 2 and len(ser) == 2 and len(f_num) == 4)
                conf = cls.calculate_confidence(True, is_strict, False, False, model_confidence, image_quality)
                return {
                    "is_valid": True,
                    "is_strict": is_strict,
                    "is_wrong_read": False,
                    "format_matched": "STRICT_CC_DD_CC_DDDD" if is_strict else "STANDARD_MoRTH",
                    "normalized_plate": norm_plate,
                    "confidence": conf,
                    "confidence_percent": f"{round(conf * 100, 1)}%",
                    "components": {
                        "state_code": st,
                        "state_name": st_name,
                        "rto_code": f_rto,
                        "series": ser,
                        "number": f_num,
                    },
                    "errors": [],
                    "ocr_repaired": False,
                }

        # Failed validation
        return {
            "is_valid": False,
            "is_strict": False,
            "is_wrong_read": False,
            "format_matched": None,
            "normalized_plate": raw_text.strip().upper(),
            "confidence": 0.0,
            "confidence_percent": "0.0%",
            "components": {
                "state_code": None,
                "state_name": None,
                "rto_code": None,
                "series": None,
                "number": None,
            },
            "errors": ["Does not conform to Indian registration grammar (expected CC DD CC DDDD)."],
            "ocr_repaired": False,
        }
