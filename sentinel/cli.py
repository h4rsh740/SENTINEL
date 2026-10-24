"""SENTINEL Command Line Interface (CLI).

Developer-friendly commands for policy authoring, testing, attack simulations,
receipt inspection, and audit verification.
"""

import json
from pathlib import Path
import shutil
import sys
from typing import Optional
import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from sentinel import (
    Sentinel,
    __version__,
)
from sentinel.canonical import canonical_json
from sentinel.engine import PolicyEngine
from sentinel.lab import AttackLabRunner, get_default_scenarios
from sentinel.models import Action, DecisionOutcome, Policy
from sentinel.store import SentinelStore
from sentinel.validator import validate_policy_structure
import yaml

app = typer.Typer(
    name="sentinel",
    help="🛡️ SENTINEL: Deterministic Open-Source AI Agent Firewall CLI.",
    add_completion=False,
)
policy_app = typer.Typer(help="Manage and validate security policies.")
app.add_typer(policy_app, name="policy")

console = Console()


@app.command()
def init(
    target_dir: str = typer.Option(".", "--dir", "-d", help="Target directory for initialization"),
):
    """Initialize SENTINEL configuration and default policy in a project."""
    base = Path(target_dir).resolve()
    policies_dir = base / "policies"
    policies_dir.mkdir(parents=True, exist_ok=True)

    default_policy_file = policies_dir / "default-firewall.yaml"
    if not default_policy_file.exists():
        # Copy or create default policy
        source_policy = Path(__file__).resolve().parent.parent / "policies" / "default-firewall.yaml"
        if source_policy.exists():
            shutil.copy(source_policy, default_policy_file)
        else:
            default_content = """policy_id: "default-firewall-v1"
name: "SENTINEL Standard Developer & Agent Policy"
version: "1.0.0"
mode: "strict"
allowed_workspace_root: "."
rules:
  - id: "deny-sensitive-env"
    name: "Block Sensitive Environment & Credential Access"
    description: "Blocks attempts to read or write .env or keys"
    decision: "DENY"
    priority: 950
    severity: "CRITICAL"
    conditions:
      tool_match: "filesystem"
      path_must_not_match: ["*.env", "*id_rsa*"]
  - id: "allow-workspace-files"
    name: "Allow Workspace File Access"
    description: "Permits reading files inside workspace"
    decision: "ALLOW"
    priority: 400
    severity: "INFO"
    conditions:
      tool_match: "filesystem"
      path_must_be_under: "."
"""
            default_policy_file.write_text(default_content, encoding="utf-8")

    db_path = str(base / "sentinel_audit.db")
    store = SentinelStore(db_path)

    console.print(Panel.fit(
        f"[bold green]✔ SENTINEL successfully initialized![/bold green]\n\n"
        f"• Active Policy: [cyan]{default_policy_file}[/cyan]\n"
        f"• Audit Database: [cyan]{db_path}[/cyan]\n"
        f"• Genesis Receipt Hash: [dim]{store.get_latest_receipt_hash()}[/dim]\n\n"
        f"Run [bold white]sentinel simulate[/bold white] to test against the Attack Lab.",
        title="SENTINEL Initialized",
        border_style="green",
    ))


