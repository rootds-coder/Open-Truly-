import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MessageSquare,
  Users,
  Sparkles,
  PieChart,
  Terminal,
  FolderOpen,
  Clock,
  Kanban,
  X,
} from "lucide-react";

export function CommandPalette({
  isOpen,
  onClose,
  onSelectTab,
  contacts = [],
  setSelectedJid,
}) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery("");
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredContacts = contacts.filter(
    (c) =>
      (c.name || "").toLowerCase().includes(query.toLowerCase()) ||
      (c.jid || "").toLowerCase().includes(query.toLowerCase())
  );

  const navItems = [
    { key: "dashboard", label: "Overview Metrics", icon: PieChart },
    { key: "chats", label: "Live WhatsApp Feed", icon: MessageSquare },
    { key: "crm", label: "Lead CRM Kanban Pipeline", icon: Kanban },
    { key: "contacts", label: "Contacts Roster", icon: Users },
    { key: "broadcast", label: "Broadcast Manager", icon: Terminal },
    { key: "media", label: "Media Assets Studio", icon: FolderOpen },
    { key: "drips", label: "Drip Follow-ups", icon: Clock },
    { key: "personas", label: "AI Training & Personas", icon: Sparkles },
  ].filter((n) => n.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/70 backdrop-blur-md p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.15 }}
          className="w-full max-w-xl bg-[#18181c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Search Input */}
          <div className="flex items-center px-4 py-3.5 border-b border-white/10 gap-3">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search contacts, sections, or type a command... (Esc to exit)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="flex-1 bg-transparent border-none outline-none text-slate-100 text-sm placeholder:text-slate-500 font-sans"
            />
            <button
              onClick={onClose}
              className="p-1 rounded-md bg-white/5 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {/* Quick Navigation Category */}
            {navItems.length > 0 && (
              <div className="mb-3">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1">
                  Navigation
                </div>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.key}
                      onClick={() => {
                        onSelectTab(item.key);
                        onClose();
                      }}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-purple-500/10 hover:text-purple-300 cursor-pointer transition-colors"
                    >
                      <Icon className="w-4 h-4 text-purple-400 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Contacts Category */}
            {filteredContacts.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1">
                  Contacts ({filteredContacts.length})
                </div>
                {filteredContacts.slice(0, 8).map((c) => (
                  <div
                    key={c.jid}
                    onClick={() => {
                      setSelectedJid(c.jid);
                      onSelectTab("chats");
                      onClose();
                    }}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-slate-800/80 cursor-pointer transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center text-xs">
                      {(c.name || c.jid)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate text-slate-100">
                        {c.name || "Unknown Contact"}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {c.jid.split("@")[0]}
                      </div>
                    </div>
                    <span className="text-[10px] text-purple-400 font-semibold bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                      Open Chat →
                    </span>
                  </div>
                ))}
              </div>
            )}

            {navItems.length === 0 && filteredContacts.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-500">
                No matching results found for "{query}"
              </div>
            )}
          </div>

          <div className="px-4 py-2.5 bg-slate-900/50 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono">Ctrl + K</kbd> anytime
            </span>
            <span>Raycast Command Search</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
