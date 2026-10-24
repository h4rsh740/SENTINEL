"""SENTINEL Deterministic Policy Engine.

Evaluates AI agent tool calls against inspectable security rules and
mandatory safety policies with zero dynamic evaluation or LLM reliance.
"""

from datetime import datetime, timezone
import hashlib
import os
from pathlib import Path
import re
from typing import Any, Dict, List, Optional
import uuid
import yaml

from sentinel.canonical import canonical_json, compute_receipt_hash
from sentinel.models import (
    Action,
    ApprovalRequest,
    ApprovalStatus,
    Decision,
    DecisionOutcome,
    Policy,
    Rule,
    Severity,
)
from sentinel.validator import (
    is_host_allowed,
    is_path_safe_and_contained,
    matches_destructive_shell,
    matches_sensitive_file,
    validate_policy_structure,
)


class PolicyEngine:
    """The core deterministic policy evaluator."""

    def __init__(self, policy: Policy, previous_receipt_hash: Optional[str] = None):
        self.policy = policy
        self.latest_receipt_hash = previous_receipt_hash or "GENESIS_SENTINEL_CHAIN_V1"
        self._policy_digest = self._compute_policy_digest(policy)
        self._pending_approvals: Dict[str, ApprovalRequest] = {}

        # Validate policy on initialization
        errors = validate_policy_structure(policy)
        if errors:
            raise ValueError(f"Invalid policy '{policy.policy_id}': {'; '.join(errors)}")

        # Sort rules descending by priority (highest priority evaluated first)
        self.rules: List[Rule] = sorted(
            policy.rules, key=lambda r: r.priority, reverse=True
        )

    @classmethod
    def from_yaml_file(cls, file_path: str, previous_receipt_hash: Optional[str] = None) -> "PolicyEngine":
        """Load policy engine from a YAML file."""
        path = Path(file_path).resolve()
        if not path.exists():
            raise FileNotFoundError(f"Policy file not found: {file_path}")
        with open(path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        policy = Policy.model_validate(data)
        return cls(policy, previous_receipt_hash=previous_receipt_hash)

    @classmethod
    def from_dict(cls, data: Dict[str, Any], previous_receipt_hash: Optional[str] = None) -> "PolicyEngine":
        """Load policy engine from a Python dictionary."""
        policy = Policy.model_validate(data)
        return cls(policy, previous_receipt_hash=previous_receipt_hash)

    def _compute_policy_digest(self, policy: Policy) -> str:
        """Compute SHA-256 fingerprint of the canonical policy definition."""
        canonical = canonical_json(policy.model_dump())
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:16]

    @property
    def policy_digest(self) -> str:
        return self._policy_digest

    def evaluate(self, action: Action) -> Decision:
        """Deterministically evaluate an Action against mandatory safety rules and the active policy."""
        now_str = datetime.now(timezone.utc).isoformat()
        receipt_id = f"rcpt_{uuid.uuid4().hex[:14]}"

        # Step 1: Mandatory Core Safety Restrictions (Non-overridable)
        mandatory_decision = self._check_mandatory_safety(action, receipt_id, now_str)
        if mandatory_decision:
            return self._finalize_decision(mandatory_decision)

        # Step 2: Global Workspace Containment Check (if workspace root configured)
        if action.tool == "filesystem" and self.policy.allowed_workspace_root:
            is_contained, msg = is_path_safe_and_contained(
                action.resource, self.policy.allowed_workspace_root
            )
            if not is_contained:
                decision = Decision(
                    action_id=action.action_id,
                    decision=DecisionOutcome.DENY,
                    allowed=False,
                    requires_approval=False,
                    reason=f"Path containment violation: {msg}",
                    matched_rule_id="sys-mandatory-workspace-containment",
                    explanation_code="ERR_WORKSPACE_CONTAINMENT",
                    severity=Severity.HIGH,
                    timestamp=now_str,
                    policy_digest=self.policy_digest,
                    receipt_id=receipt_id,
                    evidence={"resource": action.resource, "root": self.policy.allowed_workspace_root},
                )
                return self._finalize_decision(decision)

        # Step 3: Evaluate User Rules in Priority Order
        matched_allow_rule: Optional[Rule] = None

        for rule in self.rules:
            if self._rule_matches_action(rule, action):
                if rule.decision == DecisionOutcome.DENY:
                    decision = Decision(
                        action_id=action.action_id,
                        decision=DecisionOutcome.DENY,
                        allowed=False,
                        requires_approval=False,
                        reason=f"Matched deny rule: '{rule.name}' ({rule.description})",
                        matched_rule_id=rule.id,
                        explanation_code=f"RULE_DENIED_{rule.id.upper()}",
                        severity=rule.severity,
                        timestamp=now_str,
                        policy_digest=self.policy_digest,
                        receipt_id=receipt_id,
                        evidence={"rule_id": rule.id, "resource": action.resource},
                    )
                    return self._finalize_decision(decision)

                elif rule.decision == DecisionOutcome.REQUIRE_APPROVAL:
                    approval_id = f"appr_{uuid.uuid4().hex[:12]}"
                    approval = ApprovalRequest(
                        approval_id=approval_id,
                        action_id=action.action_id,
                        action_payload=action.model_dump(),
                        rule_id=rule.id,
                        reason=f"Action requires explicit human approval by rule: '{rule.name}'",
                    )
                    self._pending_approvals[approval_id] = approval

                    decision = Decision(
                        action_id=action.action_id,
                        decision=DecisionOutcome.REQUIRE_APPROVAL,
                        allowed=False,
                        requires_approval=True,
                        approval_id=approval_id,
                        reason=f"Action requires human approval: {rule.description}",
                        matched_rule_id=rule.id,
                        explanation_code="REQUIRE_HUMAN_APPROVAL",
                        severity=rule.severity,
                        timestamp=now_str,
                        policy_digest=self.policy_digest,
                        receipt_id=receipt_id,
                        evidence={"approval_id": approval_id, "rule_id": rule.id},
                    )
                    return self._finalize_decision(decision)

                elif rule.decision == DecisionOutcome.ALLOW:
                    if matched_allow_rule is None:
                        matched_allow_rule = rule

        # If an ALLOW rule matched and no higher-priority rule denied or requested approval
        if matched_allow_rule:
            decision = Decision(
                action_id=action.action_id,
                decision=DecisionOutcome.ALLOW,
                allowed=True,
                requires_approval=False,
                reason=f"Permitted by rule: '{matched_allow_rule.name}'",
                matched_rule_id=matched_allow_rule.id,
                explanation_code="ALLOWED_BY_RULE",
                severity=matched_allow_rule.severity,
                timestamp=now_str,
                policy_digest=self.policy_digest,
                receipt_id=receipt_id,
                evidence={"rule_id": matched_allow_rule.id, "tool": action.tool},
            )
            return self._finalize_decision(decision)

        # Step 4: Fallback / Default-Deny Semantics
        if self.policy.mode == "strict":
            decision = Decision(
                action_id=action.action_id,
                decision=DecisionOutcome.DENY,
                allowed=False,
                requires_approval=False,
                reason="Default-deny in strict mode: No explicit rule permitted this action.",
                matched_rule_id=None,
                explanation_code="DEFAULT_DENY_STRICT_MODE",
                severity=Severity.MEDIUM,
                timestamp=now_str,
                policy_digest=self.policy_digest,
                receipt_id=receipt_id,
                evidence={"mode": "strict", "tool": action.tool, "operation": action.operation},
            )
        else:
            # Audit mode: allow with warning
            decision = Decision(
                action_id=action.action_id,
                decision=DecisionOutcome.ALLOW,
                allowed=True,
                requires_approval=False,
                reason="Default-allow in audit mode (unrestricted tool call).",
                matched_rule_id=None,
                explanation_code="AUDIT_DEFAULT_PERMIT",
                severity=Severity.LOW,
                timestamp=now_str,
                policy_digest=self.policy_digest,
                receipt_id=receipt_id,
                evidence={"mode": "audit", "tool": action.tool},
            )

        return self._finalize_decision(decision)

    def _check_mandatory_safety(
        self, action: Action, receipt_id: str, timestamp: str
    ) -> Optional[Decision]:
        """Check mandatory invariants that can never be overridden by user policies."""
        # Check 1: Filesystem sensitive files (.env, id_rsa, /etc/shadow)
        if action.tool == "filesystem":
            is_sensitive, pattern = matches_sensitive_file(action.resource)
            if is_sensitive:
                return Decision(
                    action_id=action.action_id,
                    decision=DecisionOutcome.DENY,
                    allowed=False,
                    requires_approval=False,
                    reason=f"Mandatory safety rule: Resource matches sensitive file pattern '{pattern}'.",
                    matched_rule_id="sys-mandatory-sensitive-files",
                    explanation_code="ERR_SENSITIVE_FILE_ACCESS",
                    severity=Severity.CRITICAL,
                    timestamp=timestamp,
                    policy_digest=self.policy_digest,
                    receipt_id=receipt_id,
                    evidence={"pattern": pattern, "target": action.resource},
                )

        # Check 2: Destructive shell commands (rm -rf /, mkfs, fork bomb)
        if action.tool in ("shell", "bash", "terminal", "exec"):
            is_destructive, pattern = matches_destructive_shell(action.resource)
            if is_destructive:
                return Decision(
                    action_id=action.action_id,
                    decision=DecisionOutcome.DENY,
                    allowed=False,
                    requires_approval=False,
                    reason=f"Mandatory safety rule: Command matches destructive signature '{pattern}'.",
                    matched_rule_id="sys-mandatory-destructive-shell",
                    explanation_code="ERR_DESTRUCTIVE_COMMAND",
                    severity=Severity.CRITICAL,
                    timestamp=timestamp,
                    policy_digest=self.policy_digest,
                    receipt_id=receipt_id,
                    evidence={"pattern": pattern, "command": action.resource},
                )

        # Check 3: Network cloud metadata and loopback destinations
        if action.tool in ("network", "http", "curl", "fetch"):
            allowed, msg = is_host_allowed(action.resource)
            if not allowed:
                return Decision(
                    action_id=action.action_id,
                    decision=DecisionOutcome.DENY,
                    allowed=False,
                    requires_approval=False,
                    reason=f"Mandatory network security rule: {msg}",
                    matched_rule_id="sys-mandatory-network-boundary",
                    explanation_code="ERR_BLOCKED_NETWORK_DESTINATION",
                    severity=Severity.CRITICAL,
                    timestamp=timestamp,
                    policy_digest=self.policy_digest,
                    receipt_id=receipt_id,
                    evidence={"destination": action.resource},
                )

        return None

    def _rule_matches_action(self, rule: Rule, action: Action) -> bool:
        """Evaluate if an action matches all non-null conditions in a rule."""
        cond = rule.conditions

        # Tool match
        if cond.tool_match:
            tools = [cond.tool_match] if isinstance(cond.tool_match, str) else cond.tool_match
            if action.tool not in tools and "*" not in tools:
                return False

        # Operation match
        if cond.operation_match:
            ops = [cond.operation_match] if isinstance(cond.operation_match, str) else cond.operation_match
            if action.operation not in ops and "*" not in ops:
                return False

        # Resource pattern (regex)
        if cond.resource_pattern:
            if not re.search(cond.resource_pattern, action.resource):
                return False

        # Path must be under
        if cond.path_must_be_under and action.tool == "filesystem":
            is_contained, _ = is_path_safe_and_contained(
                action.resource, cond.path_must_be_under
            )
            if not is_contained:
                return False

        # Path pattern restrictions (globs)
        if cond.path_must_not_match and action.tool == "filesystem":
            matched_forbidden = False
            for pat in cond.path_must_not_match:
                if matches_sensitive_file(action.resource)[0]:
                    matched_forbidden = True
                    break
                normalized = action.resource.replace("\\", "/")
                filename = os.path.basename(normalized)
                import fnmatch
                if fnmatch.fnmatch(filename, pat) or fnmatch.fnmatch(normalized, pat):
                    matched_forbidden = True
                    break

            if rule.decision == DecisionOutcome.DENY:
                # A deny rule triggers only if a forbidden pattern is hit
                if not matched_forbidden:
                    return False
            else:
                # An allow rule is invalidated if a forbidden pattern is hit
                if matched_forbidden:
                    return False

        # Forbidden tokens in command or arguments
        if cond.forbidden_tokens:
            target_text = f"{action.resource} {str(action.arguments)}"
            has_forbidden = any(token.lower() in target_text.lower() for token in cond.forbidden_tokens)
            if rule.decision == DecisionOutcome.DENY:
                # Deny rule applies only if a forbidden token is present
                if not has_forbidden:
                    return False
            else:
                # Allow rule applies only if NO forbidden token is present
                if has_forbidden:
                    return False

        # Network destination matches
        if action.tool in ("network", "http", "curl", "fetch"):
            if cond.allowed_domains is not None or cond.forbidden_domains is not None:
                allowed, _ = is_host_allowed(
                    action.resource, cond.allowed_domains, cond.forbidden_domains
                )
                if rule.decision == DecisionOutcome.DENY:
                    if allowed:
                        return False
                elif rule.decision == DecisionOutcome.ALLOW:
                    if not allowed:
                        return False

        return True

    def _finalize_decision(self, decision: Decision) -> Decision:
        """Calculate tamper-evident hash chain and update latest hash."""
        receipt_dict = {
            "schema_version": "1.0",
            "receipt_id": decision.receipt_id,
            "action_id": decision.action_id,
            "timestamp": decision.timestamp,
            "policy_digest": decision.policy_digest,
            "matched_rule_id": decision.matched_rule_id,
            "decision": decision.decision.value,
            "explanation_code": decision.explanation_code,
            "reason": decision.reason,
            "evidence": decision.evidence,
        }
        h = compute_receipt_hash(receipt_dict, self.latest_receipt_hash)
        decision.previous_receipt_hash = self.latest_receipt_hash
        decision.receipt_hash = h
        self.latest_receipt_hash = h
        return decision

    def get_pending_approval(self, approval_id: str) -> Optional[ApprovalRequest]:
        return self._pending_approvals.get(approval_id)

    def resolve_approval(
        self, approval_id: str, approved: bool, resolved_by: str = "human-operator", notes: str = ""
    ) -> Optional[ApprovalRequest]:
        approval = self._pending_approvals.get(approval_id)
        if not approval:
            return None
        approval.status = ApprovalStatus.APPROVED if approved else ApprovalStatus.REJECTED
        approval.resolved_at = datetime.now(timezone.utc).isoformat()
        approval.resolved_by = resolved_by
        approval.notes = notes
        return approval