@policy_app.command("validate")
def policy_validate(
    policy_path: str = typer.Argument("policies/default-firewall.yaml", help="Path to policy YAML file"),
):
    """Validate policy syntax, rule uniqueness, and condition sanity."""
    path = Path(policy_path).resolve()
    if not path.exists():
        console.print(f"[bold red]Error:[/bold red] Policy file '{policy_path}' not found.")
        sys.exit(1)

    try:
        with open(path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        policy = Policy.model_validate(data)
        errors = validate_policy_structure(policy)
    except Exception as e:
        console.print(f"[bold red]Validation Failed:[/bold red] {e}")
        sys.exit(1)

    if errors:
        console.print("[bold red]Policy has validation errors:[/bold red]")
        for err in errors:
            console.print(f"  ❌ {err}")
        sys.exit(1)

    table = Table(title=f"Policy Validated: {policy.name} ({policy.policy_id})")
    table.add_column("Priority", justify="right", style="cyan")
    table.add_column("Rule ID", style="bold white")
    table.add_column("Decision", justify="center")
    table.add_column("Severity")
    table.add_column("Description")

    for r in sorted(policy.rules, key=lambda x: x.priority, reverse=True):
        dec_color = "green" if r.decision == DecisionOutcome.ALLOW else ("yellow" if r.decision == DecisionOutcome.REQUIRE_APPROVAL else "red")
        table.add_row(
            str(r.priority),
            r.id,
            f"[{dec_color}]{r.decision.value}[/{dec_color}]",
            r.severity.value,
            r.description,
        )

    console.print(table)
    console.print(f"\n[bold green]✔ Policy '{policy_path}' is syntactically and semantically valid.[/bold green]")


@policy_app.command("test")
def policy_test(
    policy_path: str = typer.Argument("policies/default-firewall.yaml", help="Path to policy YAML file"),
):
    """Run unit test cases embedded inside the policy rules."""
    path = Path(policy_path).resolve()
    if not path.exists():
        console.print(f"[bold red]Error:[/bold red] Policy file '{policy_path}' not found.")
        sys.exit(1)

    try:
        engine = PolicyEngine.from_yaml_file(str(path))
    except Exception as e:
        console.print(f"[bold red]Error loading policy:[/bold red] {e}")
        sys.exit(1)

    passed = 0
    total = 0
    failures = []

    for rule in engine.rules:
        if not rule.test_cases:
            continue
        for idx, tc in enumerate(rule.test_cases, 1):
            total += 1
            inp = tc.get("input", {})
            expected = tc.get("expected", "ALLOW")
            action = Action(
                tool=inp.get("tool", "filesystem"),
                operation=inp.get("operation", "read"),
                resource=inp.get("resource", ""),
                arguments=inp.get("arguments", {}),
            )
            decision = engine.evaluate(action)
            if decision.decision.value == expected:
                passed += 1
                console.print(f"  [green]✔[/green] Rule [cyan]{rule.id}[/cyan] Test #{idx}: Expected {expected} -> Got {decision.decision.value}")
            else:
                failures.append((rule.id, idx, expected, decision.decision.value))
                console.print(f"  [red]❌[/red] Rule [cyan]{rule.id}[/cyan] Test #{idx}: Expected {expected} -> Got {decision.decision.value}")

    if total == 0:
        console.print("[yellow]No embedded test cases found in policy rules.[/yellow]")
        return

    console.print(f"\n[bold]Test Summary:[/bold] {passed}/{total} passed.")
    if failures:
        console.print(f"[bold red]Policy test suite failed ({len(failures)} failed).[/bold red]")
        sys.exit(1)
    else:
        console.print("[bold green]✔ All embedded policy unit tests passed successfully![/bold green]")


@app.command()
def simulate(
    policy_path: str = typer.Option("policies/default-firewall.yaml", "--policy", "-p", help="Policy to test"),
    export_json: Optional[str] = typer.Option(None, "--export-json", help="Export benchmark results to JSON file"),
):
    """Run safe Attack Lab simulation benchmark against current policy."""
    path = Path(policy_path).resolve()
    if not path.exists():
        console.print(f"[bold red]Error:[/bold red] Policy '{policy_path}' not found.")
        sys.exit(1)

    firewall = Sentinel.from_file(str(path), db_path=None, auto_record_receipts=False)
    runner = AttackLabRunner(firewall)
    scenarios = get_default_scenarios()

    console.print(f"[bold cyan]🚀 Running SENTINEL Attack Lab Benchmark ({len(scenarios)} scenarios)...[/bold cyan]\n")
    report = runner.run_all(scenarios)

    table = Table(title="SENTINEL Attack Lab Results")
    table.add_column("Status", justify="center")
    table.add_column("ID", style="bold white")
    table.add_column("Category")
    table.add_column("Expected", justify="center")
    table.add_column("Actual", justify="center")
    table.add_column("Tool Executed?", justify="center")
    table.add_column("Rule Matched", style="dim")

    for r in report.results:
        status_str = "[green]PASS[/green]" if r.passed else "[red]FAIL[/red]"
        exec_str = "[red]NO (BLOCKED)[/red]" if not r.actual_tool_executed else "[green]YES (ALLOWED)[/green]"
        table.add_row(
            status_str,
            r.scenario_id,
            r.category,
            r.expected_decision,
            r.actual_decision,
            exec_str,
            r.matched_rule_id or "default-strict",
        )

    console.print(table)
    console.print(Panel(
        f"• Pass Rate: [bold green]{report.pass_rate_percentage:.1f}%[/bold green] ({report.passed_scenarios}/{report.total_scenarios})\n"
        f"• Simulated Attacks Blocked: [bold red]{report.simulated_attacks_blocked}[/bold red]\n"
        f"• Benign Actions Permitted: [bold green]{report.benign_operations_permitted}[/bold green]\n"
        f"• Human Approvals Triggered: [bold yellow]{report.approvals_triggered}[/bold yellow]\n"
        f"• Strict Non-Execution Invariant: [bold cyan]{'VERIFIED PRESERVED' if report.execution_invariants_preserved else 'VIOLATED'}[/bold cyan]",
        title="Benchmark Summary",
        border_style="cyan",
    ))

    if export_json:
        out_p = Path(export_json)
        data = {
            "total": report.total_scenarios,
            "passed": report.passed_scenarios,
            "pass_rate": report.pass_rate_percentage,
            "timestamp": report.benchmark_timestamp,
            "results": [asdict(r) for r in report.results],
        }
        out_p.write_text(json.dumps(data, indent=2), encoding="utf-8")
        console.print(f"[green]✔ Exported benchmark report to {export_json}[/green]")

    if report.failed_scenarios > 0:
        sys.exit(1)


@app.command()
def explain(
    receipt_id: str = typer.Argument(..., help="Receipt ID to inspect"),
    db_path: str = typer.Option("sentinel_audit.db", "--db", help="Path to SQLite audit database"),
):
    """Retrieve and explain a specific decision receipt by its receipt ID."""
    store = SentinelStore(db_path)
    receipt = store.get_receipt(receipt_id)

    if not receipt:
        console.print(f"[bold red]Error:[/bold red] Receipt ID '{receipt_id}' not found in {db_path}.")
        sys.exit(1)

    dec = receipt["decision"]
    color = "green" if dec == "ALLOW" else ("yellow" if dec == "REQUIRE_APPROVAL" else "red")

    info = (
        f"[bold]Receipt ID:[/bold] {receipt['receipt_id']}\n"
        f"[bold]Timestamp:[/bold] {receipt['timestamp']}\n"
        f"[bold]Action ID:[/bold] {receipt['action_id']}\n"
        f"[bold]Tool & Operation:[/bold] [cyan]{receipt['tool']}[/cyan] :: [magenta]{receipt['operation']}[/magenta]\n"
        f"[bold]Resource Target:[/bold] {receipt['resource']}\n"
        f"[bold]Decision:[/bold] [{color}]{dec}[/{color}]\n"
        f"[bold]Explanation Code:[/bold] {receipt['explanation_code']}\n"
        f"[bold]Reason:[/bold] {receipt['reason']}\n"
        f"[bold]Matched Rule:[/bold] {receipt['matched_rule_id'] or 'None (Default Fallback)'}\n"
        f"[bold]Execution Outcome:[/bold] {receipt['execution_outcome'] or 'N/A'}\n"
        f"[bold]Tamper-Evident SHA-256 Hash:[/bold] [dim]{receipt['receipt_hash']}[/dim]\n"
        f"[bold]Previous Receipt Hash:[/bold] [dim]{receipt['previous_receipt_hash']}[/dim]"
    )

    console.print(Panel(info, title=f"Receipt Explanation: {receipt_id}", border_style=color))


@app.command()
def report(
    format_type: str = typer.Option("markdown", "--format", "-f", help="Output format: 'markdown' or 'json'"),
    db_path: str = typer.Option("sentinel_audit.db", "--db", help="Path to SQLite audit database"),
):
    """Generate comprehensive security audit report from recorded events."""
    store = SentinelStore(db_path)
    stats = store.get_summary_stats()
    receipts = store.list_receipts(limit=50)
    integrity = store.verify_integrity()

    if format_type.lower() == "json":
        data = {
            "summary_stats": stats,
            "integrity_verification": integrity,
            "recent_receipts": receipts,
        }
        console.print(json.dumps(data, indent=2))
        return

    # Markdown format
    md = []
    md.append("# 🛡️ SENTINEL Security Audit & Receipt Report\n")
    md.append("## Audit Summary Statistics")
    md.append(f"- **Total Action Evaluations**: `{stats['TOTAL']}`")
    md.append(f"- **Allowed Actions**: `{stats['ALLOW']}`")
    md.append(f"- **Blocked Actions (Denied)**: `{stats['DENY']}`")
    md.append(f"- **Human Approvals Required**: `{stats['REQUIRE_APPROVAL']}`\n")

    md.append("## Tamper-Evident Chain Integrity")
    status = "✅ Cryptographically Valid" if integrity["valid"] else "❌ Integrity Violation!"
    md.append(f"- **Status**: {status}")
    md.append(f"- **Receipt Count in Chain**: `{integrity['count']}`")
    md.append(f"- **Latest Chain Hash**: `{integrity.get('latest_hash', 'N/A')}`\n")

    md.append("## Recent Decision Receipts")
    md.append("| Receipt ID | Tool | Operation | Resource | Decision | Reason |")
    md.append("| :--- | :--- | :--- | :--- | :---: | :--- |")
    for r in receipts[:15]:
        md.append(f"| `{r['receipt_id']}` | `{r['tool']}` | `{r['operation']}` | `{r['resource'][:30]}` | **{r['decision']}** | {r['reason'][:40]} |")

    console.print("\n".join(md))


@app.command()
def version():
    """Display SENTINEL version and core engine information."""
    console.print(Panel.fit(
        f"[bold cyan]SENTINEL[/bold cyan] — AI Agent Firewall\n"
        f"Version: [bold green]{__version__}[/bold green]\n"
        f"Deterministic Engine: [bold white]Active (Zero-LLM)[/bold white]\n"
        f"Receipt Verification: [bold white]Canonical RFC-8785 + SHA-256[/bold white]\n"
        f"License: [bold white]Apache-2.0[/bold white]\n\n"
        f"Tagline: [italic]Every AI action must earn permission.[/italic]",
        border_style="cyan",
    ))


if __name__ == "__main__":
    app()
