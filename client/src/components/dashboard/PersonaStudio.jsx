import { useState, useEffect } from "react";
import "./PersonaStudio.css";

const PRESET_TEMPLATES = [
    {
        name: "Sales Closer 🎯",
        emoji: "🎯",
        description: "Persuasive, closes deals fast, answers product questions",
        temperature: 0.6,
        prompt: `You are a top-performing Sales Representative for our business.
Your goal is to answer potential customer questions clearly, build value, and guide them to make a purchase or book a demo.

Rules:
- Be confident, polite, and persuasive.
- Keep responses concise and focused on benefits (maximum 2-3 short sentences).
- Always include a call-to-action (e.g., "Would you like me to reserve a spot for you?").
- Never sound robotic or generic.`
    },
    {
        name: "Support Specialist 🎧",
        emoji: "🎧",
        description: "Patient, helpful, resolves issues using Knowledge Base",
        temperature: 0.4,
        prompt: `You are a Customer Support Specialist for our platform.
Your objective is to help customers troubleshoot issues and answer their product/pricing inquiries accurately using the Knowledge Base.

Rules:
- Be warm, professional, and empathetic.
- Provide step-by-step solutions when asked how to fix an issue.
- If information is missing from the Knowledge Base, politely inform the user that a support representative will follow up.`
    },
    {
        name: "Real Estate Assistant 🏡",
        emoji: "🏡",
        description: "Handles property inquiries, schedules visits",
        temperature: 0.5,
        prompt: `You are an automated Real Estate Assistant.
Your goal is to assist clients with property listings, pricing details, and scheduling site visits.

Rules:
- Be polite, professional, and helpful.
- Ask for their preferred location, budget, and property type (1BHK/2BHK/Villa).
- Prompt them to schedule a call or site visit.`
    },
    {
        name: "Sarcastic Buddy 😈",
        emoji: "😈",
        description: "Witty, roasted responses, highly entertaining",
        temperature: 0.85,
        prompt: `You are a sarcastic, witty friend on WhatsApp.
Your goal is to give humorous, direct, slightly roasted responses without being mean.

Rules:
- Zero assistant talk. Never say "How can I help you".
- Keep replies under 15 words.
- Use clever comeback humor and slang.`
    }
];

