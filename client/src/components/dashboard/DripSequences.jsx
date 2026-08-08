import { useState, useEffect } from "react";
import "./DripSequences.css";

export default function DripSequences() {
    const [rules, setRules] = useState([]);
    const [name, setName] = useState("");
    const [inactivityHours, setInactivityHours] = useState(24);
    const [targetStage, setTargetStage] = useState("all");
    const [message, setMessage] = useState("");
    const [statusMsg, setStatusMsg] = useState({ text: "", type: "" });
    const [saving, setSaving] = useState(false);

    const fetchRules = async () => {
        try {
            const res = await fetch("/api/drips", { credentials: "include" });
            const data = await res.json();
            if (data.ok) setRules(data.rules || []);
        } catch (_) {}
    };

    useEffect(() => {
        fetchRules();
    }, []);

    const handleSaveRule = async (e) => {
        e.preventDefault();
        if (!name.trim() || !message.trim()) {
            setStatusMsg({ text: "Name and message are required", type: "error" });
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/drips", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    inactivityHours: Number(inactivityHours),
                    targetStage,
                    message: message.trim(),
                }),
                credentials: "include",
            });
            const data = await res.json();
            if (res.ok && data.ok) {
                setStatusMsg({ text: data.message, type: "success" });
                setName("");
                setMessage("");
                fetchRules();
            } else {
                setStatusMsg({ text: data.error || "Save failed", type: "error" });
            }
        } catch (_) {
            setStatusMsg({ text: "Failed to save drip rule", type: "error" });
        }
        setSaving(false);
    };

    const handleDeleteRule = async (id, ruleName) => {
        if (!confirm(`Delete drip rule "${ruleName}"?`)) return;
        try {
            await fetch(`/api/drips/${id}`, { method: "DELETE", credentials: "include" });
            fetchRules();
        } catch (_) {}
    };

    return (
        <div className="dash-grid-equal">
            {/* Create Drip Follow-up Rule */}
            <div className="dash-card">
                <div className="dash-card__head">
                    <div>
                        <div className="dash-card__title">⏰ Create Follow-Up Drip Rule</div>
                        <div className="dash-card__sub">Auto-send messages when a contact stops replying</div>
                    </div>
                </div>

                <div className="dash-card__body">
                    <form onSubmit={handleSaveRule} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <div>
                            <label className="dash-label">Rule Name</label>
                            <input
                                type="text"
                                className="dash-input"
                                placeholder="e.g. 24h Hot Lead Follow-Up"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div style={{ display: "flex", gap: 12 }}>
                            <div style={{ flex: 1 }}>
                                <label className="dash-label">Inactivity Trigger (Hours)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="168"
                                    className="dash-input"
                                    value={inactivityHours}
                                    onChange={(e) => setInactivityHours(e.target.value)}
                                    required
                                />
                            </div>

                            <div style={{ flex: 1 }}>
                                <label className="dash-label">Target Lead Stage</label>
                                <select
                                    className="dash-input"
                                    value={targetStage}
                                    onChange={(e) => setTargetStage(e.target.value)}
                                >
                                    <option value="all">🌐 All Contacts</option>
                                    <option value="inquiry">❓ Inquiries Only</option>
                                    <option value="hot_lead">🔥 Hot Leads Only</option>
                                    <option value="high_value">💰 High Value Only</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="dash-label">Follow-Up Message Text</label>
                            <textarea
                                className="dash-input"
                                rows="4"
                                placeholder="Hey! Just checking in to see if you had any questions about our offer? 😊"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                required
                            />
                        </div>

                        {statusMsg.text && (
                            <div className={`dash-alert dash-alert--${statusMsg.type}`}>
                                {statusMsg.text}
                            </div>
                        )}

                        <button type="submit" className="dash-btn dash-btn--primary" disabled={saving}>
                            {saving ? "Saving Rule…" : "🚀 Activate Drip Rule"}
                        </button>
                    </form>
                </div>
            </div>

            {/* Drip Rules Roster */}
            <div className="dash-card">
                <div className="dash-card__head">
                    <div>
                        <div className="dash-card__title">⚡ Active Drip Rules ({rules.length})</div>
                        <div className="dash-card__sub">Automated background follow-up sequences</div>
                    </div>
                </div>

                <div className="dash-card__body">
                    <div className="dash-file-list">
                        {rules.length > 0 ? (
                            rules.map((r) => (
                                <div className="dash-file-chip" key={r._id} style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
                                    <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center" }}>
                                        <div style={{ fontWeight: 700, color: "#ffffff", fontSize: 13 }}>
                                            ⏰ {r.name}
                                        </div>
                                        <button className="dash-contact__del" onClick={() => handleDeleteRule(r._id, r.name)}>✕</button>
                                    </div>
                                    <div style={{ fontSize: 11, color: "#a78bfa" }}>
                                        Triggers after {r.inactivityHours} hours of inactivity • Target: {r.targetStage.toUpperCase()}
                                    </div>
                                    <div style={{ fontSize: 11, color: "#94a3b8" }}>
                                        "{r.message}"
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: "center", color: "#64748b", padding: "40px 0", fontSize: 13 }}>
                                No drip rules created yet.<br />
                                Create an automated 24-hour follow-up rule on the left.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
