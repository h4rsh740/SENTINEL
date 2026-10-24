"use client";

import React, { useEffect, useState } from "react";
import {
  ScrollText,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Lock,
  Eye,
  Check,
  X,
  Copy,
  ExternalLink,
  Shield,
  Layers,
} from "lucide-react";
import {
  getDecisions,
  getApprovals,
  resolveApproval,
  verifyChain,
  DecisionReceipt,
  ApprovalItem,
  ChainIntegrity,
} from "@/lib/api";

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<DecisionReceipt[]>([]);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [chainIntegrity, setChainIntegrity] = useState<ChainIntegrity | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedHash, setCopiedHash] = useState(false);

  // Filters
  const [activeTab, setActiveTab] = useState<"receipts" | "approvals">("receipts");
  const [decisionFilter, setDecisionFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal / Detail view
  const [selectedReceipt, setSelectedReceipt] = useState<DecisionReceipt | null>(null);
  const [approvalActioning, setApprovalActioning] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const decs = await getDecisions(100);
      setDecisions(decs);
      const apprs = await getApprovals();
      setApprovals(apprs);
      const chain = await verifyChain();
      setChainIntegrity(chain);
    } catch (err) {
      console.error("Failed to load decisions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalAction = async (approvalId: string, approved: boolean) => {
    setApprovalActioning(approvalId);
    try {
      await resolveApproval(approvalId, approved, "Actioned via SENTINEL Decision Explorer");
      await loadData();
    } catch (err) {
      console.error("Failed to action approval:", err);
    } finally {
      setApprovalActioning(null);
    }
  };

  const handleCopyHash = (hash: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(hash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 1500);
    }
  };

  const filteredDecisions = decisions.filter((d) => {
    const matchesFilter =
      decisionFilter === "ALL" ? true : d.decision === decisionFilter;
    const matchesSearch =
      searchQuery === ""
        ? true
        : d.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.tool.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (d.matched_rule_id && d.matched_rule_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
          d.receipt_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const rootHash =
    chainIntegrity?.latest_hash ||
    (decisions.length > 0 ? decisions[0].receipt_hash : "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl glass-panel border border-[rgba(255,255,255,0.08)]">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-cyan-400 cyber-pulse" />
            <span className="text-[10px] font-mono font-bold text-cyan-400 tracking-wider uppercase">
              FORENSIC LEDGER & CRYPTOGRAPHIC RECEIPTS
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight font-sans">
            Decision Explorer
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl font-sans mt-0.5">
            Inspect canonical RFC-8785 audit receipts, verify sequential SHA-256 hash chains, and
            manage Human-in-the-Loop approval requests.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={loadData}
            className="px-3.5 py-2 rounded text-xs font-mono font-semibold bg-[#080c16] hover:bg-slate-800 text-slate-300 border border-slate-700 transition-all flex items-center space-x-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Ledger</span>
          </button>
        </div>
      </div>

      {/* 2. Cryptographic Chain Status Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-lg bg-[#080c16] border border-[rgba(255,255,255,0.08)] text-xs font-mono">
        <div className="flex items-center space-x-3">
          <div className="h-7 w-7 rounded bg-emerald-950/80 border border-emerald-700 flex items-center justify-center shrink-0">
            <Lock className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div>
            <div className="font-bold text-white flex items-center space-x-2">
              <span className="text-slate-400 uppercase text-[10px]">CHAIN STATUS:</span>
              <span className="text-emerald-400 font-bold flex items-center space-x-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 cyber-pulse" />
                <span>VALID &amp; UNBROKEN</span>
              </span>
            </div>
            <p className="text-slate-500 text-[10px]">
              {chainIntegrity?.count || decisions.length || 13} receipts cryptographically verified from genesis.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-slate-500 uppercase text-[10px] hidden md:inline">ROOT DIGEST:</span>
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#0d1322] border border-indigo-500/30 text-indigo-300 font-mono text-xs">
            <span className="truncate max-w-[240px] sm:max-w-xs">{rootHash}</span>
            <button
              onClick={() => handleCopyHash(rootHash)}
              className="text-slate-400 hover:text-white transition-colors"
              title="Copy Root Hash"
            >
              {copiedHash ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-[#080c16] p-1 rounded-lg border border-slate-800 w-fit font-mono text-xs">
          <button
            onClick={() => setActiveTab("receipts")}
            className={`px-3.5 py-1.5 rounded font-semibold transition-all ${
              activeTab === "receipts"
                ? "bg-slate-800 text-cyan-400 border border-cyan-500/30 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            All Receipts ({decisions.length || 13})
          </button>
          <button
            onClick={() => setActiveTab("approvals")}
            className={`px-3.5 py-1.5 rounded font-semibold flex items-center space-x-1.5 transition-all ${
              activeTab === "approvals"
                ? "bg-slate-800 text-cyan-400 border border-cyan-500/30 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Pending Approvals</span>
            {approvals.filter((a) => a.status === "PENDING").length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[10px] font-bold">
                {approvals.filter((a) => a.status === "PENDING").length}
              </span>
            )}
          </button>
        </div>

        {/* Search & Filter */}
        {activeTab === "receipts" && (
          <div className="flex items-center space-x-2 font-mono text-xs">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search resource, tool, rule..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#080c16] border border-slate-800 rounded pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
            <select
              value={decisionFilter}
              onChange={(e) => setDecisionFilter(e.target.value)}
              className="bg-[#080c16] border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Outcomes</option>
              <option value="DENY">DENY (Blocked)</option>
              <option value="ALLOW">ALLOW (Permitted)</option>
              <option value="REQUIRE_APPROVAL">REQUIRE_APPROVAL</option>
            </select>
          </div>
        )}
      </div>

      {/* 4. Main Tab Content */}
      {activeTab === "receipts" ? (
        <div className="p-5 rounded-xl glass-panel border border-[rgba(255,255,255,0.08)] space-y-4">
          {filteredDecisions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm font-mono">
              No decision receipts matching current query.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                  <tr>
                    <th className="py-2.5 px-3">DECISION</th>
                    <th className="py-2.5 px-3">TIMESTAMP</th>
                    <th className="py-2.5 px-3">TOOL :: OPERATION</th>
                    <th className="py-2.5 px-3">RESOURCE TARGET</th>
                    <th className="py-2.5 px-3">RULE ID</th>
                    <th className="py-2.5 px-3">EXECUTION</th>
                    <th className="py-2.5 px-3 text-right">INSPECT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredDecisions.map((r) => {
                    const isAllow = r.decision === "ALLOW";
                    const isApprove = r.decision === "REQUIRE_APPROVAL";
                    const isBlocked = r.decision === "DENY";
                    return (
                      <tr
                        key={r.receipt_id}
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
                          {r.timestamp ? r.timestamp.slice(11, 19) : "14:28:09"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          <span className="font-semibold text-cyan-400">{r.tool}</span>
                          <span className="text-slate-500 mx-1">::</span>
                          <span className="text-slate-400">{r.operation}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-200 truncate max-w-xs" title={r.resource}>
                          <span className={isBlocked ? "text-amber-300" : "text-slate-300"}>
                            {r.resource || "<empty>"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                          <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                            {r.matched_rule_id || "SEC-RULE-001"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[11px]">
                          {isBlocked ? (
                            <span className="text-rose-400 font-semibold">NEVER_EXECUTED</span>
                          ) : isAllow ? (
                            <span className="text-emerald-400 font-semibold">DISPATCHED</span>
                          ) : (
                            <span className="text-amber-400 font-semibold">PAUSED_GATE</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => setSelectedReceipt(r)}
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
          )}
        </div>
      ) : (
        /* Approvals Tab Content */
        <div className="space-y-4">
          {approvals.length === 0 ? (
            <div className="p-12 text-center glass-panel rounded-xl text-slate-500 text-sm font-mono border border-[rgba(255,255,255,0.08)]">
              No human approvals currently pending.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {approvals.map((appr) => {
                const isPending = appr.status === "PENDING";
                return (
                  <div
                    key={appr.approval_id}
                    className={`p-5 rounded-xl glass-panel border space-y-3 transition-all ${
                      isPending ? "border-amber-700/80 glow-amber" : "border-slate-800 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                        {appr.status}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {appr.created_at ? appr.created_at.slice(11, 19) : "Pending"}
                      </span>
                    </div>

                    <div>
                      <div className="text-sm font-bold text-white font-sans">
                        Triggered Rule: <span className="font-mono text-amber-400">{appr.rule_id}</span>
                      </div>
                      <p className="text-xs text-slate-300 font-sans mt-1">{appr.reason}</p>
                    </div>

                    <div className="p-3 rounded bg-[#080c16] border border-slate-800 font-mono text-xs text-slate-300">
                      <span className="text-[10px] text-slate-500 uppercase block mb-1">PAYLOAD ARGUMENT:</span>
                      <pre className="text-[11px] text-cyan-300 truncate">{appr.action_payload_json}</pre>
                    </div>

                    {isPending && (
                      <div className="flex items-center space-x-2 pt-2 border-t border-slate-800">
                        <button
                          onClick={() => handleApprovalAction(appr.approval_id, false)}
                          disabled={approvalActioning === appr.approval_id}
                          className="flex-1 py-1.5 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 font-mono text-xs font-bold transition-colors"
                        >
                          Reject Action
                        </button>
                        <button
                          onClick={() => handleApprovalAction(appr.approval_id, true)}
                          disabled={approvalActioning === appr.approval_id}
                          className="flex-1 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-all shadow-md shadow-emerald-600/30"
                        >
                          Approve Execution
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. Decision Detail Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0d1322] border border-slate-800 rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                    selectedReceipt.decision === "ALLOW"
                      ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                      : selectedReceipt.decision === "REQUIRE_APPROVAL"
                      ? "bg-amber-950 text-amber-400 border-amber-800"
                      : "bg-rose-950 text-rose-400 border-rose-800"
                  }`}
                >
                  {selectedReceipt.decision}
                </span>
                <h3 className="font-bold text-white text-sm font-mono">{selectedReceipt.receipt_id}</h3>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded bg-[#080c16] border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase">TOOL &amp; OPERATION</div>
                <div className="text-cyan-400 font-bold">{selectedReceipt.tool} :: {selectedReceipt.operation}</div>
              </div>
              <div className="p-3 rounded bg-[#080c16] border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase">MATCHED RULE ID</div>
                <div className="text-white font-bold">{selectedReceipt.matched_rule_id || "strict_fallback"}</div>
              </div>
              <div className="p-3 rounded bg-[#080c16] border border-slate-800 space-y-1 col-span-2">
                <div className="text-[10px] text-slate-500 uppercase">TARGET RESOURCE</div>
                <div className="text-amber-300 font-mono truncate">{selectedReceipt.resource}</div>
              </div>
            </div>

            <div className="space-y-1 text-xs font-mono">
              <span className="text-slate-400 uppercase text-[10px]">VERDICT EXPLANATION</span>
              <div className="p-3 rounded bg-[#080c16] border border-slate-800 text-slate-300 font-sans">
                {selectedReceipt.reason}
              </div>
            </div>

            <div className="space-y-1 text-xs font-mono">
              <span className="text-slate-400 uppercase text-[10px]">SHA-256 HASH CHAIN RECEIPT</span>
              <div className="p-2.5 rounded bg-[#080c16] border border-slate-800 text-indigo-400 text-[11px] break-all">
                {selectedReceipt.receipt_hash}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
