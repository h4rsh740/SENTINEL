"""FastAPI REST API Routes for SENTINEL.

Endpoints powering the SENTINEL Web Console, agent integrations,
and automated security verification.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
import yaml

from sentinel import Sentinel, SentinelStore
from sentinel.engine import PolicyEngine
from sentinel.lab import AttackLabRunner, get_default_scenarios
from sentinel.llm_assistant import draft_policy_with_bharatcode
from sentinel.models import (
    Action,
    ApprovalRequest,
    ApprovalStatus,
    Decision,
    Policy,
)
from sentinel.validator import validate_policy_structure

router = APIRouter(prefix="/api/v1")

# Global singleton firewall instance & store
_store = SentinelStore("sentinel_audit.db")
_active_policy_path = "policies/default-firewall.yaml"
_firewall = Sentinel.from_file(_active_policy_path, db_path="sentinel_audit.db")


class PolicyValidateRequest(BaseModel):
    yaml_content: str


class PolicyAssistRequest(BaseModel):
    prompt: str
    api_key: Optional[str] = None


class PolicyActivateRequest(BaseModel):
    yaml_content: str
    policy_name: Optional[str] = None


class ApprovalActionRequest(BaseModel):
    approved: bool
    resolved_by: str = "human-operator"
    notes: Optional[str] = ""


@router.post("/evaluate", response_model=Decision)
def evaluate_action(action: Action):
    """Evaluate an agent action against the active firewall policy."""
    try:
        decision = _firewall.evaluate(action)
        return decision
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Policy evaluation failure: {str(e)}")


@router.get("/policies")
def list_policies():
    """List available policy packs and active policy content."""
    policies_dir = Path("policies")
    policy_files = []
    if policies_dir.exists():
        for f in policies_dir.glob("*.yaml"):
            try:
                data = yaml.safe_load(f.read_text(encoding="utf-8"))
                policy_files.append({
                    "filename": f.name,
                    "path": str(f),
                    "policy_id": data.get("policy_id", f.stem),
                    "name": data.get("name", f.stem),
                    "mode": data.get("mode", "strict"),
                    "rule_count": len(data.get("rules", [])),
                    "is_active": str(f) == _active_policy_path or f.name in _active_policy_path,
                })
            except Exception:
                continue

    active_content = ""
    if Path(_active_policy_path).exists():
        active_content = Path(_active_policy_path).read_text(encoding="utf-8")

    return {
        "active_policy_path": _active_policy_path,
        "active_policy_content": active_content,
        "available_policies": policy_files,
    }


@router.post("/policies/validate")
def validate_policy_endpoint(req: PolicyValidateRequest):
    """Validate a YAML policy string against schema and safety constraints."""
    try:
        data = yaml.safe_load(req.yaml_content)
        policy = Policy.model_validate(data)
        errors = validate_policy_structure(policy)
        return {
            "valid": len(errors) == 0,
            "policy_id": policy.policy_id,
            "name": policy.name,
            "mode": policy.mode,
            "rule_count": len(policy.rules),
            "errors": errors,
        }
    except Exception as e:
        return {
            "valid": False,
            "errors": [f"Parsing failed: {str(e)}"],
        }


@router.post("/policies/activate")
def activate_policy(req: PolicyActivateRequest):
    """Explicitly activate a validated policy."""
    global _firewall, _active_policy_path
    try:
        data = yaml.safe_load(req.yaml_content)
        policy = Policy.model_validate(data)
        errors = validate_policy_structure(policy)
        if errors:
            raise HTTPException(status_code=400, detail=f"Cannot activate invalid policy: {errors}")

        target_file = Path("policies") / f"{policy.policy_id}.yaml"
        target_file.parent.mkdir(parents=True, exist_ok=True)
        target_file.write_text(req.yaml_content, encoding="utf-8")

        _active_policy_path = str(target_file)
        latest_hash = _store.get_latest_receipt_hash()
        new_engine = PolicyEngine(policy, previous_receipt_hash=latest_hash)
        _firewall = Sentinel(engine=new_engine, store=_store, auto_record_receipts=True)

        return {
            "status": "activated",
            "policy_id": policy.policy_id,
            "path": _active_policy_path,
            "rules_count": len(policy.rules),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Policy activation failed: {str(e)}")


@router.post("/policies/assist")
def assist_policy_draft(req: PolicyAssistRequest):
    """Advisory feature: Generate a policy draft using BharatCode API."""
    draft = draft_policy_with_bharatcode(req.prompt, api_key=req.api_key)
    return draft.to_dict()


@router.get("/attack-lab/scenarios")
def list_scenarios():
    """List all available Attack Lab simulation scenarios."""
    scenarios = get_default_scenarios()
    return [
        {
            "id": s.id,
            "name": s.name,
            "category": s.category,
            "description": s.description,
            "tool": s.input_action.tool,
            "operation": s.input_action.operation,
            "resource": s.input_action.resource,
            "expected_decision": s.expected_decision.value,
            "severity": s.severity,
            "mitigation_rule_id": s.mitigation_rule_id,
        }
        for s in scenarios
    ]


@router.post("/attack-lab/run")
def run_attack_lab():
    """Execute safe Attack Lab benchmark against the active policy."""
    runner = AttackLabRunner(_firewall)
    report = runner.run_all()
    from dataclasses import asdict
    return asdict(report)


@router.get("/decisions")
def list_decisions(limit: int = Query(50, ge=1, le=500), offset: int = Query(0, ge=0)):
    """Fetch paginated audit receipts ordered newest first."""
    receipts = _store.list_receipts(limit=limit, offset=offset)
    return receipts


@router.get("/decisions/verify-chain")
def verify_audit_chain():
    """Verify cryptographic SHA-256 hash chain of all recorded receipts."""
    return _store.verify_integrity()


@router.get("/decisions/{receipt_id}")
def get_decision_detail(receipt_id: str):
    receipt = _store.get_receipt(receipt_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return receipt


@router.get("/approvals")
def list_approvals(status: Optional[str] = None):
    return _store.list_approvals(status=status)


@router.post("/approvals/{approval_id}/action")
def resolve_approval(approval_id: str, req: ApprovalActionRequest):
    """Human-in-the-loop: Approve or reject a pending approval."""
    status = ApprovalStatus.APPROVED if req.approved else ApprovalStatus.REJECTED
    updated = _store.update_approval_status(
        approval_id,
        status=status,
        resolved_by=req.resolved_by,
        notes=req.notes or "",
    )
    if not updated:
        raise HTTPException(status_code=404, detail=f"Approval request '{approval_id}' not found.")

    return {
        "approval_id": approval_id,
        "status": status.value,
        "resolved_by": req.resolved_by,
    }


@router.get("/stats")
def get_dashboard_stats():
    """Retrieve aggregate decision metrics for dashboard."""
    stats = _store.get_summary_stats()
    integrity = _store.verify_integrity()
    return {
        "stats": stats,
        "chain_integrity": integrity,
        "active_policy_path": _active_policy_path,
        "version": "0.1.0",
    }
