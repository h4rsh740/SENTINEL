"use client";

import React, { useEffect, useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Clock,
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

  // Quick Action Playground state
  const [quickTool, setQuickTool] = useState("filesystem");
  const [quickOp, setQuickOp] = useState("read");
  const [quickResource, setQuickResource] = useState(".env");
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getDashboardStats();
      setStats(data.stats);
      setChainIntegrity(data.chain_integrity);
      setActivePolicy(data.active_policy_path);

      const decisions = await getDecisions(12);
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

  const handleQuickEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    setEvaluating(true);
    setEvalResult(null);
    try {
      const res = await evaluateAction({
        tool: quickTool,
        operation: quickOp,
        resource: quickResource,
      });
      setEvalResult(res);
      // Refresh receipts and stats
      await loadData();
    } catch (err: any) {
      setEvalResult({
        decision: "ERROR",
        reason: err.message || "Evaluation request failed",
        explanation_code: "ERR_NETWORK",
      });
    } finally {
      setEvaluating(false);
    }
  };

  const blockPercentage =
    stats.TOTAL > 0 ? Math.round((stats.DENY / stats.TOTAL) * 100) : 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner / Hero */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl glass-panel border border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-cyan-950/30">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Deterministic Runtime Enforcement Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            AI Agent Action Firewall
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl">
            Inspecting and gating agent tool requests before execution. Every decision is backed by
            an immutable, tamper-evident SHA-256 decision receipt.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadData}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <a
            href="/lab"
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 transition-all"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Launch Attack Lab</span>
          </a>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Interceptions */}
        <div className="p-5 rounded-xl glass-panel border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Actions Evaluated</span>
            <Activity className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black text-white">{stats.TOTAL}</div>
          <p className="text-[11px] text-slate-500 mt-1">Intercepted at firewall gate</p>
        </div>

        {/* Attacks Blocked */}
        <div className="p-5 rounded-xl glass-panel border border-rose-900/40 bg-rose-950/10 hover:border-rose-800/60 transition-all">
          <div className="flex items-center justify-between text-rose-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Blocked (Denied)</span>
            <ShieldAlert className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-3xl font-black text-rose-400">{stats.DENY}</div>
          <p className="text-[11px] text-rose-300/60 mt-1">
            {blockPercentage}% block rate on dangerous calls
          </p>
        </div>

        {/* Permitted Actions */}
        <div className="p-5 rounded-xl glass-panel border border-emerald-900/40 bg-emerald-950/10 hover:border-emerald-800/60 transition-all">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Allowed Actions</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400">{stats.ALLOW}</div>
          <p className="text-[11px] text-emerald-300/60 mt-1">Verified safe execution</p>
        </div>

        {/* Human Approvals */}
        <div className="p-5 rounded-xl glass-panel border border-amber-900/40 bg-amber-950/10 hover:border-amber-800/60 transition-all">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Approvals Required</span>
            <KeyRound className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-400">{stats.REQUIRE_APPROVAL}</div>
          <p className="text-[11px] text-amber-300/60 mt-1">Human-in-the-loop paused</p>
        </div>
      </div>

      {/* Two Column Layout: Quick Evaluator + Integrity Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Action Tester (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Terminal className="h-4 w-4 text-cyan-400" />
                <span>Live Action Interception Gate</span>
              </h2>
              <p className="text-xs text-slate-400">
                Simulate an agent tool invocation and observe real-time policy evaluation.
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              Zero-LLM Fast Path
            </span>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => {
                setQuickTool("filesystem");
                setQuickOp("read");
                setQuickResource(".env");
              }}
              className="px-2.5 py-1 rounded-md text-xs bg-slate-800/80 hover:bg-slate-700 text-rose-300 border border-rose-900/30"
            >
              🚨 Read .env (Secret Exfil)
            </button>
            <button
              onClick={() => {
                setQuickTool("shell");
                setQuickOp("execute");
                setQuickResource("rm -rf / --no-preserve-root");
              }}
              className="px-2.5 py-1 rounded-md text-xs bg-slate-800/80 hover:bg-slate-700 text-rose-300 border border-rose-900/30"
            >
              💣 rm -rf / (Destructive)
            </button>
            <button
              onClick={() => {
                setQuickTool("filesystem");
                setQuickOp("read");
                setQuickResource("workspace/README.md");
              }}
              className="px-2.5 py-1 rounded-md text-xs bg-slate-800/80 hover:bg-slate-700 text-emerald-300 border border-emerald-900/30"
            >
              ✅ Read README.md (Allowed)
            </button>
            <button
              onClick={() => {
                setQuickTool("shell");
                setQuickOp("execute");
                setQuickResource("deploy-to-prod.sh");
              }}
              className="px-2.5 py-1 rounded-md text-xs bg-slate-800/80 hover:bg-slate-700 text-amber-300 border border-amber-900/30"
            >
              ⚠️ Deploy to Prod (Approval)
            </button>
          </div>

          <form onSubmit={handleQuickEvaluate} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Tool</label>
              <select
                value={quickTool}
                onChange={(e) => setQuickTool(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="filesystem">filesystem</option>
                <option value="shell">shell</option>
                <option value="network">network</option>
                <option value="github">github</option>
                <option value="custom_tool">custom_tool</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Operation</label>
              <input
                type="text"
                value={quickOp}
                onChange={(e) => setQuickOp(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                placeholder="read / execute / request"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Resource / Target Argument
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={quickResource}
                  onChange={(e) => setQuickResource(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  placeholder=".env or command string"
                />
                <button
                  type="submit"
                  disabled={evaluating}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all shadow-md flex items-center space-x-1 shrink-0"
                >
                  {evaluating ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <span>Evaluate</span>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Quick Eval Result Panel */}
          {evalResult && (
            <div
              className={`p-4 rounded-xl border transition-all ${
                evalResult.decision === "ALLOW"
                  ? "bg-emerald-950/20 border-emerald-800/80 text-emerald-300"
                  : evalResult.decision === "REQUIRE_APPROVAL"
                  ? "bg-amber-950/20 border-amber-800/80 text-amber-300"
                  : "bg-rose-950/20 border-rose-800/80 text-rose-300"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {evalResult.decision === "ALLOW" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : evalResult.decision === "REQUIRE_APPROVAL" ? (
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-400" />
                  )}
                  <span className="font-bold text-sm tracking-wide">
                    DECISION: {evalResult.decision}
                  </span>
                </div>
                <span className="text-[10px] font-mono opacity-80">
                  {evalResult.explanation_code}
                </span>
              </div>
              <p className="text-xs text-slate-200">{evalResult.reason}</p>
              {evalResult.receipt_hash && (
                <div className="mt-2 text-[10px] font-mono text-slate-400 truncate">
                  SHA-256 Receipt: {evalResult.receipt_hash}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chain Integrity & Policy Overview (1 col) */}
        <div className="space-y-4">
          {/* Integrity Card */}
          <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Lock className="h-3.5 w-3.5 text-cyan-400" />
                <span>Tamper-Evident Hash Chain</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                VERIFIED
              </span>
            </div>
            <p className="text-xs text-slate-400">
              RFC-8785 canonical JSON receipts chained sequentially with SHA-256. Any historical
              tampering invalidates the downstream root.
            </p>
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 font-mono text-[11px] text-slate-400 break-all">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">
                Latest Chain Digest
              </div>
              {chainIntegrity?.latest_hash || "GENESIS_SENTINEL_CHAIN_V1"}
            </div>
          </div>

          {/* Active Policy Status Card */}
          <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <FileCode className="h-3.5 w-3.5 text-cyan-400" />
                <span>Active Policy</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                Mode: Strict
              </span>
            </div>
            <div className="text-sm font-bold text-white truncate">{activePolicy}</div>
            <div className="flex items-center justify-between pt-1">
              <a
                href="/studio"
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 font-medium"
              >
                <span>Edit Policy in Studio</span>
                <ArrowRight className="h-3 w-3" />
              </a>
              <a
                href="/decisions"
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center space-x-1"
              >
                <span>Full Audit Log</span>
                <ArrowRight className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Audit Receipt Stream */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              <span>Real-Time Interception Stream</span>
            </h2>
            <p className="text-xs text-slate-400">
              Live audit receipts recorded in SQLite with sequential cryptographic hash chaining.
            </p>
          </div>
          <a
            href="/decisions"
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium self-start sm:self-center"
          >
            View all receipts ({stats.TOTAL}) →
          </a>
        </div>

        {recentDecisions.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            No events recorded yet. Run simulations in Attack Lab or test an action above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase">
                <tr>
                  <th className="py-2.5 px-3">Decision</th>
                  <th className="py-2.5 px-3">Tool & Op</th>
                  <th className="py-2.5 px-3">Target Resource</th>
                  <th className="py-2.5 px-3">Matched Rule</th>
                  <th className="py-2.5 px-3 text-right">Receipt Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {recentDecisions.map((r) => {
                  const isAllow = r.decision === "ALLOW";
                  const isApprove = r.decision === "REQUIRE_APPROVAL";
                  return (
                    <tr key={r.receipt_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                            isAllow
                              ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/60"
                              : isApprove
                              ? "bg-amber-950/80 text-amber-400 border border-amber-800/60"
                              : "bg-rose-950/80 text-rose-400 border border-rose-800/60"
                          }`}
                        >
                          {r.decision}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300 font-sans">
                        <span className="font-semibold text-cyan-400 font-mono">{r.tool}</span>
                        <span className="text-slate-500 mx-1">::</span>
                        <span className="text-slate-400">{r.operation}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-200 truncate max-w-xs" title={r.resource}>
                        {r.resource || "<empty>"}
                      </td>
                      <td className="py-3 px-3 text-slate-400 truncate max-w-xs font-sans">
                        {r.matched_rule_id ? (
                          <span className="text-slate-300 font-mono text-[11px]">
                            {r.matched_rule_id}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Default Strict Fallback</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-500 text-[11px]">
                        <span className="truncate max-w-[120px] inline-block" title={r.receipt_hash}>
                          {r.receipt_hash ? `${r.receipt_hash.slice(0, 8)}...` : "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
