"""SQLite-backed Persistent Store for Decision Receipts and Approvals.

Provides tamper-evident record keeping, chain traversal, and approval management.
"""

import json
from pathlib import Path
import sqlite3
from typing import Any, Dict, List, Optional

from sentinel.canonical import compute_receipt_hash, verify_hash_chain
from sentinel.models import ApprovalRequest, ApprovalStatus, Decision, Receipt


class SentinelStore:
    """Persistent storage engine for receipts and approvals."""

    def __init__(self, db_path: str = "sentinel_audit.db"):
        self.db_path = db_path
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        """Create tables if they don't exist."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS receipts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    receipt_id TEXT UNIQUE NOT NULL,
                    action_id TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    policy_digest TEXT NOT NULL,
                    tool TEXT NOT NULL,
                    operation TEXT NOT NULL,
                    resource TEXT NOT NULL,
                    decision TEXT NOT NULL,
                    explanation_code TEXT NOT NULL,
                    reason TEXT NOT NULL,
                    matched_rule_id TEXT,
                    execution_outcome TEXT,
                    receipt_hash TEXT NOT NULL,
                    previous_receipt_hash TEXT,
                    evidence_json TEXT NOT NULL
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS approvals (
                    approval_id TEXT PRIMARY KEY,
                    action_id TEXT NOT NULL,
                    rule_id TEXT NOT NULL,
                    reason TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    resolved_at TEXT,
                    resolved_by TEXT,
                    notes TEXT,
                    action_payload_json TEXT NOT NULL
                )
            """)
            conn.commit()

    def get_latest_receipt_hash(self) -> str:
        """Fetch the most recent receipt hash in the database, or the genesis string."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT receipt_hash FROM receipts ORDER BY id DESC LIMIT 1")
            row = cursor.fetchone()
            if row and row["receipt_hash"]:
                return row["receipt_hash"]
        return "GENESIS_SENTINEL_CHAIN_V1"

    def record_decision(
        self,
        decision: Decision,
        action_payload: Optional[Dict[str, Any]] = None,
        execution_outcome: Optional[str] = None,
    ) -> str:
        """Persist a decision receipt."""
        evidence_str = json.dumps(decision.evidence or {})
        tool = "unknown"
        op = "unknown"
        resource = ""
        if action_payload:
            tool = action_payload.get("tool", "unknown")
            op = action_payload.get("operation", "unknown")
            resource = action_payload.get("resource", "")

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO receipts (
                    receipt_id, action_id, timestamp, policy_digest,
                    tool, operation, resource, decision, explanation_code,
                    reason, matched_rule_id, execution_outcome,
                    receipt_hash, previous_receipt_hash, evidence_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                decision.receipt_id,
                decision.action_id,
                decision.timestamp,
                decision.policy_digest,
                tool,
                op,
                resource,
                decision.decision.value,
                decision.explanation_code,
                decision.reason,
                decision.matched_rule_id,
                execution_outcome,
                decision.receipt_hash,
                decision.previous_receipt_hash,
                evidence_str,
            ))
            conn.commit()

        return decision.receipt_id

    def list_receipts(self, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """Fetch paginated receipts ordered newest first."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM receipts ORDER BY id DESC LIMIT ? OFFSET ?",
                (limit, offset),
            )
            rows = cursor.fetchall()
            return [dict(r) for r in rows]

    def get_receipt(self, receipt_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM receipts WHERE receipt_id = ?", (receipt_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def get_summary_stats(self) -> Dict[str, Any]:
        """Aggregate decision counts from persisted receipts."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT decision, COUNT(*) as count FROM receipts GROUP BY decision")
            rows = cursor.fetchall()
            stats = {"ALLOW": 0, "DENY": 0, "REQUIRE_APPROVAL": 0, "ERROR": 0, "TOTAL": 0}
            for r in rows:
                dec = r["decision"]
                c = r["count"]
                stats[dec] = c
                stats["TOTAL"] += c
            return stats

    def record_approval_request(self, approval: ApprovalRequest):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO approvals (
                    approval_id, action_id, rule_id, reason, status,
                    created_at, resolved_at, resolved_by, notes, action_payload_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                approval.approval_id,
                approval.action_id,
                approval.rule_id,
                approval.reason,
                approval.status.value,
                approval.created_at,
                approval.resolved_at,
                approval.resolved_by,
                approval.notes,
                json.dumps(approval.action_payload),
            ))
            conn.commit()

    def list_approvals(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if status:
                cursor.execute("SELECT * FROM approvals WHERE status = ? ORDER BY created_at DESC", (status,))
            else:
                cursor.execute("SELECT * FROM approvals ORDER BY created_at DESC")
            rows = cursor.fetchall()
            return [dict(r) for r in rows]

    def update_approval_status(
        self,
        approval_id: str,
        status: ApprovalStatus,
        resolved_by: str = "human-operator",
        notes: str = "",
    ) -> bool:
        from datetime import datetime, timezone
        now_str = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE approvals
                SET status = ?, resolved_at = ?, resolved_by = ?, notes = ?
                WHERE approval_id = ?
            """, (status.value, now_str, resolved_by, notes, approval_id))
            conn.commit()
            return cursor.rowcount > 0

    def verify_integrity(self) -> Dict[str, Any]:
        """Verify the SHA-256 hash chain of all persisted receipts."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM receipts ORDER BY id ASC")
            rows = cursor.fetchall()

        if not rows:
            return {"valid": True, "count": 0, "message": "No receipts recorded yet (empty chain)."}

        receipt_dicts = []
        for r in rows:
            evidence = json.loads(r["evidence_json"]) if r["evidence_json"] else {}
            receipt_dict = {
                "schema_version": "1.0",
                "receipt_id": r["receipt_id"],
                "action_id": r["action_id"],
                "timestamp": r["timestamp"],
                "policy_digest": r["policy_digest"],
                "matched_rule_id": r["matched_rule_id"],
                "decision": r["decision"],
                "explanation_code": r["explanation_code"],
                "reason": r["reason"],
                "evidence": evidence,
                "receipt_hash": r["receipt_hash"],
            }
            receipt_dicts.append(receipt_dict)

        valid = verify_hash_chain(receipt_dicts)
        return {
            "valid": valid,
            "count": len(rows),
            "latest_hash": rows[-1]["receipt_hash"] if rows else None,
            "message": "All receipt hashes cryptographically verified from genesis." if valid else "Chain integrity violation detected!",
        }
