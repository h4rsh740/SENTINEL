"""Typed Data Models for SENTINEL Core & SDK.

Strict Pydantic models for actions, rules, policies, decisions, and receipts.
"""

from datetime import datetime, timezone
from enum import Enum
import uuid
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field, field_validator


class DecisionOutcome(str, Enum):
    """Supported deterministic decision outcomes."""
    ALLOW = "ALLOW"
    DENY = "DENY"
    REQUIRE_APPROVAL = "REQUIRE_APPROVAL"
    ERROR = "ERROR"


class Severity(str, Enum):
    """Rule and event severity classifications."""
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


class ApprovalStatus(str, Enum):
    """Status for Human-in-the-Loop approval requests."""
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"


class Action(BaseModel):
    """Action requested by an autonomous agent."""
    action_id: str = Field(default_factory=lambda: f"act_{uuid.uuid4().hex[:12]}")
    session_id: Optional[str] = None
    agent_id: Optional[str] = "unnamed-agent"
    agent_verified: bool = False  # Caller-supplied identity is untrusted by default
    tool: str  # e.g., 'filesystem', 'shell', 'network', 'github'
    operation: str  # e.g., 'read', 'write', 'execute', 'delete', 'request'
    resource: str  # target path, command, host, or resource identifier
    arguments: Dict[str, Any] = Field(default_factory=dict)
    requested_capabilities: List[str] = Field(default_factory=list)
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    context: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("tool", "operation")
    @classmethod
    def normalize_identifiers(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if not cleaned:
            raise ValueError("Tool and operation identifiers cannot be empty")
        return cleaned


class RuleCondition(BaseModel):
    """Deterministic conditions evaluated against an Action."""
    tool_match: Optional[Union[str, List[str]]] = None
    operation_match: Optional[Union[str, List[str]]] = None
    resource_pattern: Optional[str] = None  # Regex pattern for resource string
    path_must_be_under: Optional[str] = None  # Path confinement (workspace prefix)
    path_must_not_match: Optional[List[str]] = None  # Glob-like patterns (e.g., *.env, *.key)
    forbidden_tokens: Optional[List[str]] = None  # Destructive tokens in command/arguments
    allowed_domains: Optional[List[str]] = None  # Allowed outbound network domains
    forbidden_domains: Optional[List[str]] = None  # Explicitly blocked hosts (metadata/internal)
    custom_arg_matches: Optional[Dict[str, Any]] = None


class Rule(BaseModel):
    """Deterministic security rule inside a Policy."""
    id: str
    name: str
    description: str
    decision: DecisionOutcome
    priority: int = 100  # Higher value = evaluated earlier
    severity: Severity = Severity.MEDIUM
    conditions: RuleCondition
    version: str = "1.0"
    test_cases: List[Dict[str, Any]] = Field(default_factory=list)


class Policy(BaseModel):
    """A collection of security rules forming an inspectable policy pack."""
    policy_id: str
    name: str
    version: str = "1.0.0"
    mode: str = "strict"  # 'strict' (default-deny) or 'audit' (log-only)
    allowed_workspace_root: Optional[str] = None
    rules: List[Rule] = Field(default_factory=list)


class Decision(BaseModel):
    """Structured decision output produced by SENTINEL Core."""
    action_id: str
    decision: DecisionOutcome
    allowed: bool
    requires_approval: bool
    approval_id: Optional[str] = None
    reason: str
    matched_rule_id: Optional[str] = None
    explanation_code: str
    severity: Optional[Severity] = None
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    policy_digest: str
    receipt_id: str = Field(default_factory=lambda: f"rcpt_{uuid.uuid4().hex[:14]}")
    receipt_hash: str = ""
    previous_receipt_hash: Optional[str] = None
    evidence: Dict[str, Any] = Field(default_factory=dict)


class Receipt(BaseModel):
    """Tamper-evident audit receipt."""
    schema_version: str = "1.0"
    receipt_id: str
    action_id: str
    timestamp: str
    policy_digest: str
    matched_rule_ids: List[str]
    decision: DecisionOutcome
    explanation_code: str
    tool: str
    operation: str
    resource: str
    execution_outcome: Optional[str] = None
    receipt_hash: str
    previous_receipt_hash: Optional[str] = None


class ApprovalRequest(BaseModel):
    """Pending Human-in-the-Loop approval gate."""
    approval_id: str = Field(default_factory=lambda: f"appr_{uuid.uuid4().hex[:12]}")
    action_id: str
    action_payload: Dict[str, Any]
    rule_id: str
    reason: str
    status: ApprovalStatus = ApprovalStatus.PENDING
    created_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    resolved_at: Optional[str] = None
    resolved_by: Optional[str] = None
    notes: Optional[str] = None
