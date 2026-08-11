import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, AlertTriangle, QrCode, Send, Paperclip, Mic, CheckCheck } from "lucide-react";
import { Button } from "../ui/Button";

export default function ChatWindow({ messages, selectedJid, setSelectedJid, ready, qrUrl, config }) {
  const [inputText, setInputText] = useState("");

  const filtered = selectedJid
    ? messages.filter((m) => m.from === selectedJid || m.to === selectedJid)
    : messages;

  return (
    <div className="dash-card dash-chat">
      {/* Header */}
      <div className="dash-card__head">
        <div>
          <div className="dash-card__title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MessageSquare className="w-4 h-4 text-purple-400" />
            {selectedJid ? `Chat — ${selectedJid.split("@")[0]}` : "Global Activity Stream"}
          </div>
          <div className="dash-card__sub">
            {ready ? "Baileys WASocket active" : "Waiting for WhatsApp QR scan…"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {selectedJid && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedJid(null)}>
              All Channels
            </Button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {!config.hasApiKey && (
        <div className="dash-alert dash-alert--warn" style={{ margin: "16px 20px 0" }}>
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>OpenRouter API key missing — AI replies are paused until configured.</span>
        </div>
      )}

      {/* QR Code pairing view */}
      {qrUrl && !ready && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="dash-chat__qr"
        >
          <div style={{ background: "#ffffff", padding: 14, borderRadius: 16, boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
            <img src={qrUrl} alt="WhatsApp QR Code" className="dash-chat__qr-img" />
          </div>
          <div className="dash-chat__qr-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <QrCode className="w-5 h-5 text-purple-400" />
            Link Your WhatsApp Device
          </div>
          <div className="dash-chat__qr-desc">
            Open WhatsApp → Linked Devices → Link a Device, then scan this code.
          </div>
        </motion.div>
      )}

      {/* Live Message Feed */}
      {!qrUrl && (
        <div className="dash-chat__messages">
          <AnimatePresence initial={false}>
            {filtered.length > 0 ? (
              [...filtered].reverse().map((msg, i) => {
                const isOut = msg.fromMe || msg.sender === "user" || msg.from === "me";
                const time = msg.timestamp
                  ? new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "";

                return (
                  <motion.div
                    key={msg.id || i}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className={`dash-msg dash-msg--${isOut ? "out" : "in"}`}
                  >
                    <div className="dash-msg__bubble">{msg.body || "[Media Attachment]"}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                      {time && <span className="dash-msg__time">{time}</span>}
                      {isOut && <CheckCheck className="w-3 h-3 text-emerald-400" />}
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="dash-chat__empty">
                <div className="dash-chat__empty-icon">⚡</div>
                <div className="dash-chat__empty-text">
                  Monitoring WhatsApp stream live.<br />Incoming & outgoing messages appear here instantly.
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Message Composer Bar */}
      {selectedJid && ready && (
        <div style={{ padding: "12px 18px", borderTop: "1px solid rgba(255, 255, 255, 0.09)", background: "#141419", display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="text"
            className="dash-input"
            placeholder={`Type a message to ${selectedJid.split("@")[0]}...`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={{ fontSize: 13 }}
          />
          <Button variant="primary" size="sm" icon={Send} disabled={!inputText.trim()}>
            Send
          </Button>
        </div>
      )}

      {/* Footer status bar */}
      <div
        style={{
          padding: "10px 20px",
          borderTop: "1px solid rgba(255, 255, 255, 0.09)",
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: "#64748b",
          fontFamily: "'JetBrains Mono', monospace",
          flexShrink: 0,
        }}
      >
        <span>status:// monitoring {selectedJid ? selectedJid.split("@")[0] : "all channels"}</span>
        <span style={{ color: ready ? "#25d366" : "#fbbf24", fontWeight: 700 }}>
          {ready ? "● AUTO REPLY ACTIVE" : "● SCAN QR CODE"}
        </span>
      </div>
    </div>
  );
}