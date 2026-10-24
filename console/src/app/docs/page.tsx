"use client";

import React, { useState } from "react";
import {
  BookOpen,
  Code,
  Terminal,
  Shield,
  Copy,
  Check,
  ExternalLink,
  Lock,
  Layers,
  FileCheck,
} from "lucide-react";

export default function DocsPage() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const codeSnippets = [
    {
      title: "1. Install SDK via pip",
      lang: "bash",
      code: "pip install sentinel-firewall",
    },
    {
      title: "2. Guard your agent tool functions",
      lang: "python",
      code: `from sentinel import Sentinel, Action

# Load firewall with active policy
firewall = Sentinel.from_file("policies/default-firewall.yaml")

# Wrap tools with @firewall.guard
@firewall.guard(tool_name="filesystem", operation="read")
def read_agent_file(path: str) -> str:
    with open(path, "r") as f:
        return f.read()

# Safe invocation: denied actions strictly NEVER execute the function!
try:
    content = read_agent_file("workspace/README.md")
    print(content)
except Exception as e:
    print(f"Firewall intercepted action: {e}")
`,
    },
    {
      title: "3. Direct programmatic action evaluation",
      lang: "python",
      code: `action = Action(
    tool="filesystem",
    operation="read",
    resource=".env",  # Secret file attempt
)

decision = firewall.evaluate(action)
print(decision.allowed)       # False
print(decision.decision)      # DecisionOutcome.DENY
print(decision.reason)        # Matched rule: deny-sensitive-env
print(decision.receipt_hash)  # Cryptographic SHA-256 receipt
`,
    },
    {
      title: "4. Common CLI workflows",
      lang: "bash",
      code: `# Initialize sentinel in your project
sentinel init

# Validate policy syntax and collision rules
sentinel policy validate policies/default-firewall.yaml

# Run embedded policy unit tests
sentinel policy test policies/default-firewall.yaml

# Run safe Attack Lab simulations
sentinel simulate

# Inspect decision receipt by ID
sentinel explain <RECEIPT_ID>

# Generate security audit report
sentinel report --format markdown
`,
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Header */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800">
        <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-xs tracking-wider uppercase mb-1">
          <BookOpen className="h-4 w-4" />
          <span>Integration & Developer Guide</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          SENTINEL Documentation
        </h1>
        <p className="text-slate-400 text-sm mt-1 max-w-2xl">
          Everything you need to integrate the SENTINEL firewall into autonomous agents, write
          deterministic security policies, and contribute to the open-source repository.
        </p>
      </div>

      {/* Code Snippets Section */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <Code className="h-5 w-5 text-cyan-400" />
          <span>Quickstart Integration</span>
        </h2>

        {codeSnippets.map((snippet, idx) => (
          <div key={idx} className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">{snippet.title}</span>
              <button
                onClick={() => copyToClipboard(snippet.code, idx)}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center space-x-1 transition-all"
              >
                {copiedIndex === idx ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 text-slate-400" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-black/70 border border-slate-800/80 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed">
              {snippet.code}
            </pre>
          </div>
        ))}
      </div>

      {/* Policy Authoring Guide */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <Layers className="h-5 w-5 text-cyan-400" />
          <span>How to Author a Security Policy</span>
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          SENTINEL policies are written in clean, declarative YAML. A policy defines an identifier,
          mode (<code className="text-cyan-400 font-mono">strict</code> or{" "}
          <code className="text-cyan-400 font-mono">audit</code>), an optional workspace boundary,
          and a list of rules evaluated in descending priority order.
        </p>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto">
          {`policy_id: "custom-agent-guard"
name: "Custom Agent Policy"
version: "1.0.0"
mode: "strict"            # Strict defaults to DENY if no allow rule matches
allowed_workspace_root: "."

rules:
  - id: "deny-secret-files"
    name: "Block Sensitive File Access"
    description: "Deny access to keys and credentials"
    decision: "DENY"      # Outcomes: ALLOW | DENY | REQUIRE_APPROVAL
    priority: 900         # Higher integer evaluates first
    severity: "CRITICAL"  # CRITICAL | HIGH | MEDIUM | LOW | INFO
    conditions:
      tool_match: "filesystem"
      path_must_not_match: ["*.env*", "*id_rsa*", "*.key"]
    test_cases:
      - input:
          tool: "filesystem"
          operation: "read"
          resource: ".env"
        expected: "DENY"`}
        </div>
      </div>

      {/* Community Contribution Guide */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <FileCheck className="h-5 w-5 text-cyan-400" />
          <span>Contributing Policy Packs & Attack Scenarios</span>
        </h2>
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            SENTINEL is built for community expansion. You can contribute in two primary ways:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <h4 className="font-bold text-white flex items-center space-x-1.5">
                <span className="text-cyan-400 font-mono">1.</span>
                <span>Add a Policy Pack</span>
              </h4>
              <p className="text-slate-400 text-[11px]">
                Create a YAML file under <code className="text-slate-200">policies/</code>. Every
                rule must include at least two embedded unit test cases validating its expected
                decisions.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <h4 className="font-bold text-white flex items-center space-x-1.5">
                <span className="text-cyan-400 font-mono">2.</span>
                <span>Contribute Attack Scenarios</span>
              </h4>
              <p className="text-slate-400 text-[11px]">
                Add simulation definitions in <code className="text-slate-200">scenarios.py</code>.
                Always use virtual tool adapters — never execute destructive commands or real
                exfiltration attempts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
