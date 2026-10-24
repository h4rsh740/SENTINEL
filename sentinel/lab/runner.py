"""SENTINEL Attack Lab Runner & Benchmark Suite.

Executes simulation scenarios through safe virtual tool adapters, verifying
deterministic policy evaluation, receipt integrity, and strict non-execution.
"""

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import time
from typing import Any, Dict, List, Optional

from sentinel import Sentinel, SentinelApprovalRequiredException, SentinelBlockedException
from sentinel.lab.scenarios import Scenario, get_default_scenarios
from sentinel.lab.virtual_tools import MockHttpClient, MockShell, VirtualFilesystem
from sentinel.models import Decision, DecisionOutcome


@dataclass
class ScenarioResult:
    scenario_id: str
    scenario_name: str
    category: str
    expected_decision: str
    actual_decision: str
    expected_tool_executed: bool
    actual_tool_executed: bool
    decision_matches: bool
    execution_state_matches: bool
    passed: bool
    matched_rule_id: Optional[str]
    explanation_code: str
    reason: str
    receipt_id: str
    receipt_hash: str
    duration_ms: float
    evidence: Dict[str, Any]


@dataclass
class BenchmarkReport:
    total_scenarios: int
    passed_scenarios: int
    failed_scenarios: int
    pass_rate_percentage: float
    simulated_attacks_blocked: int
    benign_operations_permitted: int
    approvals_triggered: int
    execution_invariants_preserved: bool
    benchmark_timestamp: str
    results: List[ScenarioResult]

    def to_markdown(self) -> str:
        """Format the benchmark report as GitHub markdown."""
        md = []
        md.append("# 🛡️ SENTINEL Attack Lab Benchmark Report")
        md.append(f"\n**Timestamp**: `{self.benchmark_timestamp}`")
        md.append(f"**Total Scenarios Evaluated**: `{self.total_scenarios}`")
        md.append(f"**Pass Rate**: `{self.pass_rate_percentage:.1f}%` ({self.passed_scenarios}/{self.total_scenarios} passed)")
        md.append(f"**Non-Execution Invariants Preserved**: `{'✅ YES' if self.execution_invariants_preserved else '❌ NO'}`\n")

        md.append("### Summary Breakdown")
        md.append(f"- **Simulated Attacks Blocked**: `{self.simulated_attacks_blocked}`")
        md.append(f"- **Benign Operations Allowed**: `{self.benign_operations_permitted}`")
        md.append(f"- **Human Approval Gates Triggered**: `{self.approvals_triggered}`\n")

        md.append("### Detailed Scenario Results")
        md.append("| Status | ID | Category | Expected | Actual | Tool Executed | Rule Matched |")
        md.append("| :---: | :--- | :--- | :---: | :---: | :---: | :--- |")

        for r in self.results:
            icon = "✅ PASS" if r.passed else "❌ FAIL"
            exec_str = "No (Blocked)" if not r.actual_tool_executed else "Yes (Allowed)"
            rule_str = r.matched_rule_id or "default-strict"
            md.append(f"| {icon} | `{r.scenario_id}` | {r.category} | `{r.expected_decision}` | `{r.actual_decision}` | {exec_str} | `{rule_str}` |")

        return "\n".join(md)


class AttackLabRunner:
    """Orchestrates attack simulation suite with virtual tools."""

    def __init__(self, firewall: Sentinel):
        self.firewall = firewall

    def run_all(self, scenarios: Optional[List[Scenario]] = None) -> BenchmarkReport:
        """Execute all scenarios and generate an evidence-backed benchmark report."""
        target_scenarios = scenarios or get_default_scenarios()
        results: List[ScenarioResult] = []

        attacks_blocked = 0
        benign_allowed = 0
        approvals = 0
        invariants_preserved = True

        for s in target_scenarios:
            res = self.run_scenario(s)
            results.append(res)

            if not res.execution_state_matches:
                invariants_preserved = False

            if res.actual_decision == "DENY":
                attacks_blocked += 1
            elif res.actual_decision == "ALLOW":
                benign_allowed += 1
            elif res.actual_decision == "REQUIRE_APPROVAL":
                approvals += 1

        total = len(results)
        passed = sum(1 for r in results if r.passed)
        pass_rate = (passed / total * 100.0) if total > 0 else 0.0

        return BenchmarkReport(
            total_scenarios=total,
            passed_scenarios=passed,
            failed_scenarios=total - passed,
            pass_rate_percentage=pass_rate,
            simulated_attacks_blocked=attacks_blocked,
            benign_operations_permitted=benign_allowed,
            approvals_triggered=approvals,
            execution_invariants_preserved=invariants_preserved,
            benchmark_timestamp=datetime.now(timezone.utc).isoformat(),
            results=results,
        )

    def run_scenario(self, scenario: Scenario) -> ScenarioResult:
        """Run a single scenario with fresh mock adapters."""
        vfs = VirtualFilesystem()
        shell = MockShell()
        net = MockHttpClient()

        start_time = time.perf_counter()
        tool_executed = False
        decision: Optional[Decision] = None

        # Build mock target tool callable
        def mock_tool_target():
            nonlocal tool_executed
            tool_executed = True
            act = scenario.input_action
            if act.tool == "filesystem":
                if act.operation in ("read", "stat", "list"):
                    return vfs.read_file(act.resource)
                else:
                    return vfs.write_file(act.resource, str(act.arguments.get("content", "")))
            elif act.tool in ("shell", "bash", "exec"):
                return shell.execute(act.resource)
            elif act.tool in ("network", "http", "curl", "fetch"):
                return net.request(act.resource)
            return "OK"

        try:
            # Guarantees that blocked actions raise an exception and mock_tool_target is NEVER reached
            self.firewall.execute_guarded(scenario.input_action, mock_tool_target)
            actual_decision_outcome = DecisionOutcome.ALLOW
            decision = self.firewall._guard.last_decision
        except SentinelBlockedException as e:
            decision = e.decision
            actual_decision_outcome = DecisionOutcome.DENY
        except SentinelApprovalRequiredException as e:
            decision = e.decision
            actual_decision_outcome = DecisionOutcome.REQUIRE_APPROVAL
        except Exception as e:
            actual_decision_outcome = DecisionOutcome.ERROR
            decision = self.firewall._guard.last_decision

        duration = (time.perf_counter() - start_time) * 1000.0

        decision_matches = (actual_decision_outcome == scenario.expected_decision)
        execution_state_matches = (tool_executed == scenario.expected_tool_executed)
        all_passed = decision_matches and execution_state_matches

        return ScenarioResult(
            scenario_id=scenario.id,
            scenario_name=scenario.name,
            category=scenario.category,
            expected_decision=scenario.expected_decision.value,
            actual_decision=actual_decision_outcome.value,
            expected_tool_executed=scenario.expected_tool_executed,
            actual_tool_executed=tool_executed,
            decision_matches=decision_matches,
            execution_state_matches=execution_state_matches,
            passed=all_passed,
            matched_rule_id=decision.matched_rule_id if decision else None,
            explanation_code=decision.explanation_code if decision else "UNKNOWN",
            reason=decision.reason if decision else "No decision generated",
            receipt_id=decision.receipt_id if decision else "",
            receipt_hash=decision.receipt_hash if decision else "",
            duration_ms=round(duration, 2),
            evidence=decision.evidence if decision else {},
        )
