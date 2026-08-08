import "./HowItWorks.css";

const STEPS = [
    {
        num: "01",
        icon: "📱",
        title: "Scan WhatsApp QR",
        desc: "Open your Admin Console, scan the Baileys QR code with WhatsApp on your phone. Takes under 10 seconds.",
        badge: "Zero Setup"
    },
    {
        num: "02",
        icon: "🧠",
        title: "Train Style & Pick Persona",
        desc: "Upload reference WhatsApp chat exports (.txt) to train AI on your exact vocabulary, tone, and humor.",
        badge: "Custom Context"
    },
    {
        num: "03",
        icon: "⚡",
        title: "Autopilot Activated",
        desc: "Walk away! Devil AI handles incoming messages, voice notes, and images across contacts 24/7 with zero latency.",
        badge: "24/7 Automation"
    }
];

export default function HowItWorks() {
    return (
        <section className="hiw-sec" id="how-it-works">
            <div className="hiw-inner">
                <div className="hiw-header">
                    <div className="hiw-label">Step-by-step</div>
                    <h2 className="hiw-title">
                        Ready to automate in<br />
                        <span>3 simple steps</span>
                    </h2>
                    <p className="hiw-sub">
                        No complex flows or coding required. Connect once, set your style, and let AI run.
                    </p>
                </div>

                <div className="hiw-grid">
                    {STEPS.map((s, i) => (
                        <div className="hiw-card" key={i}>
                            <div className="hiw-card-top">
                                <span className="hiw-num">{s.num}</span>
                                <span className="hiw-badge">{s.badge}</span>
                            </div>
                            <div className="hiw-icon">{s.icon}</div>
                            <h3 className="hiw-card-title">{s.title}</h3>
                            <p className="hiw-card-desc">{s.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
