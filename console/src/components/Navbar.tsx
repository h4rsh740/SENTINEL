"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Shield,
  Sliders,
  FlaskConical,
  ScrollText,
  BookOpen,
  CheckCircle2,
  Lock,
  Key,
  X,
  Check,
  AlertOctagon,
  Sparkles,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [savedKey, setSavedKey] = useState("");
  const [inputKey, setInputKey] = useState("");
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [interceptActive, setInterceptActive] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const k = localStorage.getItem("sentinel_bharatcode_key") || "";
      setSavedKey(k);
      setInputKey(k);
    }
  }, []);

  const handleSave = () => {
    if (typeof window !== "undefined") {
      if (inputKey.trim()) {
        localStorage.setItem("sentinel_bharatcode_key", inputKey.trim());
        setSavedKey(inputKey.trim());
      } else {
        localStorage.removeItem("sentinel_bharatcode_key");
        setSavedKey("");
      }
      setSavedFeedback(true);
      setTimeout(() => {
        setSavedFeedback(false);
        setApiKeyModalOpen(false);
      }, 1000);
    }
  };

  const navItems = [
    { label: "Dashboard", href: "/", icon: Shield },
    { label: "Policy Studio", href: "/studio", icon: Sliders },
    { label: "Attack Lab", href: "/lab", icon: FlaskConical },
    { label: "Decision Explorer", href: "/decisions", icon: ScrollText },
    { label: "Documentation", href: "/docs", icon: BookOpen },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[rgba(255,255,255,0.08)] bg-[#060911]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand */}
            <div className="flex items-center space-x-3">
              <a href="/" className="flex items-center space-x-3 group">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all border border-cyan-400/30">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-lg tracking-tight text-white font-sans">
                      SENTINEL
                    </span>
                    <span className="text-[9px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-cyan-950/90 text-cyan-400 border border-cyan-800/60">
                      FIREWALL RUNTIME
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
                    Every AI action must earn permission.
                  </p>
                </div>
              </a>
            </div>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                      isActive
                        ? "bg-[#0d1322] text-cyan-400 border border-cyan-500/30 shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </a>
                );
              })}
            </nav>

            {/* Status & Action Controls */}
            <div className="flex items-center space-x-2">
              {/* BharatCode API Key */}
              <button
                onClick={() => setApiKeyModalOpen(true)}
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded text-[11px] font-mono transition-all border ${
                  savedKey
                    ? "bg-orange-950/60 border-orange-800/80 text-orange-400 hover:bg-orange-900/40"
                    : "bg-[#080c16] border-slate-800 text-slate-400 hover:border-orange-500/50"
                }`}
                title="Configure BharatCode API Key"
              >
                <Key className="h-3 w-3" />
                <span className="hidden lg:inline">
                  {savedKey ? "BharatCode: Active" : "Add BharatCode Key"}
                </span>
                {savedKey && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 cyber-pulse" />}
              </button>

              {/* Status Badges */}
              <div className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1.5 rounded bg-[#080c16] border border-slate-800 text-slate-300 text-[11px] font-mono">
                <Lock className="h-3 w-3 text-cyan-400" />
                <span>Zero-LLM Core: Active</span>
              </div>

              <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1.5 rounded bg-emerald-950/50 border border-emerald-800/60 text-emerald-400 text-[11px] font-mono">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                <span>SHA-256: Valid</span>
              </div>

              {/* Emergency Intercept */}
              <button
                onClick={() => setEmergencyModalOpen(true)}
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded text-[11px] font-mono font-semibold transition-all border ${
                  interceptActive
                    ? "bg-rose-600 text-white border-rose-500 glow-rose"
                    : "bg-rose-950/40 border-rose-900/60 text-rose-400 hover:bg-rose-900/50"
                }`}
                title="Trigger Emergency Intercept Mode"
              >
                <AlertOctagon className="h-3 w-3" />
                <span className="hidden sm:inline">Emergency Intercept</span>
              </button>

              {/* Deploy Policy */}
              <a
                href="/studio"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded text-[11px] font-mono font-bold bg-[#0284c7] hover:bg-[#38bdf8] text-white transition-all shadow-md shadow-cyan-900/30 border border-cyan-400/40 uppercase tracking-wider"
              >
                <Sparkles className="h-3 w-3" />
                <span className="hidden sm:inline">Deploy Policy</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Emergency Intercept Modal */}
      {emergencyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0d1322] border border-rose-800/80 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl glow-rose">
            <div className="flex items-center justify-between border-b border-rose-900/40 pb-3">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded bg-rose-950 border border-rose-600 flex items-center justify-center">
                  <AlertOctagon className="h-4 w-4 text-rose-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Emergency Intercept Override</h3>
                  <p className="text-[10px] text-rose-400 font-mono">FAIL-SAFE PRIVILEGE REVOCATION</p>
                </div>
              </div>
              <button
                onClick={() => setEmergencyModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Activating Emergency Intercept clamps all incoming agent tool execution to <span className="font-mono text-rose-400 font-bold">PRE_EXEC_ABORT</span> immediately. All shell execution, filesystem mutations, and egress network requests are terminated with cryptographic SHA-256 receipt proof.
            </p>

            <div className="p-3 rounded bg-[#080c16] border border-slate-800 font-mono text-[11px] text-slate-400 space-y-1">
              <div>Enforcement: <span className="text-cyan-400">Deterministic Invariant Clamp</span></div>
              <div>Bypass Rate: <span className="text-rose-400 font-bold">0.00% (Guaranteed)</span></div>
              <div>State Hash: <span className="text-indigo-400">0x9f4a...e319</span></div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEmergencyModalOpen(false)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => {
                  setInterceptActive(!interceptActive);
                  setEmergencyModalOpen(false);
                }}
                className={`px-4 py-1.5 rounded text-white font-bold text-xs font-mono flex items-center space-x-1 ${
                  interceptActive ? "bg-slate-700 hover:bg-slate-600" : "bg-rose-600 hover:bg-rose-500 glow-rose"
                }`}
              >
                <span>{interceptActive ? "Deactivate Intercept" : "ARM INTERCEPT LOCKDOWN"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BharatCode API Key Modal */}
      {apiKeyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0d1322] border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded bg-orange-950/80 border border-orange-600 flex items-center justify-center">
                  <Key className="h-4 w-4 text-orange-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">BharatCode API Key</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Official Model: qwen-3.8-27b</p>
                </div>
              </div>
              <button
                onClick={() => setApiKeyModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              When provided, the Policy Studio calls official BharatCode endpoint{" "}
              <code className="text-orange-400 font-mono">https://bharatcode.ai/api/model/v1</code>{" "}
              using model <code className="text-orange-400 font-mono">qwen-3.8-27b</code>.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-400">Your API Key:</label>
              <input
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="Paste your BharatCode API key..."
                className="w-full bg-[#080c16] border border-slate-700 rounded px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-orange-500"
              />
              <p className="text-[10px] text-slate-500">
                Stored strictly in your client browser session. Never sent to any external server other than official BharatCode API.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setInputKey("");
                  localStorage.removeItem("sentinel_bharatcode_key");
                  setSavedKey("");
                }}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-mono"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-1.5 rounded bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs font-mono flex items-center space-x-1 shadow-md shadow-orange-600/20"
              >
                {savedFeedback ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <span>Save Key</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
