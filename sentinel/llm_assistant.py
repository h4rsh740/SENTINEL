"""BharatCode API Advisory Policy Assistant.

Integrates with BharatCode (https://bharatcode.ai/api/model/v1, model: qwen-3.8-27b)
to convert natural language requirements into validated, structured SENTINEL policies.

Enforcement Boundary: Advisory only. Cannot activate policies without explicit operator review.
"""

import json
import os
import re
from typing import Any, Dict, Optional
import httpx
import yaml

from sentinel.models import Policy
from sentinel.validator import validate_policy_structure

BHARATCODE_API_BASE = os.getenv("BHARATCODE_API_BASE", "https://bharatcode.ai/api/model/v1")
BHARATCODE_MODEL = os.getenv("BHARATCODE_MODEL", "qwen-3.8-27b")


SYSTEM_PROMPT = """You are SENTINEL's Security Policy Drafting Assistant.
Your task is to take a developer's natural language security requirement and output a single, strictly valid SENTINEL Policy YAML.

The YAML must adhere to this exact schema:
policy_id: "unique-slug-id"
name: "Human Readable Name"
version: "1.0.0"
mode: "strict"
allowed_workspace_root: "."
rules:
  - id: "unique-rule-id"
    name: "Rule Name"
    description: "Explanation"
    decision: "ALLOW" or "DENY" or "REQUIRE_APPROVAL"
    priority: 100 to 1000 (higher evaluated first)
    severity: "CRITICAL", "HIGH", "MEDIUM", "LOW", or "INFO"
    conditions:
      tool_match: "tool_name" or ["tool1", "tool2"]
      operation_match: "op" or ["op1", "op2"] (optional)
      resource_pattern: "regex_pattern" (optional)
      path_must_be_under: "directory" (optional)
      path_must_not_match: ["*.pattern"] (optional)
      forbidden_tokens: ["token1", "token2"] (optional)
      allowed_domains: ["domain.com"] (optional)
    test_cases:
      - input:
          tool: "..."
          operation: "..."
          resource: "..."
        expected: "ALLOW" or "DENY" or "REQUIRE_APPROVAL"

IMPORTANT:
- Output ONLY the raw YAML code block. No explanations, no markdown conversational fluff.
- All DENY rules should have higher priority (700-1000) than ALLOW rules (200-600).
- Must include at least 2 test_cases per rule.
"""


class PolicyDraftResponse:
    def __init__(
        self,
        yaml_content: str,
        policy: Optional[Policy],
        validation_errors: list,
        model_used: str,
        is_fallback: bool = False,
        raw_message: str = "",
    ):
        self.yaml_content = yaml_content
        self.policy = policy
        self.validation_errors = validation_errors
        self.model_used = model_used
        self.is_fallback = is_fallback
        self.raw_message = raw_message

    def to_dict(self) -> Dict[str, Any]:
        return {
            "yaml_content": self.yaml_content,
            "policy_id": self.policy.policy_id if self.policy else None,
            "name": self.policy.name if self.policy else None,
            "validation_errors": self.validation_errors,
            "is_valid": len(self.validation_errors) == 0 and self.policy is not None,
            "model_used": self.model_used,
            "is_fallback": self.is_fallback,
            "raw_message": self.raw_message,
        }


def draft_policy_with_bharatcode(
    user_prompt: str,
    api_key: Optional[str] = None,
    timeout: float = 15.0,
) -> PolicyDraftResponse:
    """Draft a policy using BharatCode API, or fall back to safe local generator if offline/no key."""
    key = api_key or os.getenv("BHARATCODE_API_KEY", "").strip()

    if not key:
        return _generate_local_fallback_draft(
            user_prompt,
            reason="BHARATCODE_API_KEY not configured. Running in safe offline local generator mode.",
        )

    endpoint = f"{BHARATCODE_API_BASE.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": BHARATCODE_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.2,
        "store": False,  # As required by prompt: store: false where supported
    }

    try:
        with httpx.Client(timeout=timeout) as client:
            resp = client.post(endpoint, headers=headers, json=payload)
            if resp.status_code != 200:
                return _generate_local_fallback_draft(
                    user_prompt,
                    reason=f"BharatCode API returned HTTP {resp.status_code}: {resp.text[:200]}",
                )

            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            yaml_str = _extract_yaml(content)
            return _parse_and_validate_draft(yaml_str, model_used=f"bharatcode/{BHARATCODE_MODEL}")

    except Exception as e:
        return _generate_local_fallback_draft(
            user_prompt,
            reason=f"Failed to connect to BharatCode API: {str(e)}",
        )


