"""Deterministic Path, Command, and Policy Validation Logic.

Provides robust protection against path traversal, symlink breakout,
destructive shell constructs, and unsafe network destinations.
"""

import fnmatch
import os
from pathlib import Path
import re
from typing import List, Optional, Tuple
from urllib.parse import urlparse

from sentinel.models import Policy


# Mandatory sensitive file patterns (applied across all filesystem access)
MANDATORY_SENSITIVE_PATTERNS = [
    "*.env",
    "*.env.*",
    "*id_rsa*",
    "*id_ed25519*",
    "*.pem",
    "*.key",
    "*credentials.json",
    "*service-account*.json",
    "*/etc/shadow",
    "*/etc/passwd",
    "*/etc/sudoers",
    "*/proc/*",
    "*/sys/*",
    "*authorized_keys*",
    "*known_hosts*",
]

# Mandatory destructive shell command tokens
MANDATORY_DESTRUCTIVE_COMMANDS = [
    r"\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f*|-f[a-zA-Z]*r[a-zA-Z]*)\s+(/|/\*|~|\$HOME)",
    r"\bmkfs(\.[a-z0-9]+)?\b",
    r"\bdd\s+.*if=.*of=(/dev/|/boot|/etc)",
    r":\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:",  # Fork bomb
    r"\bchmod\s+(-R\s+)?777\s+(/|/\*)",
    r"(curl|wget)\s+.*\|\s*(ba|z)?sh",  # Unchecked pipe to shell
    r"\b(shutdown|reboot|init\s+0|poweroff)\b",
]

# Cloud metadata and forbidden local network destinations
MANDATORY_BLOCKED_HOSTS = [
    "169.254.169.254",  # AWS/GCP/Azure instance metadata
    "metadata.google.internal",
    "127.0.0.1",
    "localhost",
    "0.0.0.0",
    "::1",
]


class PolicyValidationError(Exception):
    """Raised when a policy fails schema or semantic validation."""
    pass


def validate_policy_structure(policy: Policy) -> List[str]:
    """Validate policy syntax, rule uniqueness, and condition sanity.

    Returns a list of validation warnings/errors.
    """
    errors = []
    seen_ids = set()

    if not policy.policy_id.strip():
        errors.append("Policy ID cannot be empty.")
    if not policy.name.strip():
        errors.append("Policy name cannot be empty.")

    for rule in policy.rules:
        if rule.id in seen_ids:
            errors.append(f"Duplicate rule ID found: '{rule.id}'")
        seen_ids.add(rule.id)

        # Validate regex condition if provided
        if rule.conditions.resource_pattern:
            try:
                re.compile(rule.conditions.resource_pattern)
            except re.error as e:
                errors.append(f"Rule '{rule.id}' has invalid regex: {e}")

        # Check for empty decision
        if not rule.decision:
            errors.append(f"Rule '{rule.id}' has no decision specified.")

    return errors


def is_path_safe_and_contained(
    target_path: str,
    allowed_root: Optional[str] = None,
    allow_symlinks: bool = False,
) -> Tuple[bool, str]:
    """Verify that target_path does not escape allowed_root via traversal or symlinks.

    Returns (is_safe, explanation).
    """
    try:
        # Check for obvious traversal tokens before resolving
        parts = target_path.replace("\\", "/").split("/")
        if ".." in parts:
            pass  # Needs deep path check

        raw_p = Path(target_path)
        # Resolve path to canonical absolute representation (resolving symlinks)
        resolved_p = raw_p.resolve()

        if allowed_root:
            allowed_root_p = Path(allowed_root).resolve()
            # Must be equal to or subpath of allowed_root
            try:
                resolved_p.relative_to(allowed_root_p)
            except ValueError:
                return (
                    False,
                    f"Path '{target_path}' (resolves to '{resolved_p}') is outside allowed workspace root '{allowed_root_p}'.",
                )

        # Check if symlink target points elsewhere if symlinks are restricted
        if not allow_symlinks and raw_p.is_symlink():
            link_target = Path(os.path.realpath(raw_p))
            if allowed_root:
                allowed_root_p = Path(allowed_root).resolve()
                try:
                    link_target.relative_to(allowed_root_p)
                except ValueError:
                    return (
                        False,
                        f"Symlink '{target_path}' points outside workspace to '{link_target}'.",
                    )

        return True, "Path is within allowed boundary."
    except Exception as e:
        return False, f"Path resolution failed safely: {str(e)}"


def matches_sensitive_file(path_str: str) -> Tuple[bool, Optional[str]]:
    """Check if path matches mandatory sensitive file patterns."""
    normalized = path_str.replace("\\", "/")
    filename = os.path.basename(normalized)

    for pattern in MANDATORY_SENSITIVE_PATTERNS:
        if fnmatch.fnmatch(filename, pattern) or fnmatch.fnmatch(normalized, pattern):
            return True, pattern

    return False, None


def matches_destructive_shell(cmd_str: str) -> Tuple[bool, Optional[str]]:
    """Check if shell command string matches destructive or dangerous command signatures."""
    for pattern in MANDATORY_DESTRUCTIVE_COMMANDS:
        if re.search(pattern, cmd_str, re.IGNORECASE):
            return True, pattern
    return False, None


def is_host_allowed(
    host_or_url: str,
    allowed_domains: Optional[List[str]] = None,
    forbidden_domains: Optional[List[str]] = None,
) -> Tuple[bool, str]:
    """Validate destination domain or URL against network policies and mandatory blocked hosts."""
    parsed = urlparse(host_or_url)
    hostname = parsed.hostname or host_or_url.split(":")[0].strip()

    # Mandatory blocked internal/metadata addresses
    if hostname in MANDATORY_BLOCKED_HOSTS:
        return False, f"Destination '{hostname}' is a forbidden internal or cloud-metadata address."

    # User forbidden domains
    if forbidden_domains:
        for f in forbidden_domains:
            if fnmatch.fnmatch(hostname, f) or hostname == f:
                return False, f"Destination '{hostname}' is explicitly forbidden by rule."

    # If allowed_domains is provided, hostname must match at least one
    if allowed_domains is not None:
        matched = any(
            fnmatch.fnmatch(hostname, a) or hostname == a
            for a in allowed_domains
        )
        if not matched:
            return False, f"Destination '{hostname}' is not in allowed network domains: {allowed_domains}"

    return True, "Network destination allowed."
