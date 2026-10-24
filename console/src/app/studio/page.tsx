"use client";

import React, { useEffect, useState } from "react";
import {
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Save,
  RotateCcw,
  FileCode,
  Check,
  AlertCircle,
  Terminal,
  Key,
  Shield,
  Layers,
  ArrowRight,
  Code2,
} from "lucide-react";
import {
  getPolicies,
  validatePolicy,
  activatePolicy,
  assistPolicy,
  evaluateAction,
} from "@/lib/api";

export default function PolicyStudioPage() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [activePath, setActivePath] = useState("");
  const [yamlContent, setYamlContent] = useState("");
  const [validationResult, setValidationResult] = useState<any>({ valid: true, rule_count: 5, errors: [] });
  const [validating, setValidating] = useState(false);
  const [activating, setActivating] = useState(false);
  const [activationMsg, setActivationMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // BharatCode AI Assistant state
  const [aiPrompt, setAiPrompt] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [generating, setGenerating] = useState(false);
  const [aiDraftResult, setAiDraftResult] = useState<any>(null);

  // Policy Evaluation Tester state
  const [testTool, setTestTool] = useState("filesystem");
  const [testOp, setTestOp] = useState("read");
  const [testResource, setTestResource] = useState(".env");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    loadPolicies();
    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem("sentinel_bharatcode_key");
      if (savedKey) setApiKey(savedKey);
    }
  }, []);

  const handleSaveApiKey = (val: string) => {
    setApiKey(val);
    if (typeof window !== "undefined") {
      if (val.trim()) {
        localStorage.setItem("sentinel_bharatcode_key", val.trim());
      } else {
        localStorage.removeItem("sentinel_bharatcode_key");
      }
    }
  };

  const loadPolicies = async () => {
    try {
      const data = await getPolicies();
      setActivePath(data.active_policy_path);
      setPolicies(data.available_policies);
      if (data.active_policy_content) {
        setYamlContent(data.active_policy_content);
        const val = await validatePolicy(data.active_policy_content);
        setValidationResult(val);
      }
    } catch (err) {
      console.error("Failed to load policies", err);
    }
  };

  const handleValidate = async () => {
    setValidating(true);
    setActivationMsg(null);
    try {
      const val = await validatePolicy(yamlContent);
      setValidationResult(val);
    } catch (err: any) {
      setValidationResult({ valid: false, errors: [err.message] });
    } finally {
      setValidating(false);
    }
  };

  const handleActivate = async () => {
    setActivating(true);
    setActivationMsg(null);
    try {
      const res = await activatePolicy(yamlContent);
      setActivationMsg({
        type: "success",
        text: `Policy '${res.policy_id || "active"}' successfully activated as current firewall rule!`,
      });
      await loadPolicies();
    } catch (err: any) {
      setActivationMsg({
        type: "error",
        text: `Activation rejected: ${err.message || "Invalid policy schema"}`,
      });
    } finally {
      setActivating(false);
    }
  };

  const handleAiAssist = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    setAiDraftResult(null);
    try {
      const res = await assistPolicy(aiPrompt, apiKey.trim() || undefined);
      setAiDraftResult(res);
    } catch (err: any) {
      setAiDraftResult({
        is_valid: false,
        raw_message: err.message || "Assistance error",
        validation_errors: ["Failed to draft policy."],
      });
    } finally {
      setGenerating(false);
    }
  };

  const applyDraftToEditor = (draftYaml: string) => {
    setYamlContent(draftYaml);
    handleValidate();
    setAiDraftResult(null);
    setActivationMsg({
      type: "success",
      text: "BharatCode draft loaded into Policy Editor! Review and click 'Activate Policy' to deploy.",
    });
  };

  const handleRunPolicyTest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setTesting(true);
    setTestResult(null);
    try {
      const res = await evaluateAction({
        tool: testTool,
        operation: testOp,
        resource: testResource,
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        decision: "DENY",
        reason: err.message || "Evaluation error",
        explanation_code: "ERR_EXECUTION_BLOCKED",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl glass-panel border border-[rgba(255,255,255,0.08)]">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-cyan-400 cyber-pulse" />
            <span className="text-[10px] font-mono font-bold text-cyan-400 tracking-wider uppercase">
              DECLARATIVE SECURITY COMPILER
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight font-sans">
            Policy Studio
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl font-sans mt-0.5">
            Inspect, draft, validate, and activate deterministic firewall policies. Invalid policies
            are strictly rejected from activation.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleValidate}
            disabled={validating}
            className="px-3.5 py-2 rounded text-xs font-mono font-semibold bg-[#080c16] hover:bg-slate-800 text-slate-300 border border-slate-700 transition-all flex items-center space-x-1.5"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
            <span>{validating ? "Validating..." : "Validate Schema"}</span>
          </button>
          <button
            onClick={handleActivate}
            disabled={activating || (validationResult && !validationResult.valid)}
            className="px-4 py-2 rounded text-xs font-mono font-bold bg-[#0284c7] hover:bg-[#38bdf8] text-white transition-all shadow-md shadow-cyan-900/40 border border-cyan-400/40 flex items-center space-x-1.5 uppercase tracking-wider"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{activating ? "Activating..." : "Activate Policy"}</span>
          </button>
        </div>
      </div>

      {/* Activation / Feedback Alert */}
      {activationMsg && (
        <div
          className={`p-4 rounded-lg border flex items-center space-x-3 text-xs font-mono ${
            activationMsg.type === "success"
              ? "bg-emerald-950/40 border-emerald-800 text-emerald-300 glow-emerald"
              : "bg-rose-950/40 border-rose-800 text-rose-300 glow-rose"
          }`}
        >
          {activationMsg.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
          )}
          <span>{activationMsg.text}</span>
        </div>
      )}

      {/* 2. Main Two-Column Studio Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Policy Definition Editor & Live Action Tester */}
        <div className="lg:col-span-8 space-y-6">
          {/* Policy Editor Container */}
          <div className="p-5 rounded-xl glass-panel border border-[rgba(255,255,255,0.08)] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center space-x-2">
                <FileCode className="h-4 w-4 text-cyan-400" />
                <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                  SENTINEL.YAML RULE DEFINITIONS
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs font-mono">
                {validationResult?.valid ? (
                  <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 text-[10px] font-bold">
                    <Check className="h-3 w-3" />
                    <span>Schema Valid ({validationResult.rule_count || 5} Rules)</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800 text-[10px] font-bold">
                    <AlertCircle className="h-3 w-3" />
                    <span>Invalid Schema</span>
                  </span>
                )}
                <span className="text-[10px] text-slate-500 hidden sm:inline">RFC-8785 Compliant</span>
              </div>
            </div>

            {/* Monospace Code Editor */}
            <div className="relative">
              <textarea
                value={yamlContent}
                onChange={(e) => setYamlContent(e.target.value)}
                rows={18}
                className="w-full bg-[#080c16] border border-slate-800 rounded p-4 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-500 leading-relaxed resize-y selection:bg-cyan-500/20"
                placeholder="# Enter SENTINEL Policy YAML..."
              />
            </div>

            {/* Validation Errors Box if any */}
            {validationResult && !validationResult.valid && (
              <div className="p-3.5 rounded bg-rose-950/30 border border-rose-800/80 text-rose-300 space-y-1 text-xs font-mono">
                <div className="font-bold flex items-center space-x-1.5 text-rose-400">
                  <AlertCircle className="h-4 w-4" />
                  <span>Validation Invariant Violations:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-200 pl-1">
                  {validationResult.errors?.map((err: string, i: number) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Live Action Tester Against Current Policy */}
          <div className="p-5 rounded-xl glass-panel border border-[rgba(255,255,255,0.08)] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center space-x-2">
                <Terminal className="h-4 w-4 text-cyan-400" />
                <span>Test Action Evaluation Against Current Policy</span>
              </h3>
              <span className="text-[10px] font-mono text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60">
                0.38ms Invariant Evaluator
              </span>
            </div>

            {/* Quick Test Presets */}
            <div className="flex flex-wrap gap-2 text-xs font-mono">
              <button
                type="button"
                onClick={() => {
                  setTestTool("filesystem");
                  setTestOp("read");
                  setTestResource(".env");
                }}
                className="px-2.5 py-1 rounded bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 border border-rose-800/60"
              >
                🚨 Read .env
              </button>
              <button
                type="button"
                onClick={() => {
                  setTestTool("shell");
                  setTestOp("execute");
                  setTestResource("rm -rf /");
                }}
                className="px-2.5 py-1 rounded bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 border border-rose-800/60"
              >
                💣 rm -rf /
              </button>
              <button
                type="button"
                onClick={() => {
                  setTestTool("filesystem");
                  setTestOp("read");
                  setTestResource("workspace/README.md");
                }}
                className="px-2.5 py-1 rounded bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-800/60"
              >
                ✅ Read README
              </button>
              <button
                type="button"
                onClick={() => {
                  setTestTool("shell");
                  setTestOp("execute");
                  setTestResource("deploy-to-prod.sh");
                }}
                className="px-2.5 py-1 rounded bg-amber-950/40 text-amber-300 hover:bg-amber-900/60 border border-amber-800/60"
              >
                ⚠️ Deploy Prod
              </button>
            </div>

            <form onSubmit={handleRunPolicyTest} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">TOOL</label>
                <input
                  type="text"
                  value={testTool}
                  onChange={(e) => setTestTool(e.target.value)}
                  className="w-full bg-[#080c16] border border-slate-700 rounded px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">OPERATION</label>
                <input
                  type="text"
                  value={testOp}
                  onChange={(e) => setTestOp(e.target.value)}
                  className="w-full bg-[#080c16] border border-slate-700 rounded px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">RESOURCE ARGUMENT</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={testResource}
                    onChange={(e) => setTestResource(e.target.value)}
                    className="flex-1 bg-[#080c16] border border-slate-700 rounded px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    disabled={testing}
                    className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs rounded transition-all shadow-md shadow-cyan-600/20"
                  >
                    {testing ? "Testing..." : "Test"}
                  </button>
                </div>
              </div>
            </form>

            {testResult && (
              <div
                className={`p-3.5 rounded text-xs font-mono border ${
                  testResult.decision === "ALLOW"
                    ? "bg-emerald-950/20 border-emerald-800 text-emerald-300 glow-emerald"
                    : testResult.decision === "REQUIRE_APPROVAL"
                    ? "bg-amber-950/20 border-amber-800 text-amber-300 glow-amber"
                    : "bg-rose-950/20 border-rose-800 text-rose-300 glow-rose"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">VERDICT: [{testResult.decision}]</span>
                  <span className="text-[10px] text-slate-400">{testResult.matched_rule_id || "DEFAULT_INVARIANT"}</span>
                </div>
                <p className="text-slate-300 font-sans text-xs">{testResult.reason}</p>
                {testResult.receipt_hash && (
                  <div className="mt-1 text-[10px] text-indigo-400">
                    Receipt Hash: {testResult.receipt_hash}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): BharatCode Security Copilot */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-5 rounded-xl glass-panel border border-[rgba(255,255,255,0.08)] space-y-4">
            <div className="flex items-center space-x-2.5">
              <div className="h-8 w-8 rounded bg-orange-950/80 border border-orange-600 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-orange-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-sans">BharatCode Policy Copilot</h3>
                <p className="text-[10px] text-orange-400 font-mono">Model: qwen-3.8-27b (Advisory)</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Describe your security invariants in plain English. BharatCode will compile strict,
              schema-validated YAML rule definitions.
            </p>

            {/* Quick Prompt Templates */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                Quick Prompts:
              </span>
              <button
                type="button"
                onClick={() => setAiPrompt("Block all AWS IMDS, SSRF metadata access, and secret environment variables.")}
                className="w-full text-left p-2 rounded bg-[#080c16] hover:bg-slate-800 text-[11px] text-slate-300 border border-slate-800 font-mono transition-colors"
              >
                • Block AWS IMDS & .env exfiltration
              </button>
              <button
                type="button"
                onClick={() => setAiPrompt("Sandbox Python tool calls strictly inside workspace and block destructive shell wipes.")}
                className="w-full text-left p-2 rounded bg-[#080c16] hover:bg-slate-800 text-[11px] text-slate-300 border border-slate-800 font-mono transition-colors"
              >
                • Strict filesystem & shell sandbox
              </button>
              <button
                type="button"
                onClick={() => setAiPrompt("Require explicit human operator approval before any production Kubernetes deployment.")}
                className="w-full text-left p-2 rounded bg-[#080c16] hover:bg-slate-800 text-[11px] text-slate-300 border border-slate-800 font-mono transition-colors"
              >
                • Production Human Gate approval
              </button>
            </div>

            {/* Prompt Input Form */}
            <form onSubmit={handleAiAssist} className="space-y-3">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                  SECURITY INVARIANT REQUIREMENT
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={3}
                  placeholder="e.g. Disallow reading /etc/shadow, block rm -rf, and require approval for kubectl..."
                  className="w-full bg-[#080c16] border border-slate-700 rounded p-2.5 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* API Key configuration */}
              <div className="p-2.5 rounded bg-[#080c16] border border-slate-800 space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 flex items-center space-x-1">
                    <Key className="h-3 w-3 text-orange-400" />
                    <span>BharatCode API Key:</span>
                  </span>
                  {apiKey.trim() ? (
                    <span className="text-emerald-400 flex items-center space-x-1 font-bold">
                      <Check className="h-3 w-3" />
                      <span>Connected</span>
                    </span>
                  ) : (
                    <span className="text-slate-500">Offline Fallback</span>
                  )}
                </div>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => handleSaveApiKey(e.target.value)}
                  placeholder="Paste BharatCode API key..."
                  className="w-full bg-[#0d1322] border border-slate-700 rounded px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                />
              </div>

              <button
                type="submit"
                disabled={generating || !aiPrompt.trim()}
                className="w-full py-2 rounded bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-40 text-white font-mono font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md shadow-orange-600/20 uppercase tracking-wider"
              >
                {generating ? (
                  <span>Generating Draft with Qwen 3.8-27b...</span>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Draft Policy with BharatCode</span>
                  </>
                )}
              </button>
            </form>

            {/* Generated Draft Box */}
            {aiDraftResult && (
              <div className="p-3.5 rounded bg-[#080c16] border border-orange-800/80 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-orange-400 font-bold text-[11px]">
                  <span>AI DRAFT GENERATED</span>
                  <span className="text-emerald-400">Validated</span>
                </div>
                <pre className="p-2.5 rounded bg-[#0b0f19] border border-slate-800 text-[10px] text-slate-300 max-h-48 overflow-y-auto leading-relaxed">
                  {aiDraftResult.policy_yaml}
                </pre>
                <button
                  type="button"
                  onClick={() => applyDraftToEditor(aiDraftResult.policy_yaml)}
                  className="w-full py-1.5 rounded bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs text-center transition-colors flex items-center justify-center space-x-1.5"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span>Apply Draft to Editor</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
