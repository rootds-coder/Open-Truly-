import React from "react";
import { motion } from "framer-motion";

export function Card({
  children,
  className = "",
  title,
  subtitle,
  action,
  hoverable = false,
  ...props
}) {
  return (
    <motion.div
      whileHover={hoverable ? { y: -2 } : undefined}
      transition={{ duration: 0.15 }}
      className={`relative overflow-hidden rounded-2xl bg-[#121216] border border-white/[0.08] p-5 shadow-xl shadow-black/40 backdrop-blur-xl ${className}`}
      {...props}
    >
      {/* Top radial highlight */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-48 h-48 rounded-full bg-purple-500/5 blur-3xl" />

      {(title || subtitle || action) && (
        <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-white/[0.06]">
          <div>
            {title && (
              <h3 className="text-sm font-bold text-slate-100 tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}

      {children}
    </motion.div>
  );
}
