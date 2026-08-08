import "./Features.css";

const features = [
    {
        icon: "🎭",
        tag: "Personas",
        title: "Multiple AI Personalities",
        desc: "Switch between Devil, Dhruv, Annu or any persona you create. Each has its own tone, vocabulary, and response style that feels genuinely human.",
    },
    {
        icon: "⚡",
        tag: "Automation",
        title: "Instant Response Engine",
        desc: "Sub-second reply latency using Baileys WebSocket + OpenRouter inference. Contacts never see a delay — the conversation flows naturally.",
    },
    {
        icon: "🧠",
        tag: "Training",
        title: "Train on Your Own Chats",
        desc: "Upload any WhatsApp export (.txt) and Devil AI learns your exact writing patterns, slang, and emotional responses. It becomes you.",
    },
    {
        icon: "📊",
        tag: "Analytics",
        title: "Full Conversation Visibility",
        desc: "Every message, every API call, every contact interaction logged in real time. Live logs stream directly to your admin console.",
    },
    {
        icon: "🔑",
        tag: "Control",
        title: "Don Away Mode",
        desc: "Toggle AI control on or off per contact or globally in one click. You always stay in charge of when and how the AI engages.",
    },
    {
        icon: "🛡️",
        tag: "Security",
        title: "Your Key, Your Data",
        desc: "Bring your own OpenRouter API key. Nothing is shared. Your conversations stay in your MongoDB instance, on your server.",
    },
];

export default function Features() {
    return (
        <section className="feat" id="features">
            <div className="feat__inner">
                <div className="feat__header">
                    <div className="feat__label">What it does</div>
                    <h2 className="feat__title">
                        Not a chatbot.<br />
                        <span>An AI version of you.</span>
                    </h2>
                    <p className="feat__desc">
                        Built for people who want intelligent automation without losing personality.
                    </p>
                </div>

                <div className="feat__grid">
                    {features.map((f, i) => (
                        <div className="feat__card" key={i}>
                            <div className="feat__card-top">
                                <div className="feat__icon">{f.icon}</div>
                                <span className="feat__tag">{f.tag}</span>
                            </div>
                            <h3 className="feat__card-title">{f.title}</h3>
                            <p className="feat__card-desc">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}