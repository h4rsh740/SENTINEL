import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "SENTINEL — Open-Source AI Agent Firewall",
  description:
    "Deterministic policy enforcement engine, SDK, CLI, and Attack Lab. Every AI action must earn permission.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-[#060911] text-slate-100 selection:bg-cyan-500/20 selection:text-cyan-300">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-slate-800/80 bg-slate-950/40 py-6 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-400">SENTINEL</span>
              <span>•</span>
              <span>Open-Source AI Agent Firewall</span>
              <span>•</span>
              <span className="text-orange-400 font-medium">BharatCode Build League</span>
            </div>
            <div className="flex items-center space-x-4">
              <span>Apache 2.0 License</span>
              <span>•</span>
              <span>Official Model: BharatCode Qwen 3.8-27b</span>
              <span>•</span>
              <a
                href="https://github.com/bharatcode/sentinel"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:underline"
              >
                GitHub
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
