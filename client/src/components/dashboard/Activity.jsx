const LEVEL_COLOR = {
    error:   "#ef4444",
    warn:    "#f59e0b",
    success: "#22c55e",
    info:    "#9ca3af",
};

export default function Activity({ sysLogs, clearLogs }) {
    return (
        <div className="dash-card">
            <div className="dash-card__head">
                <div>
                    <div className="dash-card__title">System Logs</div>
                    <div className="dash-card__sub">Live server event stream</div>
                </div>
                {sysLogs.length > 0 && (
                    <button className="dash-btn dash-btn--ghost" onClick={clearLogs} style={{ padding: "6px 12px", fontSize: 12 }}>
                        Clear
                    </button>
                )}
            </div>

            <div className="dash-card__body" style={{ padding: "8px 16px" }}>
                <div className="dash-log">
                    {sysLogs.length > 0 ? (
                        sysLogs.map((item, i) => {
                            const level = item.type || "info";
                            const color = LEVEL_COLOR[level] || LEVEL_COLOR.info;
                            return (
                                <div className="dash-log-row" key={i}>
                                    <div className="dash-log-dot" style={{ background: color }} />
                                    <span className="dash-log-time">{item.time || "—"}</span>
                                    <span className={`dash-log-text dash-log-text--${level}`}>
                                        [{level.toUpperCase()}] {item.text}
                                    </span>
                                </div>
                            );
                        })
                    ) : (
                        <div className="dash-log-empty">Waiting for server events…</div>
                    )}
                </div>
            </div>
        </div>
    );
}