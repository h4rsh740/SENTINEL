"use client";

import React, { useEffect, useState } from "react";
import {
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Play,
  Save,
  RotateCcw,
  Shield,
  FileCode,
  Check,
  AlertCircle,
  Copy,
  Terminal,
  Key,
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
  const [validationResult, setValidationResult] = useState<any>(null);
  const [validating, setValidating] = useState(false);
  const [activating, setActivating] = useState(false);
  const [activationMsg, setActivationMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // BharatCode AI Assistant state
  const [aiPrompt, setAiPrompt] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiDraftResult, setAiDraftResult] = useState<any>(null);

  // Quick Policy Evaluator Tester
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
      setYamlContent(data.active_policy_content);
      // Validate initially
      if (data.active_policy_content) {
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
        text: `Policy '${res.policy_id}' successfully activated as current firewall rule!`,
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

  const handleAiAssist = async (e: React.FormEvent) => {
    e.preventDefault();
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
  };

  const handleRunPolicyTest = async (e: React.FormEvent) => {
    e.preventDefault();
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
        decision: "ERROR",
        reason: err.message || "Evaluation error",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl glass-panel border border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <Sliders className="h-4 w-4" />
            <span>Declarative Security Configuration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Policy Studio
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl">
            Inspect, draft, validate, and activate deterministic firewall policies. Invalid policies
            are strictly blocked from activation.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleValidate}
            disabled={validating}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition-all"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
            <span>{validating ? "Validating..." : "Validate Schema"}</span>
          </button>
          <button
            onClick={handleActivate}
            disabled={activating || (validationResult && !validationResult.valid)}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-lg shadow-cyan-600/20"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{activating ? "Activating..." : "Activate Policy"}</span>
          </button>
        </div>
      </div>

      {activationMsg && (
        <div
          className={`p-4 rounded-xl border flex items-center space-x-3 ${
            activationMsg.type === "success"
              ? "bg-emerald-950/40 border-emerald-800 text-emerald-300"
              : "bg-rose-950/40 border-rose-800 text-rose-300"
          }`}
        >
          {activationMsg.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{activationMsg.text}</span>
        </div>
      )}

      {/* Main Grid: Editor + BharatCode Assistant */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor & Validation Panel (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileCode className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-bold text-white">Policy Definition (YAML)</span>
              </div>
              <div className="flex items-center space-x-2 text-xs">
                {validationResult?.valid ? (
                  <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono text-[11px]">
                    <Check className="h-3 w-3" />
                    <span>Schema Valid ({validationResult.rule_count} Rules)</span>
                  </span>
                ) : validationResult ? (
                  <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800 font-mono text-[11px]">
                    <AlertCircle className="h-3 w-3" />
                    <span>Invalid Schema</span>
                  </span>
                ) : null}
              </div>
            </div>

            {/* Syntax Editor Box */}
            <div className="relative">
              <textarea
                value={yamlContent}
                onChange={(e) => setYamlContent(e.target.value)}
                rows={18}
                className="w-full bg-[#090e1a] border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-500 leading-relaxed resize-y selection:bg-cyan-500/30"
                placeholder="# Enter SENTINEL Policy YAML..."
              />
            </div>

            {/* Validation Errors Box if any */}
            {validationResult && !validationResult.valid && (
              <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/80 text-rose-300 space-y-1 text-xs">
                <div className="font-bold flex items-center space-x-1.5">
                  <AlertCircle className="h-4 w-4 text-rose-400" />
                  <span>Validation Errors Detected:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 font-mono text-[11px] text-rose-200">
                  {validationResult.errors?.map((err: string, i: number) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Live Action Tester for this Policy */}
          <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Terminal className="h-4 w-4 text-cyan-400" />
              <span>Test Action Against Active Policy</span>
            </h3>
            <form onSubmit={handleRunPolicyTest} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Tool</label>
                <input
                  type="text"
                  value={testTool}
                  onChange={(e) => setTestTool(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Operation</label>
                <input
                  type="text"
                  value={testOp}
                  onChange={(e) => setTestOp(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] text-slate-400 mb-1">Resource</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={testResource}
                    onChange={(e) => setTestResource(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                  <button
                    type="submit"
                    disabled={testing}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold text-xs rounded-lg transition-all"
                  >
                    {testing ? "Testing..." : "Test"}
                  </button>
                </div>
              </div>
            </form>

            {testResult && (
              <div
                className={`p-3 rounded-lg text-xs font-mono border ${
                  testResult.decision === "ALLOW"
                    ? "bg-emerald-950/30 border-emerald-800 text-emerald-300"
                    : testResult.decision === "REQUIRE_APPROVAL"
                    ? "bg-amber-950/30 border-amber-800 text-amber-300"
                    : "bg-rose-950/30 border-rose-800 text-rose-300"
                }`}
              >
                <span className="font-bold">[{testResult.decision}]</span> {testResult.reason}
              </div>
            )}
          </div>
        </div>

        {/* BharatCode Policy Assistant (1 col) */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-4 bg-gradient-to-b from-slate-900/90 to-cyan-950/20">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-orange-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">BharatCode Policy Assistant</h3>
                <p className="text-[11px] text-slate-400">Model: qwen-3.8-27b (Advisory)</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Describe your desired security restrictions in plain language. BharatCode drafts a
              strict, schema-validated policy pack.
            </p>

            <form onSubmit={handleAiAssist} className="space-y-3">
              {/* API Key Input Field */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <label className="text-slate-400 font-semibold flex items-center space-x-1.5">
                    <Key className="h-3.5 w-3.5 text-orange-400" />
                    <span>BharatCode API Key (Optional):</span>
                  </label>
                  {apiKey.trim() ? (
                    <span className="text-[10px] text-emerald-400 font-mono font-medium flex items-center space-x-1">
                      <Check className="h-3 w-3" />
                      <span>Key Connected</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-400 font-mono">
                      Offline Demo Mode
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => handleSaveApiKey(e.target.value)}
                    placeholder="Paste your BHARATCODE_API_KEY..."
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-orange-500 pr-14"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1.5 text-[11px] text-slate-400 hover:text-slate-200 font-mono"
                  >
                    {showKey ? "Hide" : "Show"}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Enter your purchased API key to call <code className="text-orange-400/90 font-mono">qwen-3.8-27b</code> live. Stored locally in your browser.
                </p>
              </div>

              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={4}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
                placeholder="e.g. Allow reading workspace files, but strictly block .env and private keys, and require approval for deploying to AWS..."
              />
              <button
                type="submit"
                disabled={generating || !aiPrompt.trim()}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-md transition-all"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{generating ? "Drafting Policy..." : "Generate Policy Draft"}</span>
              </button>
            </form>

            {/* AI Draft Result Box */}
            {aiDraftResult && (
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400">
                    Draft: {aiDraftResult.policy_id || "generated-policy"}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    {aiDraftResult.model_used}
                  </span>
                </div>

                {aiDraftResult.raw_message && (
                  <p className="text-[11px] text-slate-400 italic">
                    {aiDraftResult.raw_message}
                  </p>
                )}

                <pre className="max-h-48 overflow-y-auto p-3 rounded-lg bg-black/60 font-mono text-[11px] text-slate-300 leading-tight">
                  {aiDraftResult.yaml_content}
                </pre>

                <button
                  onClick={() => applyDraftToEditor(aiDraftResult.yaml_content)}
                  className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all flex items-center justify-center space-x-1"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Load Draft into Studio Editor</span>
                </button>
              </div>
            )}
          </div>

          {/* Preset Policy Packs */}
          <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Community Policy Packs
            </h4>
            <div className="space-y-2">
              {policies.map((p) => (
                <div
                  key={p.path}
                  className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-semibold text-white">{p.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {p.rule_count} rules • Mode: {p.mode}
                    </div>
                  </div>
                  {p.is_active && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                      Active
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
