import { useState, useEffect } from "react";
import Sidebar from "../components/dashboard/Sidebar";
import Header from "../components/dashboard/Header";
import Stats from "../components/dashboard/Stats";
import Activity from "../components/dashboard/Activity";
import Analytics from "../components/dashboard/Analytics";
import ContactList from "../components/contacts/ContactList";
import ChatWindow from "../components/chat/ChatWindow";
import Broadcast from "../components/dashboard/Broadcast";
import PersonaStudio from "../components/dashboard/PersonaStudio";
import CrmPipeline from "../components/dashboard/CrmPipeline";
import MediaStudio from "../components/dashboard/MediaStudio";
import DripSequences from "../components/dashboard/DripSequences";
import SnowCanvas from "../components/dashboard/SnowCanvas";
import "./Dashboard.css";

export default function Dashboard({
    setAuthenticated,
    ready, qrUrl,
    contacts, contactSearch, setContactSearch,
    chats, loadChats, uploading, uploadStatus, handleUploadChat, deleteChat,
    messages, sysLogs, setSysLogs,
    analytics, fetchAnalytics,
    donAwayMode, toggleDonAway,
    config, checkConfig,
    showApiKeyForm, setShowApiKeyForm,
    apiKeyInput, setApiKeyInput, saveApiKey, clearApiKey,
    deleteContact, deleteAllContacts, clearAllHistory, updateContactMode,
    selectedJid, setSelectedJid,
}) {
    const [activeTab, setActiveTab] = useState("dashboard");

    useEffect(() => {
        loadChats();
        fetchAnalytics();
    }, []);

    useEffect(() => {
        if (activeTab === "analytics") fetchAnalytics();
    }, [activeTab]);

    const filteredContacts = contacts.filter((c) =>
        (c.name || "").toLowerCase().includes(contactSearch.toLowerCase()) ||
        (c.jid || "").toLowerCase().includes(contactSearch.toLowerCase())
    );

    return (
        <div className="dash">
            <Sidebar
                setAuthenticated={setAuthenticated}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                donAwayMode={donAwayMode}
                toggleDonAway={toggleDonAway}
                config={config}
                showApiKeyForm={showApiKeyForm}
                setShowApiKeyForm={setShowApiKeyForm}
            />

            <div className="dash-main">
                <Header
                    contactSearch={contactSearch}
                    setContactSearch={setContactSearch}
                    activeTab={activeTab}
                    ready={ready}
                />

                <div className="dash-body">

                    {/* ── VIEW 1: Overview ───────────────────── */}
                    {activeTab === "dashboard" && (
                        <>
                            <Stats analytics={analytics} ready={ready} />
                            <div className="dash-grid-2">
                                <Activity sysLogs={sysLogs} clearLogs={() => setSysLogs([])} />
                                <Analytics />
                            </div>
                        </>
                    )}

                    {/* ── VIEW 2: WhatsApp / QR ──────────────── */}
                    {activeTab === "chats" && (
                        <ChatWindow
                            messages={messages}
                            selectedJid={selectedJid}
                            setSelectedJid={setSelectedJid}
                            ready={ready}
                            qrUrl={qrUrl}
                            config={config}
                        />
                    )}

                    {/* ── VIEW 3: Contacts ───────────────────── */}
                    {activeTab === "contacts" && (
                        <div className="dash-grid-2">
                            <ContactList
                                contacts={filteredContacts}
                                selectedJid={selectedJid}
                                setSelectedJid={setSelectedJid}
                                updateContactMode={updateContactMode}
                                deleteContact={deleteContact}
                                deleteAllContacts={deleteAllContacts}
                            />
                            <ChatWindow
                                messages={messages}
                                selectedJid={selectedJid}
                                setSelectedJid={setSelectedJid}
                                ready={ready}
                                qrUrl={qrUrl}
                                config={config}
                            />
                        </div>
                    )}

                    {/* ── VIEW 4: CRM Kanban Pipeline ─────────── */}
                    {activeTab === "crm" && (
                        <CrmPipeline
                            contacts={filteredContacts}
                            setSelectedJid={setSelectedJid}
                            setActiveTab={setActiveTab}
                        />
                    )}

                    {/* ── VIEW 5: Broadcast Campaigns ────────── */}
                    {activeTab === "broadcast" && (
                        <Broadcast contacts={contacts} ready={ready} />
                    )}

                    {/* ── VIEW 6: Media Assets Studio ────────── */}
                    {activeTab === "media" && (
                        <MediaStudio />
                    )}

                    {/* ── VIEW 7: Automated Drip Sequences ──── */}
                    {activeTab === "drips" && (
                        <DripSequences />
                    )}

                    {/* ── VIEW 5: AI Training & Persona Studio ── */}
                    {activeTab === "personas" && (
                        <PersonaStudio
                            chats={chats}
                            loadChats={loadChats}
                            uploading={uploading}
                            uploadStatus={uploadStatus}
                            handleUploadChat={handleUploadChat}
                            deleteChat={deleteChat}
                        />
                    )}

                    {/* ── VIEW 6: Analytics / Users & Database Maintenance ──── */}
                    {(activeTab === "analytics" || activeTab === "settings") && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                            <div className="dash-card">
                                <div className="dash-card__head">
                                    <div>
                                        <div className="dash-card__title">User Accounts & Traffic</div>
                                        <div className="dash-card__sub">System-wide API usage and session data</div>
                                    </div>
                                    <button className="dash-btn dash-btn--ghost" onClick={fetchAnalytics}>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                                        Refresh
                                    </button>
                                </div>
                                <div className="dash-card__body" style={{ overflowX: "auto", padding: 0 }}>
                                    {analytics.users && analytics.users.length > 0 ? (
                                        <table className="dash-table">
                                            <thead>
                                                <tr>
                                                    <th>Username</th>
                                                    <th>Role</th>
                                                    <th>API Key</th>
                                                    <th>Messages Today</th>
                                                    <th>API Calls Today</th>
                                                    <th>Last Active</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {analytics.users.map((u, i) => (
                                                    <tr key={i}>
                                                        <td style={{ color: "#f1f5f9", fontWeight: 600 }}>
                                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(124,58,237,0.2)", color: "#a78bfa", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                                                                    {(u.username || "?")[0].toUpperCase()}
                                                                </div>
                                                                {u.username}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span className={`dash-badge dash-badge--${u.role === "admin" ? "admin" : "user"}`}>
                                                                {(u.role || "user").toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className={`dash-badge dash-badge--${u.userApiKey ? "ok" : "missing"}`}>
                                                                {u.userApiKey ? "Configured" : "Missing"}
                                                            </span>
                                                        </td>
                                                        <td>{u.messagesToday ?? 0}</td>
                                                        <td>{u.apiCallsToday ?? 0}</td>
                                                        <td>{u.lastActive ? new Date(u.lastActive).toLocaleString() : "—"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div style={{ padding: "40px 20px", textAlign: "center", color: "#374151", fontSize: 13 }}>
                                            No user accounts found.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Database Purge & Reset Controls */}
                            <div className="dash-card">
                                <div className="dash-card__head">
                                    <div>
                                        <div className="dash-card__title">🧹 Database Purge & Maintenance</div>
                                        <div className="dash-card__sub">Admin tools to reset contacts, message history, and auto-reset timers</div>
                                    </div>
                                </div>
                                <div className="dash-card__body" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                                    <button className="dash-btn dash-btn--danger" onClick={deleteAllContacts} style={{ padding: "12px 20px" }}>
                                        🗑️ Delete All Contacts & History
                                    </button>
                                    <button className="dash-btn dash-btn--ghost" onClick={clearAllHistory} style={{ padding: "12px 20px" }}>
                                        💬 Clear Chat History Logs
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* ── API Key Modal ──────────────────────────── */}
            {showApiKeyForm && (
                <div className="dash-modal-overlay" onClick={() => setShowApiKeyForm(false)}>
                    <div className="dash-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="dash-modal__close" onClick={() => setShowApiKeyForm(false)}>✕</button>
                        <div className="dash-modal__title">🔑 Configure API Key</div>
                        <div className="dash-modal__desc">
                            Add your OpenRouter API key to enable AI auto-replies. Get one free at{" "}
                            <a href="https://openrouter.ai" target="_blank" rel="noreferrer" style={{ color: "#a78bfa" }}>openrouter.ai</a>.
                        </div>
                        <div className="dash-modal__fields">
                            <div>
                                <label className="dash-label">OpenRouter API Key</label>
                                <input
                                    type="password"
                                    className="dash-input"
                                    placeholder="sk-or-v1-…"
                                    value={apiKeyInput}
                                    onChange={(e) => setApiKeyInput(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="dash-modal__actions">
                            <button className="dash-btn dash-btn--primary" onClick={saveApiKey} style={{ flex: 1 }}>
                                Save Key
                            </button>
                            {config.hasApiKey && (
                                <button className="dash-btn dash-btn--danger" onClick={clearApiKey}>
                                    Remove
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}