import "./Personas.css";

const personas = [
    {
        emoji: "😈",
        name: "Devil",
        role: "The Savage",
        color: "#ef4444",
        colorDim: "rgba(239, 68, 68, 0.12)",
        colorBorder: "rgba(239, 68, 68, 0.25)",
        traits: ["Blunt", "Sharp wit", "No filter"],
        sample: "Yeah no. That's a terrible idea and you know it. Try again.",
    },
    {
        emoji: "🤝",
        name: "Dhruv",
        role: "The Professional",
        color: "#7c3aed",
        colorDim: "rgba(124, 58, 237, 0.12)",
        colorBorder: "rgba(124, 58, 237, 0.25)",
        traits: ["Mature", "Thoughtful", "Reliable"],
        sample: "Got it. Give me a moment to look into this properly and I'll get back to you.",
    },
    {
        emoji: "💚",
        name: "Annu",
        role: "The Warm One",
        color: "#22c55e",
        colorDim: "rgba(34, 197, 94, 0.12)",
        colorBorder: "rgba(34, 197, 94, 0.25)",
        traits: ["Kind", "Empathetic", "Caring"],
        sample: "Aww don't worry! I'm here. Tell me everything 🌸",
    },
];

export default function Personas({ onDashboardClick }) {
    return (
        <section className="personas" id="personas">
            <div className="personas__inner">
                <div className="personas__header">
                    <div className="personas__label">AI Personas</div>
                    <h2 className="personas__title">
                        Three faces.<br />
                        <span>One AI.</span>
                    </h2>
                    <p className="personas__desc">
                        Each persona is trained to feel like a distinct human — not a robot trying to sound human.
                    </p>
                </div>

                <div className="personas__grid">
                    {personas.map((p, i) => (
                        <div className="persona" key={i} style={{ "--p-color": p.color, "--p-dim": p.colorDim, "--p-border": p.colorBorder }}>
                            <div className="persona__top">
                                <div className="persona__emoji">{p.emoji}</div>
                                <div className="persona__info">
                                    <div className="persona__name">{p.name}</div>
                                    <div className="persona__role">{p.role}</div>
                                </div>
                            </div>

                            <div className="persona__traits">
                                {p.traits.map((t) => (
                                    <span className="persona__trait" key={t}>{t}</span>
                                ))}
                            </div>

                            <div className="persona__sample">
                                <div className="persona__sample-label">Sample reply</div>
                                <div className="persona__sample-text">"{p.sample}"</div>
                            </div>

                            <button className="persona__btn" onClick={onDashboardClick}>
                                Activate {p.name}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}