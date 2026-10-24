"""Critical Invariant Tests: Proving Denied Actions NEVER Reach Underlying Tools.

Section 6 Mandate: 'Write a test proving that a denied action never reaches the tool function.'
"""

import pytest
from sentinel import Sentinel, Action, SentinelBlockedException, SentinelApprovalRequiredException


def test_denied_filesystem_action_never_executes_tool():
    """Prove that an action attempting to read .env is blocked and the tool callable is NEVER invoked."""
    firewall = Sentinel.from_file("policies/default-firewall.yaml", db_path=None, auto_record_receipts=False)

    call_count = 0
    executed_args = []

    def dangerous_read_tool(path: str):
        nonlocal call_count, executed_args
        call_count += 1
        executed_args.append(path)
        return f"CONTENT_OF_{path}"

    action = Action(
        tool="filesystem",
        operation="read",
        resource=".env",
        arguments={"path": ".env"},
    )

    with pytest.raises(SentinelBlockedException) as excinfo:
        firewall.execute_guarded(action, dangerous_read_tool, ".env")

    # STRICT ASSERTIONS:
    assert call_count == 0, "Tool was executed despite DENY decision!"
    assert len(executed_args) == 0, "Arguments leaked to tool!"
    assert excinfo.value.decision.decision.value == "DENY"
    assert excinfo.value.decision.allowed is False


def test_denied_shell_action_never_executes_tool():
    """Prove that a destructive shell command is intercepted and the shell executor is never touched."""
    firewall = Sentinel.from_file("policies/default-firewall.yaml", db_path=None, auto_record_receipts=False)

    command_executed = False

    def raw_shell_tool(cmd: str):
        nonlocal command_executed
        command_executed = True
        return f"SIMULATED_STDOUT: {cmd}"

    action = Action(
        tool="shell",
        operation="execute",
        resource="rm -rf / --no-preserve-root",
        arguments={"cmd": "rm -rf /"},
    )

    with pytest.raises(SentinelBlockedException):
        firewall.execute_guarded(action, raw_shell_tool, "rm -rf /")

    assert command_executed is False, "Destructive shell command reached raw_shell_tool!"


def test_approval_required_action_never_executes_tool_without_resolution():
    """Prove that an action requiring human approval pauses and DOES NOT execute tool."""
    firewall = Sentinel.from_file("policies/default-firewall.yaml", db_path=None, auto_record_receipts=False)

    deployed = False

    def deploy_tool(target: str):
        nonlocal deployed
        deployed = True
        return f"DEPLOYED TO {target}"

    action = Action(
        tool="shell",
        operation="execute",
        resource="deploy-to-prod.sh",
        arguments={"cmd": "deploy-to-prod.sh"},
    )

    with pytest.raises(SentinelApprovalRequiredException) as excinfo:
        firewall.execute_guarded(action, deploy_tool, "production")

    assert deployed is False, "Sensitive tool executed before approval was granted!"
    assert excinfo.value.decision.requires_approval is True
    assert excinfo.value.decision.approval_id is not None


def test_allowed_action_executes_safely_and_returns_result():
    """Prove that an allowed action reaches the tool and passes through return value."""
    firewall = Sentinel.from_file("policies/default-firewall.yaml", db_path=None, auto_record_receipts=False)

    tool_called = False

    def safe_tool(path: str):
        nonlocal tool_called
        tool_called = True
        return f"FILE_OK: {path}"

    action = Action(
        tool="filesystem",
        operation="read",
        resource="workspace/README.md",
        arguments={"path": "workspace/README.md"},
    )

    result = firewall.execute_guarded(action, safe_tool, "workspace/README.md")

    assert tool_called is True
    assert result == "FILE_OK: workspace/README.md"


def test_guard_decorator_enforces_non_execution():
    """Prove that @firewall.guard decorator intercepts calls and blocks execution."""
    firewall = Sentinel.from_file("policies/default-firewall.yaml", db_path=None, auto_record_receipts=False)

    executed = False

    @firewall.guard(tool_name="filesystem", operation="read")
    def fetch_secret(resource: str):
        nonlocal executed
        executed = True
        return "SECRET_DATA"

    with pytest.raises(SentinelBlockedException):
        fetch_secret(resource=".env")

    assert executed is False, "@firewall.guard allowed prohibited function to execute!"
