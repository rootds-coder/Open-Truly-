import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export function Sheet({
  isOpen,
  onClose,
  title,
  side = "right",
  children,
  className = "",
}) {
  const sideVariants = {
    left: {
      initial: { x: "-100%" },
      animate: { x: 0 },
      exit: { x: "-100%" },
    },
    right: {
      initial: { x: "100%" },
      animate: { x: 0 },
      exit: { x: "100%" },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className={`fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm ${
            side === "left" ? "justify-start" : "justify-end"
          }`}
          onClick={onClose}
        >
          <motion.div
            initial={sideVariants[side].initial}
            animate={sideVariants[side].animate}
            exit={sideVariants[side].exit}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className={`w-full max-w-sm h-full bg-[#18181c] border-l border-white/10 p-6 shadow-2xl overflow-y-auto relative ${className}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {title && (
              <h2 className="text-base font-bold text-slate-100 mb-4 pr-8">
                {title}
              </h2>
            )}

            <div>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