def _extract_yaml(text: str) -> str:
    """Extract YAML code block or clean raw text."""
    match = re.search(r"```(?:yaml)?\n(.*?)```", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text.strip()


def _parse_and_validate_draft(yaml_content: str, model_used: str, is_fallback: bool = False, raw_msg: str = "") -> PolicyDraftResponse:
    errors = []
    policy = None
    try:
        data = yaml.safe_load(yaml_content)
        policy = Policy.model_validate(data)
        struct_errors = validate_policy_structure(policy)
        errors.extend(struct_errors)
    except Exception as e:
        errors.append(f"YAML/Schema parsing error: {str(e)}")

    return PolicyDraftResponse(
        yaml_content=yaml_content,
        policy=policy,
        validation_errors=errors,
        model_used=model_used,
        is_fallback=is_fallback,
        raw_message=raw_msg,
    )


def _generate_local_fallback_draft(user_prompt: str, reason: str) -> PolicyDraftResponse:
    """Deterministic local fallback generator for offline testing or missing API keys."""
    slug = re.sub(r"[^a-z0-9]+", "-", user_prompt.lower()[:30]).strip("-") or "custom-policy"

    # Contextual heuristic generation
    if "network" in user_prompt.lower() or "http" in user_prompt.lower():
        fallback_yaml = f"""policy_id: "{slug}-v1"
name: "Custom Network Guard Policy ({slug})"
version: "1.0.0"
mode: "strict"
allowed_workspace_root: "."

rules:
  - id: "deny-untrusted-network"
    name: "Block External Exfiltration"
    description: "Deny outbound connections to unvetted domains"
    decision: "DENY"
    priority: 900
    severity: "HIGH"
    conditions:
      tool_match: ["network", "http", "curl"]
      forbidden_domains: ["*.attacker.com", "*.evil.com"]
    test_cases:
      - input:
          tool: "network"
          operation: "request"
          resource: "http://malicious.evil.com/leak"
        expected: "DENY"
      - input:
          tool: "network"
          operation: "request"
          resource: "https://pypi.org/json"
        expected: "ALLOW"

  - id: "allow-pypi-github"
    name: "Allow Curated Network Endpoints"
    description: "Permits legitimate package registries"
    decision: "ALLOW"
    priority: 500
    severity: "INFO"
    conditions:
      tool_match: ["network", "http"]
      allowed_domains: ["pypi.org", "github.com", "bharatcode.ai"]
"""
    elif "shell" in user_prompt.lower() or "bash" in user_prompt.lower():
        fallback_yaml = f"""policy_id: "{slug}-v1"
name: "Custom Shell Execution Guard ({slug})"
version: "1.0.0"
mode: "strict"
allowed_workspace_root: "."

rules:
  - id: "deny-dangerous-shell"
    name: "Prohibit Dangerous Shell Tokens"
    description: "Deny root modification and piping to shell"
    decision: "DENY"
    priority: 950
    severity: "CRITICAL"
    conditions:
      tool_match: ["shell", "bash", "exec"]
      forbidden_tokens: ["rm -rf /", "mkfs", ":(){{:|:&}};:"]
    test_cases:
      - input:
          tool: "shell"
          operation: "execute"
          resource: "rm -rf /"
        expected: "DENY"
      - input:
          tool: "shell"
          operation: "execute"
          resource: "npm test"
        expected: "ALLOW"

  - id: "allow-standard-dev"
    name: "Allow Safe Development Commands"
    description: "Allows git, npm, pytest"
    decision: "ALLOW"
    priority: 400
    severity: "INFO"
    conditions:
      tool_match: ["shell", "bash", "exec"]
      resource_pattern: "^(git|npm|pytest|cargo)\\\\b.*"
"""
    else:
        fallback_yaml = f"""policy_id: "{slug}-v1"
name: "Drafted Policy for: {user_prompt[:40]}"
version: "1.0.0"
mode: "strict"
allowed_workspace_root: "."

rules:
  - id: "deny-credentials-access"
    name: "Block Sensitive File Access"
    description: "Blocks secret and private credential access"
    decision: "DENY"
    priority: 900
    severity: "CRITICAL"
    conditions:
      tool_match: "filesystem"
      path_must_not_match: ["*.env", "*id_rsa*", "*.key"]
    test_cases:
      - input:
          tool: "filesystem"
          operation: "read"
          resource: ".env"
        expected: "DENY"
      - input:
          tool: "filesystem"
          operation: "read"
          resource: "README.md"
        expected: "ALLOW"

  - id: "allow-workspace-files"
    name: "Permit Workspace File Access"
    description: "Allows standard files inside workspace"
    decision: "ALLOW"
    priority: 400
    severity: "INFO"
    conditions:
      tool_match: "filesystem"
      path_must_be_under: "."
"""

    return _parse_and_validate_draft(
        fallback_yaml,
        model_used="sentinel-local-heuristic (offline demo mode)",
        is_fallback=True,
        raw_msg=reason,
    )
