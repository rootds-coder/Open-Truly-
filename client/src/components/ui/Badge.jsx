import React from "react";

export function Badge({
  children,
  variant = "purple", // "purple" | "green" | "amber" | "red" | "gray"
  className = "",
}) {
  const styles = {
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/25",
    green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/25",
    red: "bg-red-500/10 text-red-400 border-red-500/25",
    gray: "bg-slate-800 text-slate-400 border-slate-700/60",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
