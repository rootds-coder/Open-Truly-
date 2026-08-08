const metrics = [
    { label: "Automation Rate", value: 92, color: "#7c3aed" },
    { label: "Accuracy", value: 97, color: "#22c55e" },
    { label: "Response Rate", value: 89, color: "#f59e0b" },
];

function Ring({ value, color }) {
    const r = 38;
    const circ = 2 * Math.PI * r;
    const offset = circ - (circ * value) / 100;
    return (
        <svg width="90" height="90" viewBox="0 0 90 90">
            <circle cx="45" cy="45" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            <circle
                cx="45" cy="45" r={r} fill="none"
                stroke={color} strokeWidth="6"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform="rotate(-90 45 45)"
                style={{ transition: "stroke-dashoffset 0.8s ease" }}
            />
            <text x="45" y="49" textAnchor="middle" fill="#f1f5f9" fontSize="14" fontWeight="800" fontFamily="Inter,sans-serif">
                {value}%
            </text>
        </svg>
    );
}

export default function Analytics() {
    return (
        <div className="dash-card">
            <div className="dash-card__head">
                <div>
                    <div className="dash-card__title">AI Performance</div>
                    <div className="dash-card__sub">Calculated over last 7 days</div>
                </div>
            </div>
            <div className="dash-card__body">
                <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", gap: 12 }}>
                    {metrics.map((m) => (
                        <div key={m.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                            <Ring value={m.value} color={m.color} />
                            <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, textAlign: "center" }}>{m.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}