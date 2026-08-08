export default function Header({ contactSearch, setContactSearch, activeTab, ready }) {
    const tabTitles = {
        dashboard: { title: "Overview", sub: "Real-time system metrics and activity" },
        chats:     { title: "WhatsApp", sub: "Live message stream and QR setup" },
        contacts:  { title: "Contacts", sub: "Manage contacts and AI personas" },
        personas:  { title: "AI Training", sub: "Upload and manage reference context" },
        analytics: { title: "Analytics", sub: "User accounts and system traffic" },
        settings:  { title: "Settings", sub: "System configuration" },
    };

    const current = tabTitles[activeTab] || tabTitles.dashboard;

    return (
        <header className="dash-header">
            <div className="dash-header__left">
                <div className="dash-header__title">{current.title}</div>
                <div className="dash-header__subtitle">{current.sub}</div>
            </div>
            <div className="dash-header__right">
                <div className="dash-header__search">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    <input
                        placeholder="Search contacts…"
                        value={contactSearch}
                        onChange={(e) => setContactSearch(e.target.value)}
                    />
                </div>
                <div className="dash-header__pill">
                    <span className={`dash-header__pill-dot ${ready ? "" : "dash-header__pill-dot--off"}`} />
                    {ready ? "Connected" : "Disconnected"}
                </div>
            </div>
        </header>
    );
}