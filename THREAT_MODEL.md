# SENTINEL Threat Model & Security Specification

## 1. Executive Summary

SENTINEL is an action-level security firewall for autonomous and semi-autonomous AI agents. Its objective is to enforce deterministic, inspectable boundaries on agent tool executions.

This document describes trust boundaries, threat actors, attack vectors, defensive controls, and explicit operational limitations.

---

## 2. Trust Boundaries

```
[ UNTRUSTED ZONE ]
├── Autonomous Agent Prompt Output / Tool Calls
├── Tool Arguments (file paths, shell commands, URLs, payloads)
├── User-Provided Policy Files (YAML / JSON)
├── LLM-Generated Policy Drafts (BharatCode / Qwen / any LLM)
├── Untrusted Caller Headers (unverified Agent Identity)
└── External Network Responses & File Contents

                     ↓↓ Intercepted at Firewalled Boundary ↓↓
========================================================================
[ SENTINEL TRUSTED ENFORCEMENT ZONE ]
├── Pydantic Action Schema Validator
├── Realpath Normalizer & Traversal Preventer
├── Deterministic Rule Evaluation Engine (Strictly No eval/exec)
├── Mandatory Core Safety Rules (Non-overridable)
├── Safe Tool Guard Wrapper (In-process or API proxy)
├── Canonical Decision Receipt Generator (RFC-8785)
└── Tamper-Evident SHA-256 Hash Chain & SQLite Store
========================================================================
                     ↓↓ Only If ALLOW Evaluated ↓↓
[ EXECUTION ZONE ]
└── Authorized Underlying Tool (Filesystem, Shell, HTTP Client)
```

### Untrusted Inputs:
1. **Agent Tool Invocations**: Arguments may contain directory traversal sequences (`../../`), command delimiters (`;`, `&&`, `|`), dangerous flags (`--no-preserve-root`), or exfiltration endpoints.
2. **Caller Identity Claims**: An agent or API caller cannot be assumed to possess legitimate identity unless verified by signed mTLS or session tokens. Sentinel marks identity as unverified by default.
3. **Policy Files**: User-contributed policies might attempt to inject dangerous patterns, invalid wildcards, or malicious regexes (ReDoS).
4. **Model-Generated Policy Drafts**: Output from advisory models (e.g., BharatCode `qwen-3.8-27b`) must never be activated directly. They must undergo schema validation, unit test verification, and explicit human confirmation.

---

## 3. Threat Matrix & Defensive Controls

| Threat | Description | Defensive Countermeasure in SENTINEL |
| :--- | :--- | :--- |
| **Path Traversal Breakout** | Agent supplies `../../../../etc/passwd` or symlinks targeting sensitive host files. | Absolute realpath resolution (`Path.resolve()`), symlink resolution, and strict prefix containment check against allowed workspace root. |
| **Sensitive File Access** | Reading `.env`, `.git`, AWS credentials, SSH keys, or private certificates. | Mandatory system rules with strict regex/glob blacklists for sensitive filenames and directories across all tools. |
| **Destructive Command Execution** | Agent invokes `bash` with `rm -rf /`, `mkfs`, fork bomb, or pipe-to-shell. | Tokenized shell command parser, forbidding shell meta-characters without specific allowlisting; default block on destructive binaries. |
| **Network Data Exfiltration** | Agent calls `http_request` targeting unauthorized external IPs/domains. | Strict domain/IP allowlist; blocking of loopback (`127.0.0.1`, `localhost`) and link-local cloud metadata (`169.254.169.254`). |
| **Tool Execution Bypass** | Agent attempts to invoke tool without passing through the Sentinel Guard. | The SDK wrapper encapsulates the target callable; the underlying tool reference is private and cannot be invoked unless allowed. |
| **Agent Self-Approval** | Agent emits a synthetic "Human Approved" response to bypass an approval gate. | Approval tokens are cryptographically generated UUIDv4 tokens stored in backend SQLite and require an explicit HTTP or CLI human confirmation. |
| **Policy ReDoS / Code Injection** | Malicious regex or python code embedded in user policy files. | No `eval` or `exec` anywhere in the codebase. Strict Pydantic parsing with bounded regex evaluation timeouts. |
| **Tampering with Audit Logs** | An attacker or compromised agent attempts to rewrite historical decision logs. | Canonical JSON serialization (RFC-8785) with SHA-256 hash chaining (`previous_receipt_hash`). Any modification breaks the chain. |

---

## 4. What SENTINEL Protects vs. What It Does NOT Protect

### What SENTINEL Protects:
- **Action Gating**: Deterministically prevents authorized tools from running when an action violates policy.
- **Path Confinement**: Prevents tools from accessing files outside explicitly designated directories.
- **Resource Restriction**: Limits network endpoints, commands, and operations based on explicit rules.
- **Human-in-the-Loop Enforcment**: Blocks high-risk operations until verified human approval is registered.
- **Forensic Auditability**: Records tamper-evident decision receipts for all actions.

### What SENTINEL Does NOT Protect:
- **Prompt Injection Defense**: SENTINEL is an **action firewall**, not a natural-language semantic filter. If an agent is tricked into doing something that is *within its allowed policy*, SENTINEL will permit it.
- **Direct Code Bypass**: If a developer invokes raw tool functions without wrapping them in `firewall.guard(...)`, SENTINEL cannot intercept them.
- **Kernel-Level Sandboxing**: SENTINEL is an application-level guard. For untrusted bytecode execution, it should be paired with OS-level sandboxes (e.g. gVisor, Firecracker, Docker).

---

## 5. Distinction: Attack Lab Simulations vs. Real Exploits

The **SENTINEL Attack Lab** utilizes:
- Safe virtual mock tools (Virtual Filesystem, Mock Shell, Mock HTTP adapter).
- Benign synthetic payloads (e.g. reading a fake `.env` containing dummy keys).
- **Never** executes real destructive commands (`rm -rf`), steals real credentials, or targets external services.

---

## 6. Vulnerability Disclosure Policy

If you discover a security vulnerability in SENTINEL:
1. Do not open a public GitHub issue.
2. Email the maintainers at `security@sentinelfirewall.org` (or submit via GitHub Private Vulnerability Reporting).
3. Include detailed steps to reproduce, affected versions, and potential impact.
4. Maintainers will acknowledge receipt within 48 hours and coordinate a coordinated disclosure patch.
