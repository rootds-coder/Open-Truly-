export default function ContactCard({ contact, isSelected, onClick, onModeChange, onDelete }) {
    const initial = (contact.name || contact.jid || "?")[0].toUpperCase();

    return (
        <div className={`dash-contact ${isSelected ? "dash-contact--active" : ""}`} onClick={onClick}>
            <div className="dash-contact__avatar">{initial}</div>
            <div className="dash-contact__info">
                <div className="dash-contact__name">{contact.name || contact.jid?.split("@")[0] || "Unknown"}</div>
                <div className="dash-contact__jid">{contact.jid?.split("@")[0]}</div>
            </div>
            <div className="dash-contact__mode" onClick={(e) => e.stopPropagation()}>
                <select
                    value={contact.mode || "devil"}
                    onChange={(e) => onModeChange(contact.jid, e.target.value)}
                >
                    <option value="devil">😈 Devil</option>
                    <option value="boy">🤝 Dhruv</option>
                    <option value="girl">💚 Annu</option>
                    <option value="off">⏸️ Paused / Off</option>
                </select>
            </div>
            <button
                className="dash-contact__del"
                onClick={(e) => { e.stopPropagation(); onDelete(contact.jid, e); }}
                title="Delete contact"
            >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                </svg>
            </button>
        </div>
    );
}