export default function PersonaStudio({
    chats,
    loadChats,
    uploading,
    uploadStatus,
    handleUploadChat,
    deleteChat
}) {
    const [subTab, setSubTab] = useState("rag"); // "rag" | "personas"
    const [urlInput, setUrlInput] = useState("");
    const [scraping, setScraping] = useState(false);
    const [scrapeStatus, setScrapeStatus] = useState({ text: "", type: "" });

    // Custom Personas State
    const [customPersonas, setCustomPersonas] = useState([]);
    const [showPersonaForm, setShowPersonaForm] = useState(false);
    const [editingKey, setEditingKey] = useState(null);
    const [name, setName] = useState("");
    const [emoji, setEmoji] = useState("🤖");
    const [description, setDescription] = useState("");
    const [systemPrompt, setSystemPrompt] = useState("");
    const [temperature, setTemperature] = useState(0.7);
    const [personaStatus, setPersonaStatus] = useState({ text: "", type: "" });

    // Load custom personas
    const fetchPersonas = async () => {
        try {
            const res = await fetch("/api/personas", { credentials: "include" });
            const data = await res.json();
            if (data.ok) {
                setCustomPersonas(data.personas || []);
            }
        } catch (_) {}
    };

    useEffect(() => {
        fetchPersonas();
    }, []);

    // Web Scraping Handler
    const handleScrapeUrl = async (e) => {
        e.preventDefault();
        const url = urlInput.trim();
        if (!url || !url.startsWith("http")) {
            setScrapeStatus({ text: "Enter a valid website URL (e.g. https://example.com)", type: "error" });
            return;
        }

        setScraping(true);
        setScrapeStatus({ text: "Scraping website content…", type: "info" });

        try {
            const res = await fetch("/api/scrape-url", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url }),
                credentials: "include",
            });
            const data = await res.json();
            if (res.ok && data.ok) {
                setScrapeStatus({ text: data.message, type: "success" });
                setUrlInput("");
                loadChats();
            } else {
                setScrapeStatus({ text: data.error || "Failed to scrape website.", type: "error" });
            }
        } catch (_) {
            setScrapeStatus({ text: "Network error scraping website.", type: "error" });
        }
        setScraping(false);
    };

    // Load Preset Template into Form
    const applyPreset = (preset) => {
        setName(preset.name);
        setEmoji(preset.emoji);
        setDescription(preset.description);
        setSystemPrompt(preset.prompt);
        setTemperature(preset.temperature);
    };

    // Save Custom Persona
    const handleSavePersona = async (e) => {
        e.preventDefault();
        if (!name.trim() || !systemPrompt.trim()) {
            setPersonaStatus({ text: "Name and System Prompt are required.", type: "error" });
            return;
        }

        try {
            const res = await fetch("/api/personas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    key: editingKey,
                    name: name.trim(),
                    emoji,
                    description: description.trim(),
                    systemPrompt: systemPrompt.trim(),
                    temperature,
                }),
                credentials: "include",
            });
            const data = await res.json();
            if (res.ok && data.ok) {
                setPersonaStatus({ text: data.message, type: "success" });
                setShowPersonaForm(false);
                setEditingKey(null);
                setName("");
                setDescription("");
                setSystemPrompt("");
                fetchPersonas();
            } else {
                setPersonaStatus({ text: data.error || "Failed to save persona.", type: "error" });
            }
        } catch (_) {
            setPersonaStatus({ text: "Failed to save persona.", type: "error" });
        }
    };

    // Delete Custom Persona
    const handleDeletePersona = async (key, pName) => {
        if (!confirm(`Delete custom persona "${pName}"?`)) return;
        try {
            const res = await fetch(`/api/personas/${encodeURIComponent(key)}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (res.ok) {
                fetchPersonas();
            }
        } catch (_) {}
    };

    return (
        <div className="ps-container">
            {/* Top Subnav Tabs */}
            <div className="ps-tabs-bar">
                <button
                    className={`ps-tab-btn ${subTab === "rag" ? "ps-tab-btn--active" : ""}`}
                    onClick={() => setSubTab("rag")}
                >
                    🧠 Knowledge Base RAG (PDF / Web / Chat)
                </button>
                <button
                    className={`ps-tab-btn ${subTab === "personas" ? "ps-tab-btn--active" : ""}`}
                    onClick={() => setSubTab("personas")}
                >
                    🎭 Persona Builder & System Prompt Studio ({3 + customPersonas.length})
                </button>
            </div>

            {/* ══════════════════════════════════════════════════════════
               SUBTAB 1: KNOWLEDGE BASE RAG (PDF / Web Scraping / Files)
               ══════════════════════════════════════════════════════════ */}
            {subTab === "rag" && (
                <div className="dash-grid-equal">
                    {/* Left: Upload / Scrape Box */}
                    <div className="dash-card">
                        <div className="dash-card__head">
                            <div>
                                <div className="dash-card__title">📥 Add Knowledge Source</div>
                                <div className="dash-card__sub">Train AI on PDF product catalogs, site content, or chats</div>
                            </div>
                        </div>

                        <div className="dash-card__body" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                            {/* File Upload (.txt / .pdf) */}
                            <form onSubmit={handleUploadChat} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                <label className="dash-label">1. Upload Documents (.pdf or .txt)</label>
                                <label className="dash-dropzone">
                                    <input type="file" accept=".txt,.pdf" disabled={uploading} />
                                    <span className="dash-dropzone__icon">📄</span>
                                    <div className="dash-dropzone__text">
                                        Click to select a PDF Catalog or WhatsApp Export<br />
                                        <span style={{ fontSize: 12, color: "#64748b" }}>Supports .pdf product catalogs & .txt chat logs</span>
                                    </div>
                                </label>

                                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94a3b8", cursor: "pointer" }}>
                                    <input type="checkbox" name="asClosest" defaultChecked />
                                    Set as Primary Closest Person style reference
                                </label>

                                <button type="submit" disabled={uploading} className="dash-btn dash-btn--primary">
                                    {uploading ? "Uploading Document…" : "Upload Knowledge Document"}
                                </button>

                                {uploadStatus.text && (
                                    <div className={`dash-alert dash-alert--${uploadStatus.type === "success" ? "success" : "error"}`}>
                                        {uploadStatus.text}
                                    </div>
                                )}
                            </form>

                            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 20 }}>
                                {/* Web Scraping Tool */}
                                <form onSubmit={handleScrapeUrl} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    <label className="dash-label">2. Scrape Website URL into Knowledge Base</label>
                                    <div style={{ display: "flex", gap: 8 }}>
                                        <input
                                            type="url"
                                            className="dash-input"
                                            placeholder="https://mysite.com/pricing"
                                            value={urlInput}
                                            onChange={(e) => setUrlInput(e.target.value)}
                                            disabled={scraping}
                                        />
                                        <button type="submit" className="dash-btn dash-btn--primary" disabled={scraping || !urlInput.trim()}>
                                            {scraping ? "Scraping…" : "Scrape Site"}
                                        </button>
                                    </div>

                                    {scrapeStatus.text && (
                                        <div className={`dash-alert dash-alert--${scrapeStatus.type}`}>
                                            {scrapeStatus.text}
                                        </div>
                                    )}
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* Right: Knowledge Base Roster */}
                    <div className="dash-card">
                        <div className="dash-card__head">
                            <div>
                                <div className="dash-card__title">📚 Trained Knowledge Sources</div>
                                <div className="dash-card__sub">{chats.length} active documents in MongoDB</div>
                            </div>
                        </div>

                        <div className="dash-card__body">
                            <div className="dash-file-list">
                                {chats.length > 0 ? (
                                    chats.map((f, i) => (
                                        <div className="dash-file-chip" key={i}>
                                            <div className="dash-file-chip__name">
                                                <span style={{ fontSize: 14 }}>
                                                    {f.docType === "pdf" ? "📕" : f.docType === "url" ? "🌐" : "📄"}
                                                </span>
                                                {f.filename}
                                                {f.docType && <span className="ps-doc-badge">{f.docType.toUpperCase()}</span>}
                                                {f.isClosest && <span className="dash-file-chip__badge">PRIMARY</span>}
                                            </div>
                                            <button
                                                className="dash-contact__del"
                                                onClick={(e) => deleteChat(f.filename, e)}
                                                title="Delete document"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ textAlign: "center", color: "#64748b", fontSize: 13, padding: "40px 0" }}>
                                        No knowledge documents uploaded yet.<br />
                                        Upload a PDF or scrape a website URL on the left.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════
               SUBTAB 2: PERSONA BUILDER & SYSTEM PROMPT STUDIO
               ══════════════════════════════════════════════════════════ */}
            {subTab === "personas" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {/* Active Personas Header Card */}
                    <div className="dash-card">
                        <div className="dash-card__head">
                            <div>
                                <div className="dash-card__title">🎭 Persona Studio</div>
                                <div className="dash-card__sub">Manage built-in personas or build custom AI agents</div>
                            </div>
                            <button
                                className="dash-btn dash-btn--primary"
                                onClick={() => {
                                    setShowPersonaForm(true);
                                    setEditingKey(null);
                                    setName("");
                                    setDescription("");
                                    setSystemPrompt("");
                                }}
                            >
                                ➕ Create Custom Persona
                            </button>
                        </div>

                        <div className="dash-card__body">
                            <div className="ps-persona-grid">
                                {/* Built-in 1: Devil */}
                                <div className="ps-persona-card">
                                    <div className="ps-persona-card__head">
                                        <div className="ps-persona-icon">😈</div>
                                        <div>
                                            <div className="ps-persona-name">Devil's AI</div>
                                            <div className="ps-persona-tag">Default System Bot</div>
                                        </div>
                                    </div>
                                    <div className="ps-persona-desc">Savage, intelligent assistant, solves complex problems.</div>
                                    <div className="ps-persona-meta">
                                        <span>Temp: 0.78</span>
                                        <span className="dash-badge dash-badge--ok">BUILT-IN</span>
                                    </div>
                                </div>

                                {/* Built-in 2: Dhruv */}
                                <div className="ps-persona-card">
                                    <div className="ps-persona-card__head">
                                        <div className="ps-persona-icon">🤝</div>
                                        <div>
                                            <div className="ps-persona-name">Dhruv Mode</div>
                                            <div className="ps-persona-tag">Casual Guy</div>
                                        </div>
                                    </div>
                                    <div className="ps-persona-desc">Hinglish slang, WhatsApp brotherly vibe.</div>
                                    <div className="ps-persona-meta">
                                        <span>Temp: 0.65</span>
                                        <span className="dash-badge dash-badge--ok">BUILT-IN</span>
                                    </div>
                                </div>

                                {/* Built-in 3: Annu */}
                                <div className="ps-persona-card">
                                    <div className="ps-persona-card__head">
                                        <div className="ps-persona-icon">💚</div>
                                        <div>
                                            <div className="ps-persona-name">Annu Mode</div>
                                            <div className="ps-persona-tag">Girlfriend Persona</div>
                                        </div>
                                    </div>
                                    <div className="ps-persona-desc">Warm, sweet, teasing girlfriend persona.</div>
                                    <div className="ps-persona-meta">
                                        <span>Temp: 0.65</span>
                                        <span className="dash-badge dash-badge--ok">BUILT-IN</span>
                                    </div>
                                </div>

                                {/* Custom Personas list */}
                                {customPersonas.map((p) => (
                                    <div key={p.key} className="ps-persona-card ps-persona-card--custom">
                                        <div className="ps-persona-card__head">
                                            <div className="ps-persona-icon">{p.emoji || "🤖"}</div>
                                            <div>
                                                <div className="ps-persona-name">{p.name}</div>
                                                <div className="ps-persona-tag">Custom Agent</div>
                                            </div>
                                        </div>
                                        <div className="ps-persona-desc">{p.description || p.systemPrompt.slice(0, 70) + "…"}</div>
                                        <div className="ps-persona-meta">
                                            <span>Temp: {p.temperature}</span>
                                            <div style={{ display: "flex", gap: 6 }}>
                                                <button
                                                    className="dash-btn dash-btn--ghost"
                                                    style={{ padding: "3px 8px", fontSize: 11 }}
                                                    onClick={() => {
                                                        setEditingKey(p.key);
                                                        setName(p.name);
                                                        setEmoji(p.emoji || "🤖");
                                                        setDescription(p.description || "");
                                                        setSystemPrompt(p.systemPrompt);
                                                        setTemperature(p.temperature || 0.7);
                                                        setShowPersonaForm(true);
                                                    }}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="dash-btn dash-btn--danger"
                                                    style={{ padding: "3px 8px", fontSize: 11 }}
                                                    onClick={() => handleDeletePersona(p.key, p.name)}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Custom Persona Form Modal ── */}
            {showPersonaForm && (
                <div className="dash-modal-overlay" onClick={() => setShowPersonaForm(false)}>
                    <div className="dash-modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
                        <button className="dash-modal__close" onClick={() => setShowPersonaForm(false)}>✕</button>
                        <div className="dash-modal__title">
                            {editingKey ? "✏️ Edit Persona Agent" : "➕ Create Custom Persona Agent"}
                        </div>

                        {/* Preset templates bar */}
                        <div style={{ margin: "16px 0", padding: "12px", background: "rgba(124,58,237,0.1)", borderRadius: 12, border: "1px solid rgba(124,58,237,0.2)" }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa", marginBottom: 8 }}>
                                💡 Or click a Quick Template to auto-fill:
                            </div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {PRESET_TEMPLATES.map((tmpl, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        className="dash-btn dash-btn--ghost"
                                        style={{ padding: "5px 10px", fontSize: 11 }}
                                        onClick={() => applyPreset(tmpl)}
                                    >
                                        {tmpl.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <form onSubmit={handleSavePersona} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            <div style={{ display: "flex", gap: 12 }}>
                                <div style={{ width: 80 }}>
                                    <label className="dash-label">Emoji</label>
                                    <input
                                        type="text"
                                        className="dash-input"
                                        value={emoji}
                                        onChange={(e) => setEmoji(e.target.value)}
                                        style={{ textAlign: "center", fontSize: 18 }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className="dash-label">Persona Name</label>
                                    <input
                                        type="text"
                                        className="dash-input"
                                        placeholder="e.g. Sales Closer / Support Bot"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="dash-label">Short Description</label>
                                <input
                                    type="text"
                                    className="dash-input"
                                    placeholder="e.g. Answers product questions & books sales demos"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="dash-label">System Prompt (AI Persona Instructions)</label>
                                <textarea
                                    className="dash-input"
                                    rows="6"
                                    placeholder="Write system instructions telling the AI who it is, how to speak, and how to behave..."
                                    value={systemPrompt}
                                    onChange={(e) => setSystemPrompt(e.target.value)}
                                    required
                                    style={{ fontFamily: "monospace", fontSize: 13, resize: "vertical" }}
                                />
                            </div>

                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                    <label className="dash-label" style={{ margin: 0 }}>Creativity / Temperature</label>
                                    <span style={{ fontSize: 12, color: "#a78bfa", fontWeight: 700 }}>{temperature}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="1.0"
                                    step="0.05"
                                    value={temperature}
                                    onChange={(e) => setTemperature(Number(e.target.value))}
                                    style={{ width: "100%", accentColor: "#7c3aed" }}
                                />
                                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                                    Lower = more consistent & precise. Higher = more creative & conversational.
                                </div>
                            </div>

                            {personaStatus.text && (
                                <div className={`dash-alert dash-alert--${personaStatus.type}`}>
                                    {personaStatus.text}
                                </div>
                            )}

                            <div className="dash-modal__actions" style={{ marginTop: 8 }}>
                                <button type="submit" className="dash-btn dash-btn--primary" style={{ flex: 1 }}>
                                    Save Persona Agent
                                </button>
                                <button type="button" className="dash-btn dash-btn--ghost" onClick={() => setShowPersonaForm(false)}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
