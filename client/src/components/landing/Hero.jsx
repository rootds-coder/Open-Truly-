import "./Hero.css";

const messages = [
    { from: "user", text: "Hey, you there?" },
    { from: "ai", text: "Always. What do you need? 😈" },
    { from: "user", text: "Can you pretend to be Dhruv?" },
    { from: "ai", text: "Already switched. Talk to me normally, I'll handle it." },
    { from: "user", text: "This is actually insane lol" },
    { from: "ai", text: "That's the point 🤙" },
];

export default function Hero({ onDashboardClick }) {
    return (
        <section className="hero">
            {/* Mesh gradient background */}
            <div className="hero__mesh" aria-hidden="true">
                <div className="hero__orb hero__orb--1" />
                <div className="hero__orb hero__orb--2" />
                <div className="hero__orb hero__orb--3" />
                <div className="hero__noise" />
            </div>

            <div className="hero__inner">
                {/* Left column */}
                <div className="hero__left">
                    <div className="hero__tag">
                        <span className="hero__tag-dot" />
                        AI-Powered · WhatsApp Automation
                    </div>

                    <h1 className="hero__title">
                        Your contacts think<br />
                        <span className="hero__title-accent">you're always online.</span><br />
                        You're not.
                    </h1>

                    <p className="hero__subtitle">
                        Devil AI replies as you — your tone, your humor, your style —
                        across any WhatsApp conversation. Set a persona, walk away.
                    </p>

                    <div className="hero__actions">
                        <button className="hero__btn hero__btn--primary" onClick={onDashboardClick}>
                            <span>Get Started Free</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M5 12h14M12 5l7 7-7 7"/>
                            </svg>
                        </button>
                        <a href="#demo" className="hero__btn hero__btn--ghost">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                            Try Interactive Demo
                        </a>
                    </div>

                    <div className="hero__stats">
                        <div className="hero__stat">
                            <strong>120K+</strong>
                            <span>Messages processed</span>
                        </div>
                        <div className="hero__stat-divider" />
                        <div className="hero__stat">
                            <strong>&lt;45ms</strong>
                            <span>Socket Latency</span>
                        </div>
                        <div className="hero__stat-divider" />
                        <div className="hero__stat">
                            <strong>24/7</strong>
                            <span>Autopilot Active</span>
                        </div>
                    </div>

                    {/* Tech Badges */}
                    <div className="hero__tech-row">
                        <span className="hero__tech-label">Built with:</span>
                        <span className="hero__tech-chip">⚡ Baileys WASocket</span>
                        <span className="hero__tech-chip">🤖 OpenRouter AI</span>
                        <span className="hero__tech-chip">🎙️ Whisper Voice</span>
                        <span className="hero__tech-chip">🔒 Private MongoDB</span>
                    </div>
                </div>

                {/* Right column — chat card */}
                <div className="hero__right">
                    <div className="hero__card">
                        <div className="hero__card-header">
                            <div className="hero__card-avatar">D</div>
                            <div>
                                <div className="hero__card-name">Devil AI</div>
                                <div className="hero__card-status">
                                    <span className="hero__card-dot" />
                                    Online · replying as Dhruv
                                </div>
                            </div>
                            <div className="hero__card-badge">LIVE</div>
                        </div>

                        <div className="hero__chat">
                            {messages.map((m, i) => (
                                <div
                                    key={i}
                                    className={`hero__msg hero__msg--${m.from}`}
                                    style={{ animationDelay: `${i * 0.15}s` }}
                                >
                                    {m.text}
                                </div>
                            ))}
                        </div>

                        <div className="hero__card-footer">
                            <div className="hero__typing">
                                <span /><span /><span />
                            </div>
                            <span className="hero__card-footer-label">AI is composing…</span>
                        </div>
                    </div>

                    {/* Floating badges */}
                    <div className="hero__badge hero__badge--a">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#22c55e"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                        Message delivered
                    </div>
                    <div className="hero__badge hero__badge--b">
                        😈 Persona active
                    </div>
                </div>
            </div>
        </section>
    );
}