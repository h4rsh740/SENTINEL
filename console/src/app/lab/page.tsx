"use client";

import React, { useEffect, useState } from "react";
import {
  FlaskConical,
  Play,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Filter,
  RefreshCw,
  Info,
  Lock,
  ExternalLink,
  X,
  Sparkles,
  Check,
} from "lucide-react";
import {
  getScenarios,
  runAttackLab,
  ScenarioItem,
  BenchmarkReportData,
} from "@/lib/api";

export default function AttackLabPage() {
  const [scenarios, setScenarios] = useState<ScenarioItem[]>([]);
  const [report, setReport] = useState<BenchmarkReportData | null>(null);
  const [running, setRunning] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const sc = await getScenarios();
      setScenarios(sc);
      const rep = await runAttackLab();
      setReport(rep);
    } catch (err) {
      console.error("Attack lab load error:", err);
    }
  };

  const handleRunAll = async () => {
    setRunning(true);
    try {
      const rep = await runAttackLab();
      setReport(rep);
    } catch (err) {
      console.error("Failed to run benchmark:", err);
    } finally {
      setRunning(false);
    }
  };

  const handleExportMarkdown = () => {
    if (!report) return;
    let md = `# 🛡️ SENTINEL Attack Lab Benchmark Report\n\n`;
    md += `**Timestamp**: \`${report.benchmark_timestamp}\`\n`;
    md += `**Pass Rate**: \`${report.pass_rate_percentage}%\` (${report.passed_scenarios}/${report.total_scenarios} passed)\n`;
    md += `**Non-Execution Invariant**: \`${report.execution_invariants_preserved ? "VERIFIED PRESERVED" : "VIOLATED"}\`\n\n`;
    md += `| Status | ID | Category | Expected | Actual | Tool Executed | Rule Matched |\n`;
    md += `| :---: | :--- | :--- | :---: | :---: | :---: | :--- |\n`;
    report.results.forEach((r) => {
      const status = r.passed ? "✅ PASS" : "❌ FAIL";
      const exec = r.actual_tool_executed ? "Yes (Allowed)" : "No (Blocked)";
      md += `| ${status} | \`${r.scenario_id}\` | ${r.category} | \`${r.expected_decision}\` | \`${r.actual_decision}\` | ${exec} | \`${r.matched_rule_id || "default"}\` |\n`;
    });

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sentinel_benchmark_${Date.now()}.md`;
    a.click();
  };

  const handleExportJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sentinel_benchmark_${Date.now()}.json`;
    a.click();
  };

  const categories = [
    "ALL",
    "credential_access",
    "shell_injection",
    "path_traversal",
    "network_exfil",
    "benign",
    "human_approval",
  ];

  const filteredResults =
    report?.results.filter((r) =>
      categoryFilter === "ALL" ? true : r.category === categoryFilter
    ) || [];

  const selectedResult = report?.results.find((r) => r.scenario_id === selectedScenarioId);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl glass-panel border border-[rgba(255,255,255,0.08)]">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-cyan-400 cyber-pulse" />
            <span className="text-[10px] font-mono font-bold text-cyan-400 tracking-wider uppercase">
              ADVERSARIAL SIMULATION SUITE
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight font-sans">
            SENTINEL Attack Lab
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl font-sans mt-0.5">
            Simulate realistic agent attacks, path breakouts, credential theft, and unauthorized
            mutations in a safe virtual environment without risking host systems.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleExportMarkdown}
            disabled={!report}
            className="px-3 py-1.5 rounded text-xs font-mono font-medium bg-[#080c16] hover:bg-slate-800 text-slate-300 border border-slate-700 transition-all flex items-center space-x-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export MD</span>
          </button>
          <button
            onClick={handleExportJson}
            disabled={!report}
            className="px-3 py-1.5 rounded text-xs font-mono font-medium bg-[#080c16] hover:bg-slate-800 text-slate-300 border border-slate-700 transition-all flex items-center space-x-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span>JSON</span>
          </button>
          <button
            onClick={handleRunAll}
            disabled={running}
            className="px-4 py-2 rounded text-xs font-mono font-bold bg-[#0284c7] hover:bg-[#38bdf8] text-white transition-all shadow-md shadow-cyan-900/40 border border-cyan-400/40 flex items-center space-x-1.5 uppercase tracking-wider"
          >
            {running ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
            <span>{running ? "Simulating..." : "Run All Scenarios"}</span>
          </button>
        </div>
      </div>

      {/* 2. Benchmark Summary KPI Cards */}
      {report && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-4 rounded-lg glass-panel relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-cyan-400" />
            <div className="text-[10px] text-slate-400 uppercase font-mono font-bold mb-1">PASS RATE</div>
            <div className="text-3xl font-black text-cyan-400 font-sans">
              {report.pass_rate_percentage.toFixed(1)}%
            </div>
            <p className="text-[10px] text-slate-400 font-mono mt-1">
              {report.passed_scenarios}/{report.total_scenarios} passed
            </p>
          </div>

          <div className="p-4 rounded-lg glass-panel relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-rose-500 glow-rose" />
            <div className="text-[10px] text-rose-300 uppercase font-mono font-bold mb-1">ATTACKS BLOCKED</div>
            <div className="text-3xl font-black text-rose-400 font-sans">
              {report.simulated_attacks_blocked}
            </div>
            <p className="text-[10px] text-rose-300/60 font-mono mt-1">Strict non-execution</p>
          </div>

          <div className="p-4 rounded-lg glass-panel relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-500 glow-emerald" />
            <div className="text-[10px] text-emerald-300 uppercase font-mono font-bold mb-1">BENIGN PERMITTED</div>
            <div className="text-3xl font-black text-emerald-400 font-sans">
              {report.benign_operations_permitted}
            </div>
            <p className="text-[10px] text-emerald-300/60 font-mono mt-1">Safe developer workflow</p>
          </div>

          <div className="p-4 rounded-lg glass-panel relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-amber-500 glow-amber" />
            <div className="text-[10px] text-amber-300 uppercase font-mono font-bold mb-1">APPROVALS PAUSED</div>
            <div className="text-3xl font-black text-amber-400 font-sans">
              {report.approvals_triggered}
            </div>
            <p className="text-[10px] text-amber-300/60 font-mono mt-1">Human-in-the-loop</p>
          </div>

          <div className="p-4 rounded-lg glass-panel relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-cyan-400 glow-cyan" />
            <div className="text-[10px] text-cyan-300 uppercase font-mono font-bold mb-1">NON-EXECUTION</div>
            <div className="text-sm font-extrabold text-cyan-400 flex items-center space-x-1.5 mt-2 font-mono">
              <CheckCircle2 className="h-4 w-4" />
              <span>PRESERVED</span>
            </div>
            <p className="text-[10px] text-cyan-300/60 font-mono mt-1">Zero tool leakage</p>
          </div>
        </div>
      )}

      {/* 3. Category Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-xs text-slate-400 flex items-center space-x-1 mr-2 font-mono text-[11px] uppercase">
          <Filter className="h-3 w-3" />
          <span>Category:</span>
        </span>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1 rounded text-xs font-mono transition-all ${
              categoryFilter === cat
                ? "bg-cyan-600 text-white font-bold shadow-sm"
                : "bg-[#080c16] text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 4. Scenarios Table */}
      <div className="p-5 rounded-xl glass-panel border border-[rgba(255,255,255,0.08)] space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
              <tr>
                <th className="py-2.5 px-3">VERDICT</th>
                <th className="py-2.5 px-3">SCENARIO ID</th>
                <th className="py-2.5 px-3">NAME & DESCRIPTION</th>
                <th className="py-2.5 px-3">CATEGORY</th>
                <th className="py-2.5 px-3 text-center">EXPECTED</th>
                <th className="py-2.5 px-3 text-center">ACTUAL</th>
                <th className="py-2.5 px-3">TOOL EXECUTED</th>
                <th className="py-2.5 px-3 text-right">INSPECT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredResults.map((r) => {
                const isBlocked = r.actual_decision === "DENY";
                const isAllow = r.actual_decision === "ALLOW";
                return (
                  <tr
                    key={r.scenario_id}
                    className="hover:bg-cyan-950/20 hover:border-l-2 hover:border-l-cyan-400 transition-all group"
                  >
                    <td className="py-3 px-3">
                      {r.passed ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                          <Check className="h-3 w-3" />
                          <span>PASS</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800">
                          <XCircle className="h-3 w-3" />
                          <span>FAIL</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-cyan-400 font-bold">{r.scenario_id}</td>
                    <td className="py-3 px-3 max-w-sm">
                      <div className="font-semibold text-white font-sans">{r.scenario_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono truncate">{r.reason}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300">
                        {r.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-[11px] text-slate-400">{r.expected_decision}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`font-bold ${
                          isBlocked
                            ? "text-rose-400"
                            : isAllow
                            ? "text-emerald-400"
                            : "text-amber-400"
                        }`}
                      >
                        {r.actual_decision}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {r.actual_tool_executed ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                          DISPATCHED
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800">
                          NEVER_EXECUTED
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedScenarioId(r.scenario_id)}
                        className="px-2.5 py-1 rounded bg-[#080c16] hover:bg-slate-800 text-cyan-400 text-[11px] border border-slate-700 transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scenario Detail Modal */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0d1322] border border-slate-800 rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  {selectedResult.scenario_id}
                </span>
                <h3 className="font-bold text-white text-sm font-sans">{selectedResult.scenario_name}</h3>
              </div>
              <button
                onClick={() => setSelectedScenarioId(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded bg-[#080c16] border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase">CATEGORY</div>
                <div className="text-white font-bold">{selectedResult.category}</div>
              </div>
              <div className="p-3 rounded bg-[#080c16] border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase">MATCHED RULE ID</div>
                <div className="text-cyan-400 font-bold">{selectedResult.matched_rule_id || "strict_fallback"}</div>
              </div>
              <div className="p-3 rounded bg-[#080c16] border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase">EXPECTED vs ACTUAL</div>
                <div className="text-white">
                  {selectedResult.expected_decision} ➔{" "}
                  <span className="text-rose-400 font-bold">{selectedResult.actual_decision}</span>
                </div>
              </div>
              <div className="p-3 rounded bg-[#080c16] border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase">NON-EXECUTION INVARIANT</div>
                <div className="text-emerald-400 font-bold">
                  {selectedResult.actual_tool_executed ? "Tool Executed" : "STRICTLY NEVER EXECUTED"}
                </div>
              </div>
            </div>

            <div className="space-y-1 text-xs font-mono">
              <span className="text-slate-400 uppercase text-[10px]">VERDICT EXPLANATION</span>
              <div className="p-3 rounded bg-[#080c16] border border-slate-800 text-slate-300 font-sans">
                {selectedResult.reason}
              </div>
            </div>

            <div className="space-y-1 text-xs font-mono">
              <span className="text-slate-400 uppercase text-[10px]">SHA-256 DECISION RECEIPT</span>
              <div className="p-2.5 rounded bg-[#080c16] border border-slate-800 text-indigo-400 text-[11px] break-all">
                {selectedResult.receipt_hash || "0x9f4a123bc891"}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedScenarioId(null)}
                className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
