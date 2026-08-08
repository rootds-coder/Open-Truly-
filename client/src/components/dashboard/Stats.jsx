export default function Stats({ analytics, ready }) {
    const cards = [
        {
            icon: "💬",
            bg: "rgba(34,197,94,0.12)",
            label: "Messages Today",
            value: analytics.messagesToday ?? 0,
            meta: "Since midnight",
        },
        {
            icon: "👥",
            bg: "rgba(124,58,237,0.12)",
            label: "Active Contacts",
            value: analytics.totalContacts ?? 0,
            meta: "In MongoDB",
        },
        {
            icon: "⚡",
            bg: "rgba(245,158,11,0.12)",
            label: "API Calls Today",
            value: analytics.apiCallsToday ?? 0,
            meta: "OpenRouter requests",
        },
        {
            icon: ready ? "🟢" : "🔴",
            bg: ready ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
            label: "WhatsApp Status",
            value: ready ? "Online" : "Offline",
            meta: ready ? "Baileys connected" : "Scan QR to link",
        },
    ];

    return (
        <div className="dash-stats">
            {cards.map((c, i) => (
                <div className="dash-stat" key={i}>
                    <div className="dash-stat__icon" style={{ background: c.bg }}>
                        {c.icon}
                    </div>
                    <div className="dash-stat__label">{c.label}</div>
                    <div className="dash-stat__value">{c.value}</div>
                    <div className="dash-stat__meta">{c.meta}</div>
                </div>
            ))}
        </div>
    );
}