---
name: Policy proposal
about: Propose a new security rule or policy pack for SENTINEL
title: '[POLICY] '
labels: policy, enhancement
assignees: ''
---

**Policy Overview**
- Target Agent Toolkit / Framework: [e.g. LangChain, CrewAI, AutoGen, Custom]
- Policy Mode: [strict / audit]
- Intended Boundary: [e.g. Docker container access, GitHub API scopes, Database queries]

**Proposed Rule Definition (YAML)**
```yaml
rules:
  - id: "my-custom-rule"
    name: "Rule Name"
    description: "Detailed description"
    decision: "DENY" # ALLOW | DENY | REQUIRE_APPROVAL
    priority: 800
    severity: "HIGH"
    conditions:
      tool_match: "..."
    test_cases:
      - input:
          tool: "..."
          operation: "..."
          resource: "..."
        expected: "DENY"
```

**Security Rationale**
Why is this policy needed? What vulnerability or risk does it mitigate?
