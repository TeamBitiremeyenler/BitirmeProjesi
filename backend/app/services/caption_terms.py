from __future__ import annotations

import re

STOPWORDS = {
    "a",
    "an",
    "and",
    "at",
    "by",
    "for",
    "from",
    "in",
    "into",
    "of",
    "on",
    "or",
    "the",
    "to",
    "with",
}
SEARCHABLE_HUMAN_TERMS = {
    "person",
    "people",
    "man",
    "woman",
    "player",
    "portrait",
    "face",
    "beard",
    "glasses",
    "shirtless",
    "topless",
    "naked",
    "barechested",
    "speaker",
    "selfie",
    "smile",
}
NEGATION_TOKENS = {"no", "without", "not"}
NEGATED_TERM_EXPANSIONS: dict[str, tuple[str, ...]] = {
    "shirt": ("shirtless", "topless", "naked", "barechested"),
    "top": ("shirtless", "topless", "naked", "barechested"),
    "clothes": ("naked",),
    "clothing": ("naked",),
}
MAX_TAGS = 12


def normalize_term(value: str) -> str:
    return re.sub(r"[^\w]+", "", value.lower()).strip("_")


def tokenize_caption(caption: str) -> list[str]:
    return [normalize_term(token) for token in re.split(r"\s+", caption.lower())]


def normalized_unique_terms(caption: str) -> list[str]:
    unique_terms: list[str] = []
    seen_terms: set[str] = set()

    for token in tokenize_caption(caption):
        if not token or token in STOPWORDS:
            continue
        if token in seen_terms:
            continue

        seen_terms.add(token)
        unique_terms.append(token)

    return unique_terms


def find_next_meaningful_token(tokens: list[str], start_index: int) -> tuple[int | None, str | None]:
    for index in range(start_index, len(tokens)):
        token = tokens[index]
        if token and token not in STOPWORDS:
            return index, token
    return None, None


def extract_caption_terms(caption: str, *, max_terms: int = MAX_TAGS) -> list[str]:
    tokens = tokenize_caption(caption)
    extracted: list[str] = []
    consumed_indexes: set[int] = set()

    for index, token in enumerate(tokens):
        if index in consumed_indexes or not token:
            continue

        if token in NEGATION_TOKENS:
            search_start = index + 1
            if token == "not":
                wearing_index, wearing_token = find_next_meaningful_token(tokens, index + 1)
                if wearing_token == "wearing" and wearing_index is not None:
                    search_start = wearing_index + 1

            negated_index, negated_token = find_next_meaningful_token(tokens, search_start)
            if negated_token:
                if negated_index is not None:
                    consumed_indexes.add(negated_index)
                for expanded_term in NEGATED_TERM_EXPANSIONS.get(negated_token, ()):
                    if expanded_term not in extracted:
                        extracted.append(expanded_term)
                        if len(extracted) >= max_terms:
                            return extracted
            continue

        if len(token) < 3 or token in STOPWORDS or token in extracted:
            continue

        extracted.append(token)
        if len(extracted) >= max_terms:
            return extracted

    return extracted


def build_caption_tags(caption: str) -> list[str]:
    return extract_caption_terms(caption, max_terms=MAX_TAGS)


def has_searchable_human_terms(caption: str) -> bool:
    return bool(SEARCHABLE_HUMAN_TERMS.intersection(normalized_unique_terms(caption)))


def is_weak_human_caption(caption: str) -> bool:
    return not has_searchable_human_terms(caption)


def score_human_caption_quality(caption: str) -> int:
    unique_terms = normalized_unique_terms(caption)
    human_overlap = SEARCHABLE_HUMAN_TERMS.intersection(unique_terms)

    score = 0
    if human_overlap:
        score += 3

    score += min(max(len(unique_terms) - 1, 0), 3)

    if len(unique_terms) < 3:
        score -= 2

    if not human_overlap:
        score -= 2

    return score


def choose_preferred_human_caption(primary_caption: str, retry_caption: str) -> str:
    primary_score = score_human_caption_quality(primary_caption)
    retry_score = score_human_caption_quality(retry_caption)

    if retry_score > primary_score:
        return retry_caption

    if retry_score < primary_score:
        return primary_caption

    if len(normalized_unique_terms(retry_caption)) > len(normalized_unique_terms(primary_caption)):
        return retry_caption

    return primary_caption
