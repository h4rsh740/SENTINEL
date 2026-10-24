"""Safe Tool Execution Adapter & Guard Wrapper.

Guarantees that unauthorized or pending-approval actions strictly NEVER
reach underlying tool implementations.
"""

from functools import wraps
import inspect
from typing import Any, Callable, Dict, Optional

from sentinel.engine import PolicyEngine
from sentinel.models import Action, Decision, DecisionOutcome


class SentinelBlockedException(Exception):
    """Raised when an agent tool call is blocked by SENTINEL."""

    def __init__(self, decision: Decision):
        self.decision = decision
        super().__init__(
            f"[SENTINEL BLOCKED] Action '{decision.action_id}' denied. Reason: {decision.reason} ({decision.explanation_code})"
        )


class SentinelApprovalRequiredException(Exception):
    """Raised when an action requires human approval before execution."""

    def __init__(self, decision: Decision):
        self.decision = decision
        super().__init__(
            f"[SENTINEL PAUSED] Action '{decision.action_id}' requires human approval. "
            f"Approval ID: {decision.approval_id}. Reason: {decision.reason}"
        )


class SafeToolGuard:
    """Wraps tools and enforces deterministic firewall evaluation prior to execution."""

    def __init__(self, engine: PolicyEngine, audit_callback: Optional[Callable[[Decision, Optional[str]], None]] = None):
        self.engine = engine
        self.audit_callback = audit_callback
        self.last_decision: Optional[Decision] = None

    def guard(
        self,
        tool_name: str,
        operation: str = "execute",
        resource_extractor: Optional[Callable[..., str]] = None,
    ) -> Callable:
        """Decorator to guard arbitrary Python callables."""

        def decorator(fn: Callable) -> Callable:
            sig = inspect.signature(fn)

            @wraps(fn)
            def wrapper(*args, **kwargs) -> Any:
                # Resolve resource argument
                if resource_extractor:
                    resource = resource_extractor(*args, **kwargs)
                else:
                    # Default: use first positional arg or kwarg named 'resource' or 'path' or 'cmd'
                    bound = sig.bind_partial(*args, **kwargs)
                    bound.apply_defaults()
                    res_candidate = (
                        bound.arguments.get("resource")
                        or bound.arguments.get("path")
                        or bound.arguments.get("cmd")
                        or bound.arguments.get("command")
                        or bound.arguments.get("url")
                    )
                    if res_candidate is not None:
                        resource = str(res_candidate)
                    elif args:
                        resource = str(args[0])
                    else:
                        resource = "unspecified-target"

                # Build action object
                action = Action(
                    tool=tool_name,
                    operation=operation,
                    resource=resource,
                    arguments={"args": [str(a) for a in args], "kwargs": {k: str(v) for k, v in kwargs.items()}},
                )

                # Evaluate deterministic policy
                decision = self.engine.evaluate(action)
                self.last_decision = decision

                if decision.decision == DecisionOutcome.DENY:
                    if self.audit_callback:
                        self.audit_callback(decision, "BLOCKED")
                    # STRICT NON-EXECUTION GUARANTEE: Tool function is never called
                    raise SentinelBlockedException(decision)

                elif decision.decision == DecisionOutcome.REQUIRE_APPROVAL:
                    if self.audit_callback:
                        self.audit_callback(decision, "PENDING_APPROVAL")
                    # STRICT NON-EXECUTION GUARANTEE: Tool function is never called
                    raise SentinelApprovalRequiredException(decision)

                elif decision.decision == DecisionOutcome.ALLOW:
                    # Execute tool safely
                    try:
                        result = fn(*args, **kwargs)
                        if self.audit_callback:
                            self.audit_callback(decision, "SUCCESS")
                        return result
                    except Exception as e:
                        if self.audit_callback:
                            self.audit_callback(decision, f"EXECUTION_ERROR: {str(e)}")
                        raise

                else:
                    # Default-fail closed for any unexpected outcome
                    if self.audit_callback:
                        self.audit_callback(decision, "BLOCKED_BY_DEFAULT_FAIL_SAFE")
                    raise SentinelBlockedException(decision)

            return wrapper

        return decorator

    def execute_guarded(
        self,
        action: Action,
        target_fn: Callable[..., Any],
        *args,
        **kwargs,
    ) -> Any:
        """Explicit evaluation and execution gate."""
        decision = self.engine.evaluate(action)
        self.last_decision = decision

        if decision.decision == DecisionOutcome.DENY:
            if self.audit_callback:
                self.audit_callback(decision, "BLOCKED")
            raise SentinelBlockedException(decision)

        if decision.decision == DecisionOutcome.REQUIRE_APPROVAL:
            if self.audit_callback:
                self.audit_callback(decision, "PENDING_APPROVAL")
            raise SentinelApprovalRequiredException(decision)

        if decision.decision == DecisionOutcome.ALLOW:
            try:
                res = target_fn(*args, **kwargs)
                if self.audit_callback:
                    self.audit_callback(decision, "SUCCESS")
                return res
            except Exception as e:
                if self.audit_callback:
                    self.audit_callback(decision, f"EXECUTION_ERROR: {str(e)}")
                raise

        raise SentinelBlockedException(decision)
