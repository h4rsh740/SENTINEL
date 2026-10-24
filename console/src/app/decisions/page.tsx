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
  Clock,
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

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl glass-panel border border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <ScrollText className="h-4 w-4" />
            <span>Forensic Ledger & Receipts</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Decision Explorer
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl">
            Inspect canonical RFC-8785 audit receipts, verify sequential SHA-256 hash chains, and
            manage Human-in-the-Loop approval requests.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadData}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Ledger</span>
          </button>
        </div>
      </div>

      {/* Chain Integrity Status Card */}
      <div className="p-4 rounded-xl glass-panel border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-lg bg-emerald-950 flex items-center justify-center border border-emerald-800 text-emerald-400">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <div className="font-bold text-white flex items-center space-x-2">
              <span>Cryptographic Chain Status:</span>
              <span className="text-emerald-400">
                {chainIntegrity?.valid ? "VALID & UNBROKEN" : "INTEGRITY FAULT"}
              </span>
            </div>
            <p className="text-slate-400 font-mono text-[11px]">
              {chainIntegrity?.count || decisions.length} receipts verified from genesis.
            </p>
          </div>
        </div>
        <div className="font-mono text-[11px] text-slate-400 truncate max-w-md bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
          Root Digest: {chainIntegrity?.latest_hash || "GENESIS_SENTINEL_CHAIN_V1"}
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 w-fit">
          <button
            onClick={() => setActiveTab("receipts")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "receipts"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All Receipts ({decisions.length})
          </button>
          <button
            onClick={() => setActiveTab("approvals")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              activeTab === "approvals"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
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
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search resource or rule..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
              />
            </div>
            <select
              value={decisionFilter}
              onChange={(e) => setDecisionFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Outcomes</option>
              <option value="DENY">DENY (Blocked)</option>
              <option value="ALLOW">ALLOW (Permitted)</option>
              <option value="REQUIRE_APPROVAL">REQUIRE_APPROVAL</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      {activeTab === "receipts" ? (
        <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
          {filteredDecisions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No decision receipts matching current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Decision</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Tool :: Operation</th>
                    <th className="py-2.5 px-3">Resource Target</th>
                    <th className="py-2.5 px-3">Rule ID</th>
                    <th className="py-2.5 px-3">Execution</th>
                    <th className="py-2.5 px-3 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredDecisions.map((r) => {
                    const isAllow = r.decision === "ALLOW";
                    const isApprove = r.decision === "REQUIRE_APPROVAL";
                    return (
                      <tr key={r.receipt_id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                              isAllow
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                : isApprove
                                ? "bg-amber-950 text-amber-400 border border-amber-800"
                                : "bg-rose-950 text-rose-400 border border-rose-800"
                            }`}
                          >
                            {r.decision}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-400 text-[11px]">
                          {r.timestamp ? r.timestamp.slice(11, 19) : "N/A"}
                        </td>
                        <td className="py-3 px-3 text-slate-300 font-sans">
                          <span className="font-semibold text-cyan-400 font-mono">{r.tool}</span>
                          <span className="text-slate-500 mx-1">::</span>
                          <span className="text-slate-400 font-mono">{r.operation}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-200 truncate max-w-xs" title={r.resource}>
                          {r.resource || "<empty>"}
                        </td>
                        <td className="py-3 px-3 text-slate-400 truncate max-w-xs font-sans">
                          {r.matched_rule_id ? (
                            <span className="font-mono text-slate-300 text-[11px]">
                              {r.matched_rule_id}
                            </span>
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">Default Fallback</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-[11px]">
                          {r.execution_outcome ? (
                            <span className="text-slate-300">{r.execution_outcome}</span>
                          ) : isAllow ? (
                            <span className="text-emerald-400">SUCCESS</span>
                          ) : (
                            <span className="text-rose-400">BLOCKED</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => setSelectedReceipt(r)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                            title="Inspect full receipt"
                          >
                            <Eye className="h-3.5 w-3.5" />
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
        /* Approvals Tab */
        <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
          {approvals.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No approval requests in the queue.
            </div>
          ) : (
            <div className="space-y-3">
              {approvals.map((appr) => {
                const isPending = appr.status === "PENDING";
                return (
                  <div
                    key={appr.approval_id}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-cyan-400">
                          {appr.approval_id}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isPending
                              ? "bg-amber-950 text-amber-400 border border-amber-800"
                              : appr.status === "APPROVED"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : "bg-rose-950 text-rose-400 border border-rose-800"
                          }`}
                        >
                          {appr.status}
                        </span>
                        <span className="text-slate-500 font-mono text-[11px]">
                          Rule: {appr.rule_id}
                        </span>
                      </div>
                      <p className="text-slate-300 font-sans">{appr.reason}</p>
                      <div className="text-[11px] text-slate-500 font-mono truncate max-w-lg">
                        Payload: {appr.action_payload_json}
                      </div>
                    </div>

                    {isPending && (
                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={() => handleApprovalAction(appr.approval_id, true)}
                          disabled={approvalActioning === appr.approval_id}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center space-x-1"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleApprovalAction(appr.approval_id, false)}
                          disabled={approvalActioning === appr.approval_id}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center space-x-1"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Reject</span>
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

      {/* Selected Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b101d] border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Decision Receipt Forensic Detail</h3>
                <p className="text-xs font-mono text-cyan-400">{selectedReceipt.receipt_id}</p>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-black/40 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Decision</span>
                <span className="font-bold text-white text-sm">{selectedReceipt.decision}</span>
              </div>
              <div className="p-3 rounded-lg bg-black/40 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Explanation Code</span>
                <span className="text-cyan-400">{selectedReceipt.explanation_code}</span>
              </div>
              <div className="p-3 rounded-lg bg-black/40 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Action ID</span>
                <span className="text-slate-300">{selectedReceipt.action_id}</span>
              </div>
              <div className="p-3 rounded-lg bg-black/40 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Matched Rule</span>
                <span className="text-slate-300">{selectedReceipt.matched_rule_id || "None"}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-black/50 border border-slate-800 text-xs">
              <span className="text-slate-500 font-mono text-[10px] block mb-1">Reason</span>
              <p className="text-slate-200">{selectedReceipt.reason}</p>
            </div>

            <div className="p-3 rounded-lg bg-black/60 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-2 break-all">
              <div>
                <span className="text-slate-500 block text-[10px]">Current Receipt Hash (SHA-256)</span>
                <span className="text-emerald-400">{selectedReceipt.receipt_hash}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Previous Receipt Hash (Link)</span>
                <span className="text-slate-400">
                  {selectedReceipt.previous_receipt_hash || "GENESIS_SENTINEL_CHAIN_V1"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
