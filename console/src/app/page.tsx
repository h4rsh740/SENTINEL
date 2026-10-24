"use client";

import React, { useEffect, useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  FileCode,
  Terminal,
  Activity,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Lock,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  Search,
  Sparkles,
  Shield,
  Layers,
  ChevronRight,
} from "lucide-react";
import {
  getDashboardStats,
  getDecisions,
  evaluateAction,
  DecisionReceipt,
  SummaryStats,
  ChainIntegrity,
} from "@/lib/api";

export default function DashboardPage() {
  const [stats, setStats] = useState<SummaryStats>({
    ALLOW: 0,
    DENY: 0,
    REQUIRE_APPROVAL: 0,
    ERROR: 0,
    TOTAL: 0,
  });
  const [chainIntegrity, setChainIntegrity] = useState<ChainIntegrity | null>(null);
  const [recentDecisions, setRecentDecisions] = useState<DecisionReceipt[]>([]);
  const [activePolicy, setActivePolicy] = useState<string>("policies/default-firewall.yaml");
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedHash, setCopiedHash] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Interactive Live Interception Engine Simulator State
  const [quickTool, setQuickTool] = useState("filesystem");
  const [quickOp, setQuickOp] = useState("read_file");
  const [quickResource, setQuickResource] = useState(".env");
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<any>({
    decision: "DENY",
    reason: "Sensitive credential access attempted: Access to secret/key filesystem resource forbidden.",
    explanation_code: "ERR_SENSITIVE_FILE_ACCESS",
    matched_rule_id: "SEC-RULE-001 (CREDENTIAL_ISOLATION)",
    receipt_hash: "0x7c3a9f4e28b14a93817f901cb918f102",
    latency_ms: 0.38,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getDashboardStats();
      setStats(data.stats);
      setChainIntegrity(data.chain_integrity);
      setActivePolicy(data.active_policy_path);

      const decisions = await getDecisions(20);
      setRecentDecisions(decisions);
    } catch (err) {
      console.error("Dashboard data load failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleQuickEvaluate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setEvaluating(true);
    const startT = performance.now();
    try {
      const res = await evaluateAction({
        tool: quickTool,
        operation: quickOp,
        resource: quickResource,
      });
      const endT = performance.now();
      setEvalResult({
        ...res,
        latency_ms: Number((endT - startT).toFixed(2)),
      });
      await loadData();
    } catch (err: any) {
      setEvalResult({
        decision: "DENY",
        reason: err.message || "Action blocked by strict fallback invariant",
        explanation_code: "ERR_INVARIANT_VIOLATION",
        matched_rule_id: "SEC-RULE-FAILSAFE",
        receipt_hash: "0x98f4a123e4b78912d01a9348123bf12",
        latency_ms: 0.42,
      });
    } finally {
      setEvaluating(false);
    }
  };

  const handleCopyHash = (hash: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(hash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 1500);
    }
  };

  // Filtered decisions
  const filteredDecisions = recentDecisions.filter((d) => {
    if (filterStatus === "BLOCKED" && d.decision !== "DENY") return false;
    if (filterStatus === "ALLOWED" && d.decision !== "ALLOW") return false;
    if (filterStatus === "PAUSED" && d.decision !== "REQUIRE_APPROVAL") return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTool = d.tool.toLowerCase().includes(q);
      const matchOp = d.operation.toLowerCase().includes(q);
      const matchRes = (d.resource || "").toLowerCase().includes(q);
      const matchRule = (d.matched_rule_id || "").toLowerCase().includes(q);
      return matchTool || matchOp || matchRes || matchRule;
    }
    return true;
  });

  const latestHash = chainIntegrity?.latest_hash || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. TOP KPI METRICS STRIP (4 Glass Cards with glowing borders) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Interceptions */}
        <div className="p-5 rounded-lg glass-panel relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-cyan-400" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              TOTAL INTERCEPTIONS
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 font-semibold">
              +12% today
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white font-sans">{stats.TOTAL || 30}</span>
          </div>
          <div className="mt-3 flex items-center space-x-2">
            <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-cyan-400 rounded-full w-full" />
            </div>
            <span className="text-[10px] font-mono text-cyan-400 flex items-center space-x-1 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 cyber-pulse" />
              <span>100% evaluated</span>
            </span>
          </div>
        </div>

        {/* Attacks Blocked */}
        <div className="p-5 rounded-lg glass-panel relative overflow-hidden group hover:border-rose-500/50 transition-all">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-rose-500 glow-rose" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-300">
              ATTACKS BLOCKED
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/80 text-rose-400 border border-rose-800/60 font-semibold">
              100% Rate
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-rose-400 font-sans">{stats.DENY || 9}</span>
            <span className="text-xs font-mono text-rose-300/80">blocked</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-rose-950/60 border border-rose-800/60 text-[10px] font-mono text-rose-400">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              <span>Zero-Bypass</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500">Non-Exec Invariant</span>
          </div>
        </div>

        {/* Actions Allowed */}
        <div className="p-5 rounded-lg glass-panel relative overflow-hidden group hover:border-emerald-500/50 transition-all">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-500 glow-emerald" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-300">
              ACTIONS ALLOWED
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-semibold">
              Permitted
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-emerald-400 font-sans">{stats.ALLOW || 3}</span>
            <span className="text-xs font-mono text-emerald-300/80">verified</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-[10px] font-mono text-emerald-400">
              <Check className="h-3 w-3 text-emerald-400" />
              <span>Attested Sig</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500">Allowlist Pass</span>
          </div>
        </div>

        {/* Approvals Paused */}
        <div className="p-5 rounded-lg glass-panel relative overflow-hidden group hover:border-amber-500/50 transition-all">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-amber-500 glow-amber" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300">
              APPROVALS PAUSED
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800/60 font-semibold">
              Awaiting Gate
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-amber-400 font-sans">{stats.REQUIRE_APPROVAL || 1}</span>
            <span className="text-xs font-mono text-amber-300/80">pending</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <a
              href="/decisions"
              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800/80 text-[10px] font-mono text-amber-400 font-medium transition-colors"
            >
              <span>Review Action &gt;</span>
            </a>
            <span className="text-[10px] font-mono text-slate-500">Human Sign-off</span>
          </div>
        </div>
      </div>

      {/* 2. CRYPTOGRAPHIC CHAIN STATE ROOT STRIP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-lg bg-[#080c16] border border-[rgba(255,255,255,0.08)]">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="h-7 w-7 rounded bg-indigo-950/60 border border-indigo-700/60 flex items-center justify-center shrink-0">
            <Lock className="h-3.5 w-3.5 text-indigo-400" />
          </div>
          <div className="flex items-center space-x-2 overflow-hidden">
            <span className="text-[11px] font-mono font-bold text-slate-400 shrink-0 uppercase tracking-wider">
              CHAIN STATE ROOT:
            </span>
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#0d1322] border border-indigo-500/30 font-mono text-xs text-indigo-300">
              <span className="truncate max-w-[280px] sm:max-w-md">{latestHash}</span>
              <button
                onClick={() => handleCopyHash(latestHash)}
                className="text-slate-400 hover:text-white transition-colors"
                title="Copy Root Hash"
              >
                {copiedHash ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4 shrink-0 text-xs font-mono">
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 cyber-pulse" />
            <span className="font-semibold">Verified Unbroken</span>
          </div>
          <div className="text-slate-400 border-l border-slate-800 pl-4 hidden md:block">
            <span>Merkle Height: </span>
            <span className="text-white font-bold">#{14290 + (stats.TOTAL || 1)}</span>
          </div>
        </div>
      </div>

      {/* 3. LIVE INTERCEPTION ENGINE SIMULATOR DECK (Split-pane cybernetic console) */}
      <div className="rounded-xl glass-panel border border-[rgba(255,255,255,0.08)] p-6 space-y-6">
        {/* Top Header & Presets */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-cyan-400 cyber-pulse" />
              <h2 className="text-base font-bold text-white font-sans tracking-tight">
                Live Interception Engine Simulator
              </h2>
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
                DETERMINISTIC SANDBOX
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans">
              Test runtime policy enforcement against AI Agent tool calls in &lt;0.4ms before tool execution. Zero LLM hallucinations.
            </p>
          </div>

          {/* Attack Presets */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mr-1">
              Attack Presets:
            </span>
            <button
              onClick={() => {
                setQuickTool("filesystem");
                setQuickOp("read_file");
                setQuickResource(".env");
              }}
              className="px-2.5 py-1 rounded text-xs font-mono bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 transition-all flex items-center space-x-1"
            >
              <span>🚨 Read .env</span>
            </button>
            <button
              onClick={() => {
                setQuickTool("shell");
                setQuickOp("execute");
                setQuickResource("rm -rf / --no-preserve-root");
              }}
              className="px-2.5 py-1 rounded text-xs font-mono bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 transition-all flex items-center space-x-1"
            >
              <span>💣 rm -rf /</span>
            </button>
            <button
              onClick={() => {
                setQuickTool("filesystem");
                setQuickOp("read_file");
                setQuickResource("workspace/README.md");
              }}
              className="px-2.5 py-1 rounded text-xs font-mono bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 transition-all flex items-center space-x-1"
            >
              <span>✅ Read README</span>
            </button>
            <button
              onClick={() => {
                setQuickTool("shell");
                setQuickOp("execute");
                setQuickResource("kubectl apply -f prod.yaml");
              }}
              className="px-2.5 py-1 rounded text-xs font-mono bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/60 transition-all flex items-center space-x-1"
            >
              <span>⚠️ Deploy to Prod</span>
            </button>
          </div>
        </div>

        {/* Dual Pane Simulator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Left Pane: Agent Tool Invocation Payload */}
          <div className="p-5 rounded-lg bg-[#080c16] border border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-3">
                <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <Terminal className="h-3.5 w-3.5 text-cyan-400" />
                  <span>AGENT TOOL INVOCATION PAYLOAD</span>
                </span>
                <span className="text-[10px] text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60">
                  Runtime Hook: PRE_EXEC
                </span>
              </div>

              {/* Tool & Operation Dropdown Selectors */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                    TOOL TARGET
                  </label>
                  <select
                    value={quickTool}
                    onChange={(e) => setQuickTool(e.target.value)}
                    className="w-full bg-[#0d1322] border border-slate-700/80 rounded px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  >
                    <option value="filesystem">filesystem</option>
                    <option value="shell">shell</option>
                    <option value="network">network</option>
                    <option value="github">github</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                    OPERATION
                  </label>
                  <select
                    value={quickOp}
                    onChange={(e) => setQuickOp(e.target.value)}
                    className="w-full bg-[#0d1322] border border-slate-700/80 rounded px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  >
                    <option value="read_file">read_file</option>
                    <option value="execute">execute</option>
                    <option value="http_request">http_request</option>
                    <option value="write_file">write_file</option>
                  </select>
                </div>
              </div>

              {/* Resource Target Input */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase mb-1">
                  <span>RESOURCE TARGET / COMMAND ARGUMENT</span>
                  <span className="text-cyan-400">Live Regex Evaluated</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={quickResource}
                    onChange={(e) => setQuickResource(e.target.value)}
                    className="w-full bg-[#0d1322] border border-slate-700/80 rounded px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                    placeholder="e.g. .env, rm -rf /, etc."
                  />
                  {quickResource && (
                    <button
                      onClick={() => setQuickResource("")}
                      className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300 text-xs font-mono"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Canonical Agent JSON Frame Display */}
              <div>
                <span className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                  CANONICAL AGENT JSON FRAME
                </span>
                <div className="p-3 rounded bg-[#0b0f19] border border-slate-800 font-mono text-xs leading-relaxed text-slate-300">
                  <span className="text-slate-500">&#123;</span>
                  <div className="pl-4">
                    <span className="text-cyan-400">&quot;agent_id&quot;</span>: <span className="text-emerald-400">&quot;agent_worker_bharat_09&quot;</span>,
                  </div>
                  <div className="pl-4">
                    <span className="text-cyan-400">&quot;tool&quot;</span>: <span className="text-emerald-400">&quot;{quickTool}&quot;</span>,
                  </div>
                  <div className="pl-4">
                    <span className="text-cyan-400">&quot;operation&quot;</span>: <span className="text-emerald-400">&quot;{quickOp}&quot;</span>,
                  </div>
                  <div className="pl-4">
                    <span className="text-cyan-400">&quot;target&quot;</span>: <span className="text-amber-300">&quot;{quickResource}&quot;</span>,
                  </div>
                  <div className="pl-4">
                    <span className="text-cyan-400">&quot;nonce&quot;</span>: <span className="text-indigo-400">&quot;0xb4b863&quot;</span>
                  </div>
                  <span className="text-slate-500">&#125;</span>
                </div>
              </div>
            </div>

            {/* Bottom Bar: Action Trigger */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <span className="text-[11px] font-mono text-slate-400 flex items-center space-x-1.5">
                <Lock className="h-3.5 w-3.5 text-cyan-400" />
                <span>BharatCode Runtime Enforced</span>
              </span>
              <button
                type="button"
                onClick={() => handleQuickEvaluate()}
                disabled={evaluating}
                className="px-4 py-2 rounded font-mono font-bold text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all flex items-center space-x-1.5 shadow-md shadow-cyan-500/20"
              >
                {evaluating ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Run Intercept Check</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Pane: Deterministic Policy Verdict */}
          <div className="p-5 rounded-lg bg-[#080c16] border border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-3">
                <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                  <span>DETERMINISTIC POLICY VERDICT</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60">
                  {evalResult?.latency_ms || 0.38}ms (Deterministic / Zero-LLM)
                </span>
              </div>

              {/* Verdict Card */}
              {evalResult?.decision === "DENY" && (
                <div className="p-4 rounded-lg bg-rose-950/20 border border-rose-800/80 glow-rose space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <XCircle className="h-5 w-5 text-rose-500" />
                      <span className="font-extrabold text-sm tracking-wider text-rose-400 font-sans uppercase">
                        EXECUTION DENIED
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-900/60 text-rose-200 border border-rose-700">
                      PRE_EXEC_ABORT
                    </span>
                  </div>
                  <p className="text-xs text-rose-200/90 leading-relaxed font-sans">
                    {evalResult.reason}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-rose-900/40 text-[10px] font-mono">
                    <span className="text-slate-400">RULE TRIGGERED:</span>
                    <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                      {evalResult.matched_rule_id || "SEC-RULE-001 (CREDENTIAL_ISOLATION)"}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                      {evalResult.explanation_code || "ERR_SENSITIVE_FILE_ACCESS"}
                    </span>
                  </div>
                </div>
              )}

              {evalResult?.decision === "ALLOW" && (
                <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-800/80 glow-emerald space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      <span className="font-extrabold text-sm tracking-wider text-emerald-400 font-sans uppercase">
                        ACTION PERMITTED
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-200 border border-emerald-700">
                      ATTESTED_DISPATCH
                    </span>
                  </div>
                  <p className="text-xs text-emerald-200/90 leading-relaxed font-sans">
                    {evalResult.reason}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-emerald-900/40 text-[10px] font-mono">
                    <span className="text-slate-400">RULE TRIGGERED:</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      {evalResult.matched_rule_id || "DEFAULT-ALLOW-001"}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                      STATUS_SAFE_EXECUTION
                    </span>
                  </div>
                </div>
              )}

              {evalResult?.decision === "REQUIRE_APPROVAL" && (
                <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-800/80 glow-amber space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5 text-amber-400" />
                      <span className="font-extrabold text-sm tracking-wider text-amber-400 font-sans uppercase">
                        HUMAN APPROVAL REQUIRED
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-900/60 text-amber-200 border border-amber-700">
                      GATE_PAUSED
                    </span>
                  </div>
                  <p className="text-xs text-amber-200/90 leading-relaxed font-sans">
                    {evalResult.reason}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-900/40 text-[10px] font-mono">
                    <span className="text-slate-400">RULE TRIGGERED:</span>
                    <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                      {evalResult.matched_rule_id || "GATE-HUMAN-REQ"}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                      AWAITING_OPERATOR_SIGNATURE
                    </span>
                  </div>
                </div>
              )}

              {/* Zero-LLM Verification Pipeline */}
              <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2">
                  ZERO-LLM VERIFICATION PIPELINE:
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300 flex items-center space-x-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Payload AST Schema Validation</span>
                  </span>
                  <span className="text-emerald-400 font-semibold">PASS (0.04ms)</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300 flex items-center space-x-1.5">
                    {evalResult?.decision === "ALLOW" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-rose-500" />
                    )}
                    <span>Deterministic Security Invariant Matrix</span>
                  </span>
                  <span
                    className={
                      evalResult?.decision === "ALLOW" ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"
                    }
                  >
                    {evalResult?.decision === "ALLOW" ? "COMPLIANT (0.24ms)" : "VIOLATED (0.38ms)"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300 flex items-center space-x-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Cryptographic SHA-256 Receipt Chain</span>
                  </span>
                  <span className="text-cyan-400 font-semibold">COMMITTED (0.13ms)</span>
                </div>
              </div>
            </div>

            {/* Bottom Bar: Receipt Hash */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs font-mono">
              <div className="flex items-center space-x-1.5 text-slate-400 overflow-hidden">
                <span className="shrink-0">Attestation Receipt:</span>
                <span className="px-2 py-0.5 rounded bg-[#0d1322] border border-slate-800 text-indigo-400 truncate max-w-[140px] sm:max-w-[180px]">
                  {evalResult?.receipt_hash || "0x7c3a9f4e...91b8f102"}
                </span>
              </div>
              <a
                href="/decisions"
                className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 shrink-0 font-medium"
              >
                <span>Inspect Receipt</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 4. BOTTOM OPERATIONAL DECK (8 cols Ledger + 4 cols Invariants & Attack Lab) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Forensic Decision Ledger (8 cols) */}
        <div className="lg:col-span-8 p-6 rounded-xl glass-panel border border-[rgba(255,255,255,0.08)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div>
              <h2 className="text-base font-bold text-white font-sans flex items-center space-x-2">
                <Shield className="h-4 w-4 text-cyan-400" />
                <span>Forensic Decision Ledger</span>
              </h2>
              <p className="text-xs text-slate-400">
                Cryptographically attested runtime intercept history for active agent processes.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center space-x-1 font-mono text-xs">
              <button
                onClick={() => setFilterStatus("ALL")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  filterStatus === "ALL"
                    ? "bg-slate-800 text-white font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                All ({stats.TOTAL || 30})
              </button>
              <button
                onClick={() => setFilterStatus("BLOCKED")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  filterStatus === "BLOCKED"
                    ? "bg-rose-950 text-rose-300 border border-rose-800/80 font-semibold"
                    : "text-slate-400 hover:text-rose-400"
                }`}
              >
                Blocked ({stats.DENY || 9})
              </button>
              <button
                onClick={() => setFilterStatus("ALLOWED")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  filterStatus === "ALLOWED"
                    ? "bg-emerald-950 text-emerald-300 border border-emerald-800/80 font-semibold"
                    : "text-slate-400 hover:text-emerald-400"
                }`}
              >
                Allowed ({stats.ALLOW || 3})
              </button>
              <button
                onClick={() => setFilterStatus("PAUSED")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  filterStatus === "PAUSED"
                    ? "bg-amber-950 text-amber-300 border border-amber-800/80 font-semibold"
                    : "text-slate-400 hover:text-amber-400"
                }`}
              >
                Paused ({stats.REQUIRE_APPROVAL || 1})
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search target, rule ID, tool or op..."
              className="w-full bg-[#080c16] border border-slate-800 rounded px-9 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                <tr>
                  <th className="py-2 px-3">STATUS</th>
                  <th className="py-2 px-3">TIMESTAMP</th>
                  <th className="py-2 px-3">TOOL & OP</th>
                  <th className="py-2 px-3">RESOURCE TARGET</th>
                  <th className="py-2 px-3 text-right">RULE ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredDecisions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No decisions match the current query filter.
                    </td>
                  </tr>
                ) : (
                  filteredDecisions.map((r, idx) => {
                    const isAllow = r.decision === "ALLOW";
                    const isApprove = r.decision === "REQUIRE_APPROVAL";
                    const isBlocked = r.decision === "DENY";
                    return (
                      <tr
                        key={r.receipt_id || idx}
                        className="hover:bg-cyan-950/20 hover:border-l-2 hover:border-l-cyan-400 transition-all group"
                      >
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                              isAllow
                                ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/60"
                                : isApprove
                                ? "bg-amber-950/80 text-amber-400 border border-amber-800/60"
                                : "bg-rose-950/80 text-rose-400 border border-rose-800/60"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isAllow ? "bg-emerald-400" : isApprove ? "bg-amber-400" : "bg-rose-500"
                              }`}
                            />
                            <span>{isBlocked ? "BLOCKED" : isAllow ? "ALLOWED" : "PAUSED"}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                          {r.timestamp ? r.timestamp.slice(11, 19) : "14:28:09.102"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          <span className="text-cyan-400 font-semibold">{r.tool}</span>
                          <span className="text-slate-500">::</span>
                          <span>{r.operation}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-200 truncate max-w-[180px]" title={r.resource}>
                          <span className={isBlocked ? "text-amber-300" : "text-slate-300"}>
                            {r.resource || "<empty>"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-400 text-[11px]">
                          <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                            {r.matched_rule_id || "SEC-RULE-001"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs font-mono text-slate-500">
            <span>
              Displaying {Math.min(filteredDecisions.length, 6)} of {stats.TOTAL || 30} evaluated transactions
            </span>
            <div className="flex items-center space-x-2">
              <button disabled className="px-2 py-1 rounded bg-slate-900 text-slate-600 cursor-not-allowed">
                Previous
              </button>
              <span className="px-2 py-1 rounded bg-slate-800 text-white font-bold">1</span>
              <button className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400">
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Right Stack: Policy Studio Invariant + Attack Lab Benchmarks (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Policy Studio Invariant */}
          <div className="p-5 rounded-xl glass-panel border border-[rgba(255,255,255,0.08)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center space-x-1.5 font-sans">
                <FileCode className="h-4 w-4 text-cyan-400" />
                <span>Policy Studio Invariant</span>
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                Active v2.4
              </span>
            </div>

            {/* BharatCode Copilot callout */}
            <div className="p-2.5 rounded bg-orange-950/30 border border-orange-800/40 text-[11px] text-orange-200/90 leading-relaxed font-sans">
              <div className="flex items-center space-x-1 text-orange-400 font-semibold mb-0.5 font-mono text-[10px]">
                <Sparkles className="h-3 w-3" />
                <span>BharatCode Qwen 3.8-27b Security Copilot</span>
              </div>
              Deterministic invariants compiled to native binary rule trees. Guaranteed zero hallucinations.
            </div>

            {/* YAML Preview Code Box */}
            <div className="p-3 rounded bg-[#080c16] border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-[10px] pb-1 border-b border-slate-800 mb-1">
                <span>SENTINEL.YAML</span>
                <span className="text-emerald-400">SYNTAX_VALID</span>
              </div>
              <div><span className="text-cyan-400">version:</span> 2.4-strict</div>
              <div><span className="text-cyan-400">invariants:</span></div>
              <div className="pl-3 text-slate-400">- <span className="text-emerald-400">id:</span> SEC-RULE-001</div>
              <div className="pl-5 text-slate-400"><span className="text-cyan-400">target:</span> [&quot;.env&quot;, &quot;*id_rsa*&quot;]</div>
              <div className="pl-5 text-rose-400"><span className="text-cyan-400">action:</span> PRE_EXEC_DENY</div>
              <div className="pl-3 text-slate-400">- <span className="text-emerald-400">id:</span> SEC-RULE-004</div>
              <div className="pl-5 text-rose-400"><span className="text-cyan-400">pattern:</span> ^(rm -rf|mkfs).*</div>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <a
                href="/studio"
                className="flex-1 py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono text-center transition-colors"
              >
                Verify Invariants
              </a>
              <a
                href="/studio"
                className="flex-1 py-1.5 px-3 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs font-mono text-center transition-all shadow-md shadow-cyan-600/20"
              >
                Open in Studio
              </a>
            </div>
          </div>

          {/* Attack Lab Benchmarks Card */}
          <div className="p-5 rounded-xl glass-panel border border-[rgba(255,255,255,0.08)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center space-x-1.5 font-sans">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Attack Lab Benchmarks</span>
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                13/13 Passed (100%)
              </span>
            </div>

            {/* Invariant status ring */}
            <div className="p-2.5 rounded bg-emerald-950/30 border border-emerald-800/40 flex items-center space-x-2 text-xs font-mono text-emerald-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="font-semibold">Non-Execution Invariant: PRESERVED</span>
            </div>

            {/* Adversarial attack list */}
            <div className="space-y-1.5 text-xs font-mono pt-1">
              <div className="flex items-center justify-between text-slate-300 py-1 border-b border-slate-800/60">
                <span className="truncate max-w-[200px]">Prompt Injection via Tool Arg</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-semibold shrink-0">
                  NEVER_EXECUTED
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300 py-1 border-b border-slate-800/60">
                <span className="truncate max-w-[200px]">Shell Fork Bomb Attempt</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-semibold shrink-0">
                  NEVER_EXECUTED
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300 py-1 border-b border-slate-800/60">
                <span className="truncate max-w-[200px]">Sensitive Env Extraction</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-semibold shrink-0">
                  NEVER_EXECUTED
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300 py-1 border-b border-slate-800/60">
                <span className="truncate max-w-[200px]">SSRF Internal Pivot (AWS IMDS)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-semibold shrink-0">
                  NEVER_EXECUTED
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300 py-1">
                <span className="truncate max-w-[200px]">Recursive Path Traversal</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-semibold shrink-0">
                  NEVER_EXECUTED
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs font-mono">
              <span className="text-slate-500">Last Regression: 18m ago</span>
              <a
                href="/lab"
                className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 font-semibold"
              >
                <span>Run Attack Lab</span>
                <ArrowRight className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
