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
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [savedKey, setSavedKey] = useState("");
  const [inputKey, setInputKey] = useState("");
  const [savedFeedback, setSavedFeedback] = useState(false);

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
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand */}
            <div className="flex items-center space-x-3">
              <a href="/" className="flex items-center space-x-3 group">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-xl tracking-tight text-white">
                      SENTINEL
                    </span>
                    <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
                      Firewall
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
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
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-slate-800 text-cyan-400 border border-slate-700/80 shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </a>
                );
              })}
            </nav>

            {/* Status & Key Badges */}
            <div className="flex items-center space-x-2">
              {/* BharatCode API Key Button */}
              <button
                onClick={() => setApiKeyModalOpen(true)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  savedKey
                    ? "bg-orange-950/60 border-orange-800/80 text-orange-400 hover:bg-orange-900/40"
                    : "bg-slate-900 border-slate-700 text-slate-300 hover:border-orange-500/50"
                }`}
                title="Configure BharatCode API Key"
              >
                <Key className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {savedKey ? "BharatCode Key: Active" : "Add BharatCode Key"}
                </span>
                {savedKey && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
              </button>

              <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-xs font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Chain: Valid</span>
              </div>
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono">
                <Lock className="h-3.5 w-3.5 text-cyan-400" />
                <span>Zero-LLM Core</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* BharatCode API Key Modal */}
      {apiKeyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b101d] border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
                  <Key className="h-4 w-4 text-orange-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">BharatCode API Key</h3>
                  <p className="text-[11px] text-slate-400">Advisory Policy Drafting</p>
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
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-orange-500"
              />
              <p className="text-[10px] text-slate-500">
                Saved only in your browser local storage. Never sent to any external server other than official BharatCode API.
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
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs flex items-center space-x-1 shadow-md shadow-orange-600/20"
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
