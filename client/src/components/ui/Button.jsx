import React from "react";
import { motion } from "framer-motion";

export function Button({
  children,
  variant = "primary", // "primary" | "secondary" | "ghost" | "danger" | "success" | "outline"
  size = "md", // "sm" | "md" | "lg"
  icon: Icon,
  fullWidth = false,
  className = "",
  disabled = false,
  onClick,
  type = "button",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer select-none";

  const variants = {
    primary:
      "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-950/40 border border-purple-500/30",
    secondary:
      "bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 shadow-sm",
    ghost:
      "bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-100 border border-transparent",
    outline:
      "bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-slate-500",
    danger:
      "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40",
    success:
      "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs rounded-lg",
    md: "px-4 py-2 text-xs font-semibold rounded-xl",
    lg: "px-6 py-2.5 text-sm font-bold rounded-xl",
  };

  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${variants[variant]} ${sizes[size]} ${
        fullWidth ? "w-full" : ""
      } ${className}`}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0" />}
      <span>{children}</span>
    </motion.button>
  );
}
