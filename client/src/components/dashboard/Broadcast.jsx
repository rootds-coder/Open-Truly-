import { useState, useEffect } from "react";
import "./Broadcast.css";

export default function Broadcast({ contacts, ready }) {
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [targetType, setTargetType] = useState("all"); // "all" | "selected"
    const [selectedJids, setSelectedJids] = useState([]);
    const [contactSearch, setContactSearch] = useState("");
    const [delayMs, setDelayMs] = useState(4000);
    const [sending, setSending] = useState(false);
    const [campaigns, setCampaigns] = useState([]);
    const [statusMsg, setStatusMsg] = useState({ text: "", type: "" });
    const [activeProgress, setActiveProgress] = useState(null);

    // Fetch past campaigns
    const fetchCampaigns = async () => {
        try {
            const res = await fetch("/api/broadcasts", { credentials: "include" });
            const data = await res.json();
            if (data.ok) {
                setCampaigns(data.campaigns || []);
            }
        } catch (_) {}
    };

    useEffect(() => {
        fetchCampaigns();
    }, []);

    // Toggle contact selection
    const toggleJid = (jid) => {
        setSelectedJids((prev) =>
            prev.includes(jid) ? prev.filter((j) => j !== jid) : [...prev, jid]
        );
    };

    const selectAllContacts = () => {
        setSelectedJids(contacts.map((c) => c.jid));
    };

    const deselectAllContacts = () => {
        setSelectedJids([]);
    };

    // Filter contacts for search
    const filteredContacts = contacts.filter((c) =>
        (c.name || "").toLowerCase().includes(contactSearch.toLowerCase()) ||
        (c.jid || "").toLowerCase().includes(contactSearch.toLowerCase())
    );

    // Submit broadcast
    const handleSendBroadcast = async (e) => {
        e.preventDefault();
        if (!message.trim()) {
            setStatusMsg({ text: "Please enter a message to broadcast.", type: "error" });
            return;
        }
        if (!ready) {
            setStatusMsg({ text: "WhatsApp is not connected. Link device first.", type: "error" });
            return;
        }
        if (targetType === "selected" && selectedJids.length === 0) {
            setStatusMsg({ text: "Select at least one recipient contact.", type: "error" });
            return;
        }

        const targetCount = targetType === "all" ? contacts.length : selectedJids.length;
        if (!confirm(`🚀 Launch broadcast campaign to ${targetCount} WhatsApp contact(s)?`)) return;

        setSending(true);
        setStatusMsg({ text: "Initializing broadcast campaign…", type: "info" });

        try {
            const res = await fetch("/api/broadcasts/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title.trim() || "WhatsApp Broadcast",
                    message: message.trim(),
                    target: targetType,
                    jids: selectedJids,
                    delayMs,
                }),
                credentials: "include",
            });
            const data = await res.json();
            if (res.ok && data.ok) {
                setStatusMsg({ text: data.message, type: "success" });
                setTitle("");
                setMessage("");
                fetchCampaigns();
            } else {
                setStatusMsg({ text: data.error || "Failed to start broadcast.", type: "error" });
            }
        } catch (_) {
            setStatusMsg({ text: "Network error starting broadcast.", type: "error" });
        }
        setSending(false);
    };

    return (
        <div className="dash-broadcast">
            {/* Top Warning Banner */}
            {!ready && (
                <div className="dash-alert dash-alert--error" style={{ marginBottom: 20 }}>
                    ⚠️ WhatsApp device is disconnected. Re-scan QR code in WhatsApp tab before sending broadcasts.
                </div>
            )}

            <div className="dash-grid-equal">
                {/* Campaign Composer */}
                <div className="dash-card">
                    <div className="dash-card__head">
                        <div>
                            <div className="dash-card__title">📢 Create Broadcast Campaign</div>
                            <div className="dash-card__sub">Send bulk announcements to your WhatsApp contacts</div>
                        </div>
                    </div>

                    <div className="dash-card__body">
                        <form onSubmit={handleSendBroadcast} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            <div>
                                <label className="dash-label">Campaign Title (Internal)</label>
                                <input
                                    type="text"
                                    className="dash-input"
                                    placeholder="e.g. Weekend Flash Sale / System Update"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="dash-label">
                                    Broadcast Message
                                    <span style={{ float: "right", color: "#64748b", fontWeight: 400 }}>
                                        {message.length} chars
                                    </span>
                                </label>
                                <textarea
                                    className="dash-input"
                                    rows="5"
                                    placeholder="Type your broadcast message here... Supports WhatsApp markdown (*bold*, _italic_)"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    required
                                    style={{ resize: "vertical", fontFamily: "inherit" }}
                                />
                            </div>

                            {/* Target Selection */}
                            <div>
                                <label className="dash-label">Target Recipients</label>
                                <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                                    <label
                                        className={`dash-radio-chip ${targetType === "all" ? "dash-radio-chip--active" : ""}`}
                                        onClick={() => setTargetType("all")}
                                    >
                                        🌐 All Contacts ({contacts.length})
                                    </label>
                                    <label
                                        className={`dash-radio-chip ${targetType === "selected" ? "dash-radio-chip--active" : ""}`}
                                        onClick={() => setTargetType("selected")}
                                    >
                                        🎯 Select Specific ({selectedJids.length})
                                    </label>
                                </div>

                                {/* Custom Contact Selector */}
                                {targetType === "selected" && (
                                    <div className="bc-contact-selector">
                                        <div className="bc-contact-selector__head">
                                            <input
                                                type="text"
                                                className="dash-input"
                                                placeholder="Search contacts..."
                                                value={contactSearch}
                                                onChange={(e) => setContactSearch(e.target.value)}
                                                style={{ padding: "6px 12px", fontSize: 12 }}
                                            />
                                            <div style={{ display: "flex", gap: 6 }}>
                                                <button type="button" className="dash-btn dash-btn--ghost" style={{ padding: "4px 8px", fontSize: 11 }} onClick={selectAllContacts}>
                                                    Select All
                                                </button>
                                                <button type="button" className="dash-btn dash-btn--ghost" style={{ padding: "4px 8px", fontSize: 11 }} onClick={deselectAllContacts}>
                                                    Clear
                                                </button>
                                            </div>
                                        </div>

                                        <div className="bc-contact-list">
                                            {filteredContacts.map((c) => {
                                                const isChecked = selectedJids.includes(c.jid);
                                                return (
                                                    <label key={c.jid} className={`bc-contact-item ${isChecked ? "bc-contact-item--checked" : ""}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => toggleJid(c.jid)}
                                                        />
                                                        <div className="bc-contact-avatar">
                                                            {(c.name || c.jid)[0].toUpperCase()}
                                                        </div>
                                                        <div className="bc-contact-info">
                                                            <div className="bc-contact-name">{c.name || "Unknown"}</div>
                                                            <div className="bc-contact-jid">{c.jid.split("@")[0]}</div>
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Anti-Ban Delay Slider */}
                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                    <label className="dash-label" style={{ margin: 0 }}>🛡️ Anti-Ban Delivery Pacing</label>
                                    <span style={{ fontSize: 12, color: "#a78bfa", fontWeight: 700 }}>
                                        {delayMs / 1000}s delay per contact
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="2000"
                                    max="10000"
                                    step="1000"
                                    value={delayMs}
                                    onChange={(e) => setDelayMs(Number(e.target.value))}
                                    style={{ width: "100%", accentColor: "#7c3aed" }}
                                />
                                <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                                    Adds randomized 2-10 second delays between messages to prevent WhatsApp anti-spam triggers.
                                </div>
                            </div>

                            {statusMsg.text && (
                                <div className={`dash-alert dash-alert--${statusMsg.type}`}>
                                    {statusMsg.text}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="dash-btn dash-btn--primary"
                                disabled={sending || !ready || (targetType === "selected" && selectedJids.length === 0)}
                                style={{ width: "100%", padding: "12px 0", fontSize: 14 }}
                            >
                                {sending ? "Launching Broadcast…" : "🚀 Launch Broadcast Campaign"}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Campaign History & Status */}
                <div className="dash-card">
                    <div className="dash-card__head">
                        <div>
                            <div className="dash-card__title">📜 Broadcast History</div>
                            <div className="dash-card__sub">Past campaign logs and delivery reports</div>
                        </div>
                        <button className="dash-btn dash-btn--ghost" onClick={fetchCampaigns}>
                            Refresh
                        </button>
                    </div>

                    <div className="dash-card__body" style={{ padding: 0 }}>
                        {campaigns.length > 0 ? (
                            <div style={{ overflowX: "auto" }}>
                                <table className="dash-table">
                                    <thead>
                                        <tr>
                                            <th>Campaign</th>
                                            <th>Status</th>
                                            <th>Delivered</th>
                                            <th>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {campaigns.map((c, i) => (
                                            <tr key={i}>
                                                <td style={{ color: "#f1f5f9", fontWeight: 600 }}>
                                                    <div>{c.title}</div>
                                                    <div style={{ fontSize: 11, color: "#64748b", fontWeight: 400 }} className="bc-msg-truncate">
                                                        {c.message}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`dash-badge dash-badge--${c.status === "completed" ? "ok" : c.status === "sending" ? "admin" : "missing"}`}>
                                                        {c.status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span style={{ fontWeight: 700, color: "#a78bfa" }}>
                                                        {c.sentCount ?? 0}
                                                    </span>
                                                    <span style={{ color: "#64748b", fontSize: 12 }}>
                                                        /{c.totalRecipients || 0}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: 12, color: "#64748b" }}>
                                                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b", fontSize: 13 }}>
                                <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>📢</div>
                                No broadcast campaigns launched yet.<br />
                                Create your first campaign on the left.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
