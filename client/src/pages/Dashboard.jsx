import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { CommandPalette } from "../components/ui/Command";
import { Dialog } from "../components/ui/Dialog";
import { Button } from "../components/ui/Button";
import "./Dashboard.css";

export default function Dashboard({
  setAuthenticated,
  ready,
  qrUrl,
  contacts,
  contactSearch,
  setContactSearch,
  chats,
  loadChats,
  uploading,
  uploadStatus,
  handleUploadChat,
  deleteChat,
  messages,
  sysLogs,
  setSysLogs,
  analytics,
  fetchAnalytics,
  donAwayMode,
  toggleDonAway,
  config,
  checkConfig,
  showApiKeyForm,
  setShowApiKeyForm,
  apiKeyInput,
  setApiKeyInput,
  saveApiKey,
  clearApiKey,
  deleteContact,
  deleteAllContacts,
  clearAllHistory,
  updateContactMode,
  selectedJid,
  setSelectedJid,
}) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showCommand, setShowCommand] = useState(false);

  useEffect(() => {
    loadChats();
    fetchAnalytics();
  }, []);

  useEffect(() => {
    if (activeTab === "analytics") fetchAnalytics();
  }, [activeTab]);

  const filteredContacts = contacts.filter(
    (c) =>
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
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      <div
        className="dash-main"
        style={{
          marginLeft: sidebarCollapsed ? 80 : 250,
          width: `calc(100% - ${sidebarCollapsed ? 80 : 250}px)`,
          transition: "margin-left 0.25s cubic-bezier(0.16, 1, 0.3, 1), width 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <Header
          contactSearch={contactSearch}
          setContactSearch={setContactSearch}
          activeTab={activeTab}
          ready={ready}
          onOpenCommand={() => setShowCommand(true)}
        />

        <div className="dash-body">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{ display: "flex", flexDirection: "column", gap: 24 }}
            >
              {/* VIEW 1: Overview */}
              {activeTab === "dashboard" && (
                <>
                  <Stats analytics={analytics} ready={ready} />
                  <div className="dash-grid-2">
                    <Activity sysLogs={sysLogs} clearLogs={() => setSysLogs([])} />
                    <Analytics />
                  </div>
                </>
              )}

              {/* VIEW 2: WhatsApp Live Stream */}
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

              {/* VIEW 3: Contacts */}
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

              {/* VIEW 4: Lead CRM Kanban Board */}
              {activeTab === "crm" && (
                <CrmPipeline
                  contacts={filteredContacts}
                  setSelectedJid={setSelectedJid}
                  setActiveTab={setActiveTab}
                />
              )}

              {/* VIEW 5: Broadcast Campaign Manager */}
              {activeTab === "broadcast" && (
                <Broadcast contacts={contacts} ready={ready} />
              )}

              {/* VIEW 6: Media Assets Studio */}
              {activeTab === "media" && <MediaStudio />}

              {/* VIEW 7: Automated Drip Sequences */}
              {activeTab === "drips" && <DripSequences />}

              {/* VIEW 8: AI Training & Personas */}
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

              {/* VIEW 9: Analytics & Admin Maintenance */}
              {(activeTab === "analytics" || activeTab === "settings") && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div className="dash-card">
                    <div className="dash-card__head">
                      <div>
                        <div className="dash-card__title">User Accounts & Traffic</div>
                        <div className="dash-card__sub">System-wide API usage and active sessions</div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={fetchAnalytics}>
                        Refresh
                      </Button>
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
                                    <div
                                      style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: "50%",
                                        background: "rgba(124,58,237,0.2)",
                                        color: "#a78bfa",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 12,
                                        fontWeight: 800,
                                      }}
                                    >
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
                        <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b", fontSize: 13 }}>
                          No user accounts recorded yet.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Database Maintenance Card */}
                  <div className="dash-card">
                    <div className="dash-card__head">
                      <div>
                        <div className="dash-card__title">🧹 Database Purge & Maintenance</div>
                        <div className="dash-card__sub">Admin tools to reset contacts, chat history, and logs</div>
                      </div>
                    </div>
                    <div className="dash-card__body" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                      <Button variant="danger" onClick={deleteAllContacts}>
                        🗑️ Delete All Contacts & History
                      </Button>
                      <Button variant="ghost" onClick={clearAllHistory}>
                        💬 Clear Chat Logs
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Raycast Command Palette Modal */}
      <CommandPalette
        isOpen={showCommand}
        onClose={() => setShowCommand(false)}
        onSelectTab={setActiveTab}
        contacts={filteredContacts}
        setSelectedJid={setSelectedJid}
      />

      {/* API Key Modal Dialog */}
      <Dialog
        isOpen={showApiKeyForm}
        onClose={() => setShowApiKeyForm(false)}
        title="🔑 Configure OpenRouter API Key"
        subtitle="Enable AI auto-replies across all channels."
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="primary" onClick={saveApiKey} fullWidth>
              Save Key
            </Button>
            {config.hasApiKey && (
              <Button variant="danger" onClick={clearApiKey}>
                Remove
              </Button>
            )}
          </div>
        </div>
      </Dialog>
    </div>
  );
}