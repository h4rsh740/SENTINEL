"""SENTINEL: Open-Source AI Agent Firewall.

Every AI action must earn permission.
"""

from pathlib import Path
from typing import Any, Callable, Dict, Optional, Union
import yaml

from sentinel.adapter import (
    SafeToolGuard,
    SentinelApprovalRequiredException,
    SentinelBlockedException,
)
from sentinel.canonical import canonical_json, compute_receipt_hash, verify_hash_chain
from sentinel.engine import PolicyEngine
from sentinel.models import (
    Action,
    ApprovalRequest,
    ApprovalStatus,
    Decision,
    DecisionOutcome,
    Policy,
    Receipt,
    Rule,
    RuleCondition,
    Severity,
)
from sentinel.store import SentinelStore

__version__ = "0.1.0"


class Sentinel:
    """Primary developer interface for the SENTINEL firewall."""

    def __init__(
        self,
        engine: PolicyEngine,
        store: Optional[SentinelStore] = None,
        auto_record_receipts: bool = True,
    ):
        self.engine = engine
        self.store = store
        self.auto_record_receipts = auto_record_receipts

        # Audit callback to persist decisions and outcomes
        def audit_cb(decision: Decision, outcome: Optional[str] = None):
            if self.store and self.auto_record_receipts:
                self.store.record_decision(decision, execution_outcome=outcome)
                if decision.requires_approval and decision.approval_id:
                    appr = self.engine.get_pending_approval(decision.approval_id)
                    if appr:
                        self.store.record_approval_request(appr)

        self._audit_callback = audit_cb
        self._guard = SafeToolGuard(self.engine, audit_callback=audit_cb)

    @classmethod
    def from_file(
        cls,
        file_path: Union[str, Path],
        db_path: Optional[str] = "sentinel_audit.db",
        auto_record_receipts: bool = True,
    ) -> "Sentinel":
        """Load Sentinel firewall from a policy file (YAML/JSON)."""
        store = SentinelStore(db_path) if db_path else None
        latest_hash = store.get_latest_receipt_hash() if store else None
        engine = PolicyEngine.from_yaml_file(str(file_path), previous_receipt_hash=latest_hash)
        return cls(engine=engine, store=store, auto_record_receipts=auto_record_receipts)

    @classmethod
    def from_dict(
        cls,
        data: Dict[str, Any],
        db_path: Optional[str] = "sentinel_audit.db",
        auto_record_receipts: bool = True,
    ) -> "Sentinel":
        """Load Sentinel firewall from a dictionary representation of a policy."""
        store = SentinelStore(db_path) if db_path else None
        latest_hash = store.get_latest_receipt_hash() if store else None
        engine = PolicyEngine.from_dict(data, previous_receipt_hash=latest_hash)
        return cls(engine=engine, store=store, auto_record_receipts=auto_record_receipts)

    def evaluate(self, action: Action) -> Decision:
        """Evaluate an action against the deterministic policy engine and persist receipt."""
        decision = self.engine.evaluate(action)
        if self.store and self.auto_record_receipts:
            self.store.record_decision(
                decision,
                action_payload=action.model_dump(),
                execution_outcome="EVALUATED_ONLY" if decision.allowed else "BLOCKED",
            )
            if decision.requires_approval and decision.approval_id:
                appr = self.engine.get_pending_approval(decision.approval_id)
                if appr:
                    self.store.record_approval_request(appr)
        return decision

    def guard(
        self,
        tool_name: str,
        operation: str = "execute",
        resource_extractor: Optional[Callable[..., str]] = None,
    ) -> Callable:
        """Decorator to guard any Python callable.

        Guarantees that denied or pending-approval actions strictly NEVER call the tool.
        """
        return self._guard.guard(tool_name, operation, resource_extractor)

    def execute_guarded(
        self,
        action: Action,
        target_fn: Callable[..., Any],
        *args,
        **kwargs,
    ) -> Any:
        """Evaluate action and execute target_fn only if strictly allowed."""
        return self._guard.execute_guarded(action, target_fn, *args, **kwargs)

    def verify_audit_integrity(self) -> Dict[str, Any]:
        """Verify the cryptographic hash chain of all recorded receipts."""
        if not self.store:
            return {"valid": True, "count": 0, "message": "No store configured."}
        return self.store.verify_integrity()

    def get_stats(self) -> Dict[str, Any]:
        """Get count of allowed, denied, and approval decisions."""
        if not self.store:
            return {"ALLOW": 0, "DENY": 0, "REQUIRE_APPROVAL": 0, "ERROR": 0, "TOTAL": 0}
        return self.store.get_summary_stats()


__all__ = [
    "Sentinel",
    "Action",
    "Rule",
    "RuleCondition",
    "Policy",
    "Decision",
    "DecisionOutcome",
    "Severity",
    "ApprovalRequest",
    "ApprovalStatus",
    "Receipt",
    "SentinelStore",
    "PolicyEngine",
    "SafeToolGuard",
    "SentinelBlockedException",
    "SentinelApprovalRequiredException",
    "canonical_json",
    "compute_receipt_hash",
    "verify_hash_chain",
]
