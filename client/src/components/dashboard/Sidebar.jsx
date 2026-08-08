import "../../pages/Dashboard.css";

const NAV = [
    { key: "dashboard", label: "Overview", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
    { key: "chats",     label: "WhatsApp",  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
    { key: "crm",       label: "CRM Board", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg> },
    { key: "contacts",  label: "Contacts",  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg> },
    { key: "broadcast", label: "Broadcast", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg> },
    { key: "media",     label: "Media Assets", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> },
    { key: "drips",     label: "Drip Follow-ups", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
    { key: "personas",  label: "AI Training", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 110 20 10 10 0 010-20zm0 0v20M12 2C6.48 2 2 6.48 2 12M12 2c5.52 0 10 4.48 10 10M2 12h20"/></svg> },
    { key: "analytics", label: "Analytics",  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
];

export default function Sidebar({
    setAuthenticated,
    activeTab,
    setActiveTab,
    donAwayMode,
    toggleDonAway,
    config,
    showApiKeyForm,
    setShowApiKeyForm,
}) {
    const handleLogout = () => {
        fetch("/api/auth/logout", { method: "POST", credentials: "include" })
            .finally(() => setAuthenticated(false));
    };

    return (
        <aside className="dash-sidebar">
            {/* Brand */}
            <div className="dash-sidebar__brand">
                <div className="dash-sidebar__icon">😈</div>
                <span className="dash-sidebar__name">Devil AI</span>
            </div>

            {/* Navigation */}
            <nav className="dash-sidebar__nav">
                {NAV.map((item) => (
                    <button
                        key={item.key}
                        className={`dash-nav-item ${activeTab === item.key ? "dash-nav-item--active" : ""}`}
                        onClick={() => setActiveTab(item.key)}
                    >
                        {item.icon}
                        {item.label}
                    </button>
                ))}

                <div className="dash-nav-divider" />

                {/* Don Away toggle */}
                <button
                    className="dash-nav-item"
                    onClick={toggleDonAway}
                    style={{ justifyContent: "space-between" }}
                >
                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
                        Don Away
                    </span>
                    <div className={`dash-toggle__track ${donAwayMode ? "dash-toggle__track--on" : ""}`} style={{ margin: 0 }}>
                        <div className="dash-toggle__thumb" />
                    </div>
                </button>

                {/* API Key */}
                <button
                    className="dash-nav-item"
                    onClick={() => setShowApiKeyForm(!showApiKeyForm)}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                    API Key
                    {config.hasApiKey
                        ? <span className="dash-nav-badge" style={{ marginLeft: "auto" }}>SET</span>
                        : <span className="dash-nav-badge dash-nav-badge--warn" style={{ marginLeft: "auto" }}>MISSING</span>
                    }
                </button>
            </nav>

            {/* Footer logout */}
            <div className="dash-sidebar__footer">
                <button className="dash-nav-item dash-nav-item--danger" onClick={handleLogout} style={{ width: "100%" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                    Sign Out
                </button>
            </div>
        </aside>
    );
}