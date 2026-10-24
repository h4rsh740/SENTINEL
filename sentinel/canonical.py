"""Canonical JSON Serialization & SHA-256 Tamper-Evident Hash Chaining.

Complies with RFC-8785 (JSON Canonicalization Scheme) principles:
- Predictable, deterministic JSON encoding.
- Sorted keys at all nested levels.
- Strict whitespace elimination.
- Cryptographic SHA-256 hashing linking each receipt to its predecessor.
"""

import hashlib
import json
from typing import Any, Dict, Optional


def canonical_json(obj: Any) -> str:
    """Return a deterministic, canonical JSON representation of `obj`.

    Keys are recursively sorted and separators are stripped of whitespace.
    """
    return json.dumps(
        obj,
        sort_keys=True,
        ensure_ascii=False,
        separators=(",", ":"),
        default=str,
    )


def compute_receipt_hash(receipt_data: Dict[str, Any], previous_hash: Optional[str] = None) -> str:
    """Compute SHA-256 hash of canonical receipt data chained with `previous_hash`."""
    # Exclude any self-referencing receipt_hash before hashing
    clean_data = {k: v for k, v in receipt_data.items() if k != "receipt_hash"}
    canonical_repr = canonical_json(clean_data)
    prev = previous_hash or "GENESIS_SENTINEL_CHAIN_V1"
    payload = f"{prev}:{canonical_repr}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def verify_hash_chain(receipts: list) -> bool:
    """Verify the integrity of a chain of receipts from genesis onward.

    Returns True if every hash matches its computed payload and predecessor.
    """
    previous_hash = "GENESIS_SENTINEL_CHAIN_V1"
    for r in receipts:
        expected_hash = r.get("receipt_hash")
        computed = compute_receipt_hash(r, previous_hash)
        if computed != expected_hash:
            return False
        previous_hash = expected_hash
    return True
