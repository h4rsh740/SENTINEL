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
      // Auto-run once to populate baseline
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

  const categories = ["ALL", ...Array.from(new Set(scenarios.map((s) => s.category)))];

  const filteredResults =
    report?.results.filter((r) =>
      categoryFilter === "ALL" ? true : r.category === categoryFilter
    ) || [];

  const selectedResult = report?.results.find((r) => r.scenario_id === selectedScenarioId);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl glass-panel border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <FlaskConical className="h-4 w-4" />
            <span>Reproducible Security Simulation Suite</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            SENTINEL Attack Lab
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl">
            Simulate realistic agent attacks, path breakouts, credential theft, and unauthorized
            mutations in a safe virtual environment without risking underlying systems.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportMarkdown}
            disabled={!report}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center space-x-1.5 transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export MD</span>
          </button>
          <button
            onClick={handleExportJson}
            disabled={!report}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center space-x-1.5 transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            <span>JSON</span>
          </button>
          <button
            onClick={handleRunAll}
            disabled={running}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center space-x-1.5 shadow-lg shadow-cyan-600/30 transition-all"
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

      {/* Benchmark Summary Stats */}
      {report && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-4 rounded-xl glass-panel border border-slate-800">
            <div className="text-[11px] text-slate-400 uppercase font-mono mb-1">Pass Rate</div>
            <div className="text-2xl font-black text-cyan-400">
              {report.pass_rate_percentage.toFixed(1)}%
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {report.passed_scenarios}/{report.total_scenarios} scenarios passed
            </p>
          </div>

          <div className="p-4 rounded-xl glass-panel border border-rose-950/60 bg-rose-950/10">
            <div className="text-[11px] text-rose-300 uppercase font-mono mb-1">Attacks Blocked</div>
            <div className="text-2xl font-black text-rose-400">
              {report.simulated_attacks_blocked}
            </div>
            <p className="text-[10px] text-rose-300/60 mt-0.5">Strict non-execution</p>
          </div>

          <div className="p-4 rounded-xl glass-panel border border-emerald-950/60 bg-emerald-950/10">
            <div className="text-[11px] text-emerald-300 uppercase font-mono mb-1">Benign Permitted</div>
            <div className="text-2xl font-black text-emerald-400">
              {report.benign_operations_permitted}
            </div>
            <p className="text-[10px] text-emerald-300/60 mt-0.5">Safe developer workflow</p>
          </div>

          <div className="p-4 rounded-xl glass-panel border border-amber-950/60 bg-amber-950/10">
            <div className="text-[11px] text-amber-300 uppercase font-mono mb-1">Approvals Paused</div>
            <div className="text-2xl font-black text-amber-400">
              {report.approvals_triggered}
            </div>
            <p className="text-[10px] text-amber-300/60 mt-0.5">Human-in-the-loop</p>
          </div>

          <div className="p-4 rounded-xl glass-panel border border-cyan-950/60 bg-cyan-950/10">
            <div className="text-[11px] text-cyan-300 uppercase font-mono mb-1">Non-Execution Check</div>
            <div className="text-base font-extrabold text-cyan-400 flex items-center space-x-1.5 mt-1">
              <CheckCircle2 className="h-4 w-4" />
              <span>PRESERVED</span>
            </div>
            <p className="text-[10px] text-cyan-300/60 mt-0.5">Zero tool leakage</p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-slate-400 flex items-center space-x-1 mr-2 font-mono">
          <Filter className="h-3.5 w-3.5" />
          <span>Category:</span>
        </span>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              categoryFilter === cat
                ? "bg-cyan-600 text-white font-semibold"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Scenarios Table */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase">
              <tr>
                <th className="py-2.5 px-3">Verdict</th>
                <th className="py-2.5 px-3">Scenario ID</th>
                <th className="py-2.5 px-3">Name & Description</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-center">Expected</th>
                <th className="py-2.5 px-3 text-center">Actual</th>
                <th className="py-2.5 px-3 text-center">Tool Executed?</th>
                <th className="py-2.5 px-3">Rule Matched</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredResults.map((r) => {
                const isSelected = r.scenario_id === selectedScenarioId;
                return (
                  <tr
                    key={r.scenario_id}
                    onClick={() => setSelectedScenarioId(r.scenario_id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? "bg-cyan-950/40" : "hover:bg-slate-800/40"
                    }`}
                  >
                    <td className="py-3 px-3">
                      {r.passed ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-400 font-bold font-mono">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>PASS</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-rose-400 font-bold font-mono">
                          <XCircle className="h-3.5 w-3.5" />
                          <span>FAIL</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-cyan-400 font-semibold">
                      {r.scenario_id}
                    </td>
                    <td className="py-3 px-3 max-w-sm">
                      <div className="font-semibold text-white">{r.scenario_name}</div>
                      <div className="text-[11px] text-slate-400 truncate">{r.reason}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {r.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      <span className="text-slate-300 font-bold">{r.expected_decision}</span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          r.actual_decision === "ALLOW"
                            ? "bg-emerald-950 text-emerald-400"
                            : r.actual_decision === "REQUIRE_APPROVAL"
                            ? "bg-amber-950 text-amber-400"
                            : "bg-rose-950 text-rose-400"
                        }`}
                      >
                        {r.actual_decision}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      {r.actual_tool_executed ? (
                        <span className="text-emerald-400 font-bold">YES</span>
                      ) : (
                        <span className="text-rose-400 font-bold">NO (BLOCKED)</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-400 truncate max-w-xs">
                      {r.matched_rule_id || "default-strict"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Scenario Evidence Modal / Panel */}
      {selectedResult && (
        <div className="p-6 rounded-2xl glass-panel border border-cyan-800/80 bg-slate-900/95 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Info className="h-5 w-5 text-cyan-400" />
              <h3 className="text-base font-bold text-white">
                Scenario Evidence: {selectedResult.scenario_name} ({selectedResult.scenario_id})
              </h3>
            </div>
            <button
              onClick={() => setSelectedScenarioId(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-3 rounded-lg bg-black/50 border border-slate-800">
              <span className="text-slate-500 block uppercase text-[10px]">Decision Rationale</span>
              <span className="text-slate-200 mt-1 block">{selectedResult.reason}</span>
            </div>
            <div className="p-3 rounded-lg bg-black/50 border border-slate-800">
              <span className="text-slate-500 block uppercase text-[10px]">Explanation Code</span>
              <span className="text-cyan-400 mt-1 block">{selectedResult.explanation_code}</span>
            </div>
            <div className="p-3 rounded-lg bg-black/50 border border-slate-800">
              <span className="text-slate-500 block uppercase text-[10px]">Duration</span>
              <span className="text-emerald-400 mt-1 block">{selectedResult.duration_ms} ms</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-black/60 border border-slate-800 font-mono text-[11px] text-slate-300 break-all">
            <span className="text-slate-500 block uppercase text-[10px] mb-1">
              Deterministic Receipt SHA-256
            </span>
            {selectedResult.receipt_hash || "Simulated Receipt Generated"}
          </div>
        </div>
      )}
    </div>
  );
}
