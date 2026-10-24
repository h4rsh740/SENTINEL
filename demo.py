#!/usr/bin/env python3
"""SENTINEL Standalone Live Demonstration.

Demonstrates deterministic action gating, guaranteed non-execution on deny,
tamper-evident SHA-256 decision receipts, and human-in-the-loop approval gates.

Run via:
    python demo.py
"""

import sys
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from sentinel import (
    Sentinel,
    Action,
    SentinelBlockedException,
    SentinelApprovalRequiredException,
)

console = Console()


def main():
    console.print(Panel.fit(
        "[bold cyan]SENTINEL — Open-Source AI Agent Firewall[/bold cyan]\n"
        "[italic]Every AI action must earn permission.[/italic]\n"
        "[dim]Deterministic Core • Zero-LLM Enforcement • SHA-256 Receipt Chain[/dim]",
        border_style="cyan",
    ))

    # 1. Initialize firewall from default policy
    policy_file = "policies/default-firewall.yaml"
    console.print(f"\n[bold white]1. Initializing SENTINEL from policy:[/bold white] [cyan]{policy_file}[/cyan]")
    firewall = Sentinel.from_file(policy_file, db_path="sentinel_audit.db", auto_record_receipts=True)
    console.print(f"   • Policy Digest: [dim]{firewall.engine.policy_digest}[/dim]")
    console.print(f"   • Active Mode: [green]{firewall.engine.policy.mode.upper()}[/green] (Default-Deny)")

    # 2. Guarded tool mock
    tool_executed = False

    def vulnerable_filesystem_tool(path: str) -> str:
        nonlocal tool_executed
        tool_executed = True
        return f"[DANGEROUS RAW DATA FROM {path}]"

    # 3. DEMO ACTION A: Denied Action (.env credential theft attempt)
    console.print("\n[bold white]2. Evaluating Malicious Agent Action (Secret Credential Exfiltration):[/bold white]")
    malicious_action = Action(
        tool="filesystem",
        operation="read",
        resource=".env",
        arguments={"path": ".env"},
    )
    console.print(f"   • Intercepted Target: [bold yellow]{malicious_action.resource}[/bold yellow]")

    tool_executed = False
    try:
        firewall.execute_guarded(malicious_action, vulnerable_filesystem_tool, ".env")
        console.print("   [red]ERROR: Action was allowed when it should have been blocked![/red]")
    except SentinelBlockedException as e:
        console.print("   [bold red]🚫 FIREWALL INTERCEPTION: ACTION DENIED[/bold red]")
        console.print(f"   • Reason: [red]{e.decision.reason}[/red]")
        console.print(f"   • Explanation Code: [dim]{e.decision.explanation_code}[/dim]")
        console.print(f"   • Receipt SHA-256 Hash: [dim]{e.decision.receipt_hash}[/dim]")
        console.print(f"   • Underlying Tool Executed?: [bold green]{'YES' if tool_executed else 'NO (STRICT NON-EXECUTION GUARANTEED)'}[/bold green]")

    # 4. DEMO ACTION B: Permitted Action (Legitimate workspace inspection)
    console.print("\n[bold white]3. Evaluating Benign Agent Action (Authorized Workspace Read):[/bold white]")
    safe_action = Action(
        tool="filesystem",
        operation="read",
        resource="workspace/README.md",
        arguments={"path": "workspace/README.md"},
    )
    console.print(f"   • Intercepted Target: [cyan]{safe_action.resource}[/cyan]")

    tool_executed = False
    try:
        result = firewall.execute_guarded(safe_action, vulnerable_filesystem_tool, "workspace/README.md")
        decision = firewall._guard.last_decision
        console.print("   [bold green]✔ FIREWALL EVALUATION: ACTION ALLOWED[/bold green]")
        console.print(f"   • Matched Rule: [cyan]{decision.matched_rule_id}[/cyan]")
        console.print(f"   • Tool Output: [white]{result}[/white]")
        console.print(f"   • Receipt SHA-256 Hash: [dim]{decision.receipt_hash}[/dim]")
    except Exception as e:
        console.print(f"   [red]Unexpected failure: {e}[/red]")

    # 5. DEMO ACTION C: Human-in-the-Loop Approval Required
    console.print("\n[bold white]4. Evaluating Sensitive Agent Action (Production Infrastructure Modification):[/bold white]")
    deploy_action = Action(
        tool="shell",
        operation="execute",
        resource="deploy-to-prod.sh --cluster us-east",
        arguments={"cmd": "deploy-to-prod.sh --cluster us-east"},
    )
    console.print(f"   • Intercepted Command: [yellow]{deploy_action.resource}[/yellow]")

    try:
        firewall.execute_guarded(deploy_action, vulnerable_filesystem_tool, deploy_action.resource)
    except SentinelApprovalRequiredException as e:
        console.print("   [bold yellow]⏸️  HUMAN APPROVAL REQUIRED: EXECUTION PAUSED[/bold yellow]")
        console.print(f"   • Approval ID: [cyan]{e.decision.approval_id}[/cyan]")
        console.print(f"   • Reason: [yellow]{e.decision.reason}[/yellow]")
        console.print("   • Execution Status: [bold green]SUSPENDED (Tool never reached without human signature)[/bold green]")

    # 6. Cryptographic Chain Verification
    console.print("\n[bold white]5. Cryptographic Tamper-Evident Receipt Chain Verification:[/bold white]")
    integrity = firewall.verify_audit_integrity()
    console.print(f"   • Chain Status: [bold green]{'VALID & UNBROKEN' if integrity['valid'] else 'TAMPERED!'}[/bold green]")
    console.print(f"   • Total Receipts Verified: [cyan]{integrity['count']}[/cyan]")
    console.print(f"   • Latest Chain Hash: [dim]{integrity.get('latest_hash')}[/dim]")

    console.print(Panel(
        "[bold green]SENTINEL demonstration completed successfully![/bold green]\n"
        "Start Web Console via: [bold white]cd console && npm run dev[/bold white]\n"
        "Start Backend API via: [bold white]python -m sentinel.api.main[/bold white]",
        border_style="green",
    ))


if __name__ == "__main__":
    main()
