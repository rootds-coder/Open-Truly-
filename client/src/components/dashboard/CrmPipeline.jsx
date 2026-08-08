import { useState } from "react";
import "./CrmPipeline.css";

const STAGES = [
    { key: "inquiry", label: "❓ Inquiries", color: "#3b82f6" },
    { key: "hot_lead", label: "🔥 Hot Leads", color: "#f59e0b" },
    { key: "high_value", label: "💰 High Value", color: "#a78bfa" },
    { key: "deal_closed", label: "✅ Deals Closed", color: "#10b981" },
    { key: "lost", label: "💤 Inactive / Lost", color: "#64748b" },
];

export default function CrmPipeline({ contacts, setSelectedJid, setActiveTab }) {
    const [editingNotesJid, setEditingNotesJid] = useState(null);
    const [notesInput, setNotesInput] = useState("");

    // Update lead stage
    const handleMoveStage = async (jid, newStage) => {
        try {
            await fetch("/api/contacts/stage", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jid, leadStage: newStage }),
                credentials: "include",
            });
            window.location.reload();
        } catch (_) {}
    };

    // Save contact notes
    const handleSaveNotes = async (jid) => {
        try {
            await fetch("/api/contacts/notes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jid, notes: notesInput }),
                credentials: "include",
            });
            setEditingNotesJid(null);
            window.location.reload();
        } catch (_) {}
    };

    return (
        <div className="crm-container">
            <div className="crm-header">
                <div>
                    <div className="crm-title">🏷️ Lead Pipeline & CRM Board</div>
                    <div className="crm-sub">Manage customer deal stages, add notes, and trigger chats</div>
                </div>
            </div>

            {/* Kanban Columns Grid */}
            <div className="crm-kanban">
                {STAGES.map((col) => {
                    const colContacts = contacts.filter((c) => (c.leadStage || "inquiry") === col.key);
                    return (
                        <div key={col.key} className="crm-col">
                            <div className="crm-col__head" style={{ borderTopColor: col.color }}>
                                <span className="crm-col__title">{col.label}</span>
                                <span className="crm-col__count">{colContacts.length}</span>
                            </div>

                            <div className="crm-col__body">
                                {colContacts.map((c) => (
                                    <div key={c.jid} className="crm-card">
                                        <div className="crm-card__head">
                                            <div className="crm-card__avatar">
                                                {(c.name || c.jid)[0].toUpperCase()}
                                            </div>
                                            <div style={{ flex: 1, overflow: "hidden" }}>
                                                <div className="crm-card__name">{c.name || "Unknown"}</div>
                                                <div className="crm-card__jid">{c.jid.split("@")[0]}</div>
                                            </div>
                                        </div>

                                        {/* Notes display */}
                                        {editingNotesJid === c.jid ? (
                                            <div style={{ marginTop: 8 }}>
                                                <textarea
                                                    className="dash-input"
                                                    rows="2"
                                                    value={notesInput}
                                                    onChange={(e) => setNotesInput(e.target.value)}
                                                    style={{ fontSize: 11, padding: 6 }}
                                                />
                                                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                                                    <button
                                                        className="dash-btn dash-btn--primary"
                                                        style={{ padding: "2px 6px", fontSize: 10 }}
                                                        onClick={() => handleSaveNotes(c.jid)}
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        className="dash-btn dash-btn--ghost"
                                                        style={{ padding: "2px 6px", fontSize: 10 }}
                                                        onClick={() => setEditingNotesJid(null)}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                className="crm-card__notes"
                                                onClick={() => { setEditingNotesJid(c.jid); setNotesInput(c.notes || ""); }}
                                                title="Click to edit notes"
                                            >
                                                {c.notes ? `📝 ${c.notes}` : "+ Add note…"}
                                            </div>
                                        )}

                                        {/* Stage Switcher Selector */}
                                        <div className="crm-card__actions">
                                            <select
                                                className="crm-stage-select"
                                                value={c.leadStage || "inquiry"}
                                                onChange={(e) => handleMoveStage(c.jid, e.target.value)}
                                            >
                                                {STAGES.map((s) => (
                                                    <option key={s.key} value={s.key}>{s.label}</option>
                                                ))}
                                            </select>

                                            <button
                                                className="dash-btn dash-btn--ghost"
                                                style={{ padding: "3px 8px", fontSize: 11 }}
                                                onClick={() => {
                                                    setSelectedJid(c.jid);
                                                    setActiveTab("chats");
                                                }}
                                            >
                                                💬 Chat
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {colContacts.length === 0 && (
                                    <div className="crm-col__empty">No leads in this stage</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
