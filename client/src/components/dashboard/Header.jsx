import React from "react";
import { Search, Command as CmdIcon } from "lucide-react";

export default function Header({
  contactSearch,
  setContactSearch,
  activeTab,
  ready,
  onOpenCommand,
}) {
  const tabTitles = {
    dashboard: { title: "Overview", sub: "Real-time system metrics & live activity" },
    chats: { title: "WhatsApp Stream", sub: "Live message feed & QR pairing" },
    crm: { title: "CRM Pipeline", sub: "Visual lead stages & deal tracking" },
    contacts: { title: "Contacts Roster", sub: "Manage WhatsApp contacts & companion modes" },
    broadcast: { title: "Broadcast Manager", sub: "Bulk outreach campaigns & pacing" },
    media: { title: "Media Studio", sub: "Manage auto-attachment documents & audio" },
    drips: { title: "Drip Sequences", sub: "Automated inactivity follow-up rules" },
    personas: { title: "AI Training", sub: "Manage personas & RAG Knowledge Base" },
    analytics: { title: "Analytics", sub: "System usage & account statistics" },
  };

  const current = tabTitles[activeTab] || tabTitles.dashboard;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-[#0a0b0d]/90 backdrop-blur-xl border-b border-white/[0.08]">
      <div>
        <h1 className="text-base font-bold text-slate-100 tracking-tight">
          {current.title}
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">{current.sub}</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Raycast Command Search Trigger */}
        <button
          onClick={onOpenCommand}
          className="flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/60 hover:border-slate-500 text-xs text-slate-400 hover:text-slate-200 transition-all shadow-inner cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium">Search or type command...</span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30 rounded-md ml-2 font-mono">
            Ctrl K
          </kbd>
        </button>

        {/* WhatsApp Connection Status Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300">
          <span
            className={`w-2 h-2 rounded-full ${
              ready
                ? "bg-emerald-400 shadow-[0_0_8px_#22c55e]"
                : "bg-amber-400 shadow-[0_0_8px_#f59e0b]"
            }`}
          />
          <span>{ready ? "Connected" : "Disconnected"}</span>
        </div>
      </div>
    </header>
  );
}