from rapidfuzz import fuzz, process
from typing import List, Tuple


def find_matching_plates(
    query: str, all_plates: List[str], limit: int = 10
) -> Tuple[List[str], List[Tuple[str, float]]]:
    """
    Returns (exact_matches, fuzzy_matches).
    Fuzzy matches use edit-distance ratio >= 85 and exclude exact matches.
    """
    query_upper = query.upper()
    exact = [p for p in all_plates if p == query_upper]

    fuzzy_results = process.extract(
        query_upper, all_plates, scorer=fuzz.ratio, limit=limit * 2
    )
    fuzzy_filtered = [
        (p, score)
        for p, score, _ in fuzzy_results
        if score >= 85 and p not in exact
    ]
    # Deduplicate while preserving order
    seen = set()
    deduped = []
    for p, score in fuzzy_filtered:
        if p not in seen:
            seen.add(p)
            deduped.append((p, score))
    return exact, deduped[:limit]


def plate_starts_with(query: str, all_plates: List[str], limit: int = 10) -> List[str]:
    """Return plates that start with the given prefix (case-insensitive)."""
    query_upper = query.upper()
    return [p for p in all_plates if p.startswith(query_upper)][:limit]
