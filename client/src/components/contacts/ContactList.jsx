import ContactCard from "./ContactCard";

export default function ContactList({ contacts, selectedJid, setSelectedJid, updateContactMode, deleteContact, deleteAllContacts }) {
    return (
        <div className="dash-card" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div className="dash-card__head">
                <div>
                    <div className="dash-card__title">Active Contacts</div>
                    <div className="dash-card__sub">{contacts.length} synced from WhatsApp</div>
                </div>
                {contacts.length > 0 && (
                    <button
                        className="dash-btn dash-btn--danger"
                        style={{ padding: "5px 10px", fontSize: 11 }}
                        onClick={deleteAllContacts}
                        title="Delete all contacts and chat history from database"
                    >
                        🗑️ Purge All
                    </button>
                )}
            </div>
            <div className="dash-contacts">
                {contacts.length > 0 ? (
                    contacts.map((c) => (
                        <ContactCard
                            key={c.jid}
                            contact={c}
                            isSelected={selectedJid === c.jid}
                            onClick={() => setSelectedJid(c.jid)}
                            onModeChange={updateContactMode}
                            onDelete={deleteContact}
                        />
                    ))
                ) : (
                    <div style={{ padding: "40px 20px", textAlign: "center", color: "#374151", fontSize: 13, lineHeight: 1.6 }}>
                        <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>👥</div>
                        No contacts yet.<br />
                        <span style={{ fontSize: 12, color: "#1f2937" }}>
                            Contacts appear automatically when WhatsApp messages arrive.
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}