"""Tests for the SENTINEL Deterministic Policy Engine."""

import pytest
from sentinel import Action, DecisionOutcome, Policy, PolicyEngine, Rule, RuleCondition, Severity


def test_default_deny_in_strict_mode():
    """Verify that an action with no matching rules is denied in strict mode."""
    policy = Policy(
        policy_id="strict-test",
        name="Strict Test Policy",
        mode="strict",
        rules=[],
    )
    engine = PolicyEngine(policy)
    action = Action(
        tool="unregistered_tool",
        operation="teleport",
        resource="mars",
    )
    decision = engine.evaluate(action)
    assert decision.decision == DecisionOutcome.DENY
    assert decision.allowed is False
    assert decision.explanation_code == "DEFAULT_DENY_STRICT_MODE"


def test_default_allow_in_audit_mode():
    """Verify that an action with no matching rules is permitted with warning in audit mode."""
    policy = Policy(
        policy_id="audit-test",
        name="Audit Test Policy",
        mode="audit",
        rules=[],
    )
    engine = PolicyEngine(policy)
    action = Action(
        tool="any_tool",
        operation="run",
        resource="test",
    )
    decision = engine.evaluate(action)
    assert decision.decision == DecisionOutcome.ALLOW
    assert decision.allowed is True
    assert decision.explanation_code == "AUDIT_DEFAULT_PERMIT"


def test_priority_ordering_high_priority_deny_overrides_allow():
    """Verify that higher priority rule takes precedence over lower priority rule."""
    policy = Policy(
        policy_id="priority-test",
        name="Priority Test",
        mode="strict",
        rules=[
            Rule(
                id="low-allow",
                name="Allow Everything",
                description="Allow all files",
                decision=DecisionOutcome.ALLOW,
                priority=100,
                severity=Severity.INFO,
                conditions=RuleCondition(tool_match="filesystem"),
            ),
            Rule(
                id="high-deny",
                name="Deny Restricted Backups",
                description="Block backup access",
                decision=DecisionOutcome.DENY,
                priority=900,
                severity=Severity.CRITICAL,
                conditions=RuleCondition(
                    tool_match="filesystem",
                    path_must_not_match=["*.restricted_data"],
                ),
            ),
        ],
    )
    engine = PolicyEngine(policy)

    # Allowed resource
    decision_ok = engine.evaluate(Action(tool="filesystem", operation="read", resource="doc.txt"))
    assert decision_ok.decision == DecisionOutcome.ALLOW
    assert decision_ok.matched_rule_id == "low-allow"

    # Blocked resource matching high priority rule
    decision_denied = engine.evaluate(Action(tool="filesystem", operation="read", resource="archive.restricted_data"))
    assert decision_denied.decision == DecisionOutcome.DENY
    assert decision_denied.matched_rule_id == "high-deny"


def test_mandatory_rules_cannot_be_overridden():
    """Prove that a user policy rule attempting to ALLOW .env access is vetoed by mandatory safety."""
    policy = Policy(
        policy_id="bypass-attempt",
        name="Malicious Allow-All Policy",
        mode="strict",
        rules=[
            Rule(
                id="allow-everything",
                name="Allow All Files Without Restriction",
                description="Dangerous policy",
                decision=DecisionOutcome.ALLOW,
                priority=10000,  # Ridiculously high priority
                severity=Severity.INFO,
                conditions=RuleCondition(tool_match="filesystem"),
            )
        ],
    )
    engine = PolicyEngine(policy)
    action = Action(tool="filesystem", operation="read", resource=".env")
    decision = engine.evaluate(action)

    assert decision.decision == DecisionOutcome.DENY
    assert decision.allowed is False
    assert decision.matched_rule_id == "sys-mandatory-sensitive-files"
    assert decision.explanation_code == "ERR_SENSITIVE_FILE_ACCESS"


def test_unverified_agent_identity_flag():
    """Verify that caller-supplied agent identities are marked untrusted by default."""
    action = Action(
        agent_id="admin-agent",
        tool="shell",
        operation="execute",
        resource="ls",
    )
    assert action.agent_verified is False
