"""Tests for RFC-8785 Canonical JSON and SHA-256 Tamper-Evident Hash Chaining."""

from sentinel.canonical import canonical_json, compute_receipt_hash, verify_hash_chain


def test_canonical_json_key_sorting_and_whitespace():
    """Verify deterministic formatting regardless of dictionary insertion order."""
    dict_a = {"z": 1, "a": 2, "m": {"b": 3, "a": 4}}
    dict_b = {"a": 2, "m": {"a": 4, "b": 3}, "z": 1}

    canon_a = canonical_json(dict_a)
    canon_b = canonical_json(dict_b)

    assert canon_a == canon_b
    assert canon_a == '{"a":2,"m":{"a":4,"b":3},"z":1}'


def test_hash_chain_computes_and_verifies_success():
    """Verify that sequentially chained receipts pass integrity verification."""
    receipt1 = {
        "receipt_id": "rcpt_1",
        "action_id": "act_1",
        "decision": "DENY",
        "reason": "Blocked sensitive file",
    }
    hash1 = compute_receipt_hash(receipt1, previous_hash="GENESIS_SENTINEL_CHAIN_V1")
    receipt1["receipt_hash"] = hash1

    receipt2 = {
        "receipt_id": "rcpt_2",
        "action_id": "act_2",
        "decision": "ALLOW",
        "reason": "Allowed workspace read",
    }
    hash2 = compute_receipt_hash(receipt2, previous_hash=hash1)
    receipt2["receipt_hash"] = hash2

    receipt3 = {
        "receipt_id": "rcpt_3",
        "action_id": "act_3",
        "decision": "REQUIRE_APPROVAL",
        "reason": "Deployment gate",
    }
    hash3 = compute_receipt_hash(receipt3, previous_hash=hash2)
    receipt3["receipt_hash"] = hash3

    chain = [receipt1, receipt2, receipt3]
    assert verify_hash_chain(chain) is True


def test_hash_chain_fails_on_tampering():
    """Verify that tampering with any field in a past receipt breaks verification."""
    receipt1 = {"receipt_id": "rcpt_1", "decision": "DENY"}
    hash1 = compute_receipt_hash(receipt1, previous_hash="GENESIS_SENTINEL_CHAIN_V1")
    receipt1["receipt_hash"] = hash1

    receipt2 = {"receipt_id": "rcpt_2", "decision": "ALLOW"}
    hash2 = compute_receipt_hash(receipt2, previous_hash=hash1)
    receipt2["receipt_hash"] = hash2

    chain = [receipt1, receipt2]
    assert verify_hash_chain(chain) is True

    # Adversary attempts to rewrite history: change receipt1's decision from DENY to ALLOW
    tampered_receipt1 = dict(receipt1)
    tampered_receipt1["decision"] = "ALLOW"
    tampered_chain = [tampered_receipt1, receipt2]

    assert verify_hash_chain(tampered_chain) is False, "Tampered chain falsely verified as valid!"
