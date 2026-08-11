import React from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  MessageSquare,
  Kanban,
  Users,
  Send,
  FolderOpen,
  Clock,
  Sparkles,
  BarChart3,
  Moon,
  Key,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const NAV = [
  { key: "dashboard", label: "Overview", icon: LayoutDashboard },
  { key: "chats", label: "WhatsApp", icon: MessageSquare },
  { key: "crm", label: "CRM Board", icon: Kanban },
  { key: "contacts", label: "Contacts", icon: Users },
  { key: "broadcast", label: "Broadcast", icon: Send },
  { key: "media", label: "Media Assets", icon: FolderOpen },
  { key: "drips", label: "Drip Rules", icon: Clock },
  { key: "personas", label: "AI Training", icon: Sparkles },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
];

export default function Sidebar({
  setAuthenticated,
  activeTab,
  setActiveTab,
  donAwayMode,
  toggleDonAway,
  config,
  showApiKeyForm,
  setShowApiKeyForm,
  collapsed,
  setCollapsed,
}) {
  const handleLogout = () => {
    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).finally(
      () => setAuthenticated(false)
    );
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 256 }}
      transition={{ type: "spring", damping: 25, stiffness: 280 }}
      className="fixed left-0 top-0 bottom-0 z-40 bg-[#0a0b0d] border-r border-white/[0.08] flex flex-col justify-between p-3 select-none overflow-hidden"
    >
      <div>
        {/* Brand & Collapse Header */}
        <div className="flex items-center justify-between px-2 py-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-base font-bold shadow-sm">
              😈
            </div>
            {!collapsed && (
              <span className="font-extrabold text-sm text-slate-100 tracking-tight">
                Devil AI
              </span>
            )}
          </div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  isActive
                    ? "bg-purple-600/15 text-purple-300 border border-purple-500/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? "text-purple-400" : "text-slate-400"
                  }`}
                />
                {!collapsed && (
                  <span className="truncate">{item.label}</span>
                )}
                {isActive && !collapsed && (
                  <motion.div
                    layoutId="activeSidePill"
                    className="absolute right-2 w-1.5 h-1.5 rounded-full bg-purple-400"
                  />
                )}
              </button>
            );
          })}

          <div className="my-3 border-t border-white/[0.06]" />

          {/* Don Away Toggle */}
          <button
            onClick={toggleDonAway}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent transition-all cursor-pointer"
            title={collapsed ? `Don Away: ${donAwayMode ? "ON" : "OFF"}` : undefined}
          >
            <Moon className="w-4 h-4 text-slate-400 shrink-0" />
            {!collapsed && <span className="flex-1 text-left">Don Away</span>}
            {!collapsed && (
              <div
                className={`w-7 h-4 rounded-full p-0.5 transition-colors ${
                  donAwayMode ? "bg-purple-600" : "bg-slate-700"
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full bg-white transition-transform ${
                    donAwayMode ? "translate-x-3" : "translate-x-0"
                  }`}
                />
              </div>
            )}
          </button>

          {/* API Key Form Toggle */}
          <button
            onClick={() => setShowApiKeyForm(!showApiKeyForm)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent transition-all cursor-pointer"
            title={collapsed ? "API Key Status" : undefined}
          >
            <Key className="w-4 h-4 text-slate-400 shrink-0" />
            {!collapsed && <span className="flex-1 text-left">API Key</span>}
            {!collapsed && (
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  config.hasApiKey
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                }`}
              >
                {config.hasApiKey ? "SET" : "MISSING"}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Footer Sign Out Button */}
      <div className="pt-2 border-t border-white/[0.06]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:border-red-500/20 border border-transparent transition-all cursor-pointer"
          title={collapsed ? "Sign Out" : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </motion.aside>
  );
}