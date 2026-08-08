export default function ChatWindow({ messages, selectedJid, setSelectedJid, ready, qrUrl, config }) {
    const filtered = selectedJid
        ? messages.filter((m) => m.from === selectedJid || m.to === selectedJid)
        : messages;

    return (
        <div className="dash-card dash-chat">
            {/* Header */}
            <div className="dash-card__head">
                <div>
                    <div className="dash-card__title">
                        {selectedJid ? `Chat — ${selectedJid.split("@")[0]}` : "Global Activity Stream"}
                    </div>
                    <div className="dash-card__sub">
                        {ready ? "Baileys session active" : "Waiting for device link…"}
                    </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    {selectedJid && (
                        <button className="dash-btn dash-btn--ghost" onClick={() => setSelectedJid(null)}>
                            All messages
                        </button>
                    )}
                </div>
            </div>

            {/* Alerts */}
            {!config.hasApiKey && (
                <div className="dash-alert dash-alert--warn" style={{ margin: "0 20px 0" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L1 21h22L12 2zm0 3.5l8.5 14.5H3.5L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>
                    OpenRouter API key missing — AI replies are disabled
                </div>
            )}

            {/* QR Code */}
            {qrUrl && !ready && (
                <div className="dash-chat__qr">
                    <div style={{ background: "#fff", padding: 10, borderRadius: 12 }}>
                        <img src={qrUrl} alt="WhatsApp QR" className="dash-chat__qr-img" />
                    </div>
                    <div className="dash-chat__qr-title">Link your WhatsApp</div>
                    <div className="dash-chat__qr-desc">
                        Open WhatsApp → Linked Devices → Link a Device, then scan this code.
                    </div>
                </div>
            )}

            {/* Messages */}
            {!qrUrl && (
                <div className="dash-chat__messages">
                    {filtered.length > 0 ? (
                        [...filtered].reverse().map((msg, i) => {
                            const isOut = msg.fromMe || msg.sender === "user" || msg.from === "me";
                            const time = msg.timestamp
                                ? new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                : "";
                            return (
                                <div key={msg.id || i} className={`dash-msg dash-msg--${isOut ? "out" : "in"}`}>
                                    <div className="dash-msg__bubble">{msg.body || "[Media]"}</div>
                                    {time && <span className="dash-msg__time">{time}</span>}
                                </div>
                            );
                        })
                    ) : (
                        !qrUrl && (
                            <div className="dash-chat__empty">
                                <div className="dash-chat__empty-icon">⚡</div>
                                <div className="dash-chat__empty-text">
                                    Monitoring active.<br />Messages stream here live.
                                </div>
                            </div>
                        )
                    )}
                </div>
            )}

            {/* Footer status bar */}
            <div style={{
                padding: "10px 20px",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "#374151",
                fontFamily: "'JetBrains Mono', monospace",
                flexShrink: 0
            }}>
                <span>status:// monitoring {selectedJid ? selectedJid.split("@")[0] : "all channels"}</span>
                <span style={{ color: ready ? "#22c55e" : "#f59e0b" }}>
                    {ready ? "● AUTO REPLY ACTIVE" : "● LINK DEVICE"}
                </span>
            </div>
        </div>
    );
}