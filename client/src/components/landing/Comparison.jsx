import "./Comparison.css";

const COMPARISONS = [
    {
        feature: "Conversation Quality",
        old: "Robotic, scripted, rigid flowcharts",
        devil: "Human-grade AI persona with custom vocabulary & slang"
    },
    {
        feature: "Multimodal Support",
        old: "Text only (media breaks bot)",
        devil: "Text + Voice Notes (Whisper TTS) + Image Vision (GPT-4o)"
    },
    {
        feature: "Personalization",
        old: "Generic company template",
        devil: "Trained on your actual WhatsApp chat exports (.txt)"
    },
    {
        feature: "Cost Model",
        old: "$99 - $299 / month subscription",
        devil: "Free Open-Source · Bring your own OpenRouter key"
    },
    {
        feature: "WhatsApp Engine",
        old: "Slow web scraping / fragile extensions",
        devil: "Native Baileys WebSockets (sub-second latency)"
    },
    {
        feature: "Data Ownership",
        old: "Stored on third-party SaaS cloud",
        devil: "100% Private MongoDB · Runs on your server"
    }
];

export default function Comparison() {
    return (
        <section className="comp-sec">
            <div className="comp-inner">
                <div className="comp-header">
                    <div className="comp-label">Why Devil AI</div>
                    <h2 className="comp-title">
                        Traditional Chatbots vs.<br />
                        <span>Devil AI Engine</span>
                    </h2>
                    <p className="comp-sub">
                        Stop overpaying for rigid bots that sound like automated IVR systems.
                    </p>
                </div>

                <div className="comp-table-wrap">
                    <table className="comp-table">
                        <thead>
                            <tr>
                                <th>Capability</th>
                                <th>Traditional SaaS Bots ❌</th>
                                <th className="comp-highlight">Devil AI 😈</th>
                            </tr>
                        </thead>
                        <tbody>
                            {COMPARISONS.map((c, i) => (
                                <tr key={i}>
                                    <td className="comp-feature">{c.feature}</td>
                                    <td className="comp-old">{c.old}</td>
                                    <td className="comp-devil">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#22c55e"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                                        <span>{c.devil}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}
