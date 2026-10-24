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
  Sparkles,
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
      title: "1. Install Python SDK via pip",
      lang: "bash",
      code: "pip install sentinel-firewall",
    },
    {
      title: "2. Guard your agent tool functions with @firewall.guard",
      lang: "python",
      code: `from sentinel import Sentinel, Action

# 1. Load active policy
firewall = Sentinel.from_file("policies/default-firewall.yaml")

# 2. Wrap tools with @firewall.guard
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
    resource=".env",  # Secret file exfiltration attempt
)

decision = firewall.evaluate(action)
print(decision.allowed)       # False
print(decision.decision)      # DecisionOutcome.DENY
print(decision.reason)        # Matched rule: deny-sensitive-env
print(decision.receipt_hash)  # Cryptographic SHA-256 receipt
`,
    },
    {
      title: "4. Developer CLI Workflows",
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
    <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto pb-12">
      {/* 1. Header Banner */}
      <div className="p-6 rounded-xl glass-panel border border-[rgba(255,255,255,0.08)]">
        <div className="flex items-center space-x-2 mb-1">
          <span className="h-2 w-2 rounded-full bg-cyan-400 cyber-pulse" />
          <span className="text-[10px] font-mono font-bold text-cyan-400 tracking-wider uppercase">
            INTEGRATION &amp; ARCHITECTURE MANUAL
          </span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight font-sans">
          Developer Documentation
        </h1>
        <p className="text-xs text-slate-400 max-w-2xl font-sans mt-0.5">
          Step-by-step guides for installing the SENTINEL SDK, wrapping agent tool calls,
          running CLI commands, and verifying cryptographic receipt chains.
        </p>
      </div>

      {/* 2. Architecture & Invariants Card */}
      <div className="p-5 rounded-xl glass-panel border border-[rgba(255,255,255,0.08)] space-y-3">
        <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xs font-mono uppercase tracking-wider">
          <Layers className="h-4 w-4" />
          <span>Core Security Invariants</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono pt-1">
          <div className="p-3.5 rounded bg-[#080c16] border border-slate-800 space-y-1">
            <div className="text-cyan-400 font-bold text-[11px]">1. ZERO-LLM FAIL-SAFE</div>
            <p className="text-slate-400 font-sans text-xs">
              Allow/deny policy evaluation is 100% deterministic code. LLMs are advisory only.
            </p>
          </div>
          <div className="p-3.5 rounded bg-[#080c16] border border-slate-800 space-y-1">
            <div className="text-rose-400 font-bold text-[11px]">2. ZERO TOOL LEAKAGE</div>
            <p className="text-slate-400 font-sans text-xs">
              When an action is denied, the underlying tool function is never called. Guaranteed non-execution.
            </p>
          </div>
          <div className="p-3.5 rounded bg-[#080c16] border border-slate-800 space-y-1">
            <div className="text-emerald-400 font-bold text-[11px]">3. TAMPER-EVIDENT LEDGER</div>
            <p className="text-slate-400 font-sans text-xs">
              Sequential RFC-8785 JSON receipts hashed with SHA-256 create an unbroken audit chain.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Code Snippets & Guides */}
      <div className="space-y-5">
        {codeSnippets.map((snippet, idx) => (
          <div
            key={idx}
            className="rounded-xl glass-panel border border-[rgba(255,255,255,0.08)] overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#080c16] border-b border-slate-800">
              <span className="text-xs font-mono font-bold text-slate-300">
                {snippet.title}
              </span>
              <button
                onClick={() => copyToClipboard(snippet.code, idx)}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#0d1322] hover:bg-slate-800 border border-slate-700 text-xs font-mono text-cyan-400 transition-colors"
              >
                {copiedIndex === idx ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-4 bg-[#060911]/90">
              <pre className="text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed">
                <code>{snippet.code}</code>
              </pre>
            </div>
          </div>
        ))}
      </div>

      {/* 4. Official Links & Help */}
      <div className="p-5 rounded-xl glass-panel border border-[rgba(255,255,255,0.08)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white font-sans">Need Help or Want to Contribute?</h3>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            SENTINEL is built for the BharatCode Build League under the Apache 2.0 open-source license.
          </p>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <a
            href="https://github.com/h4rsh740/SENTINEL"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center space-x-1.5 transition-colors border border-slate-700"
          >
            <span>GitHub Repo</span>
            <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href="https://bharatcode.ai"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-1.5 rounded bg-orange-600 hover:bg-orange-500 text-white text-xs font-mono font-bold flex items-center space-x-1.5 transition-colors shadow-md shadow-orange-600/30"
          >
            <span>BharatCode.ai</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
