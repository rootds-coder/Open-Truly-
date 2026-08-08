import { useState, useEffect, useRef } from "react";
import "./DemoPlayground.css";

const PRESET_PERSONAS = [
    {
        id: "devil",
        emoji: "😈",
        name: "Devil Mode",
        tag: "Savage & Direct",
        color: "#ef4444",
        promptPlaceholder: "Ask Devil anything (e.g. 'Should I call my ex?')",
        presets: [
            "Should I text my ex at 2 AM?",
            "What do you think about my startup idea?",
            "Can you write a polite rejection message?"
        ],
        replies: {
            "Should I text my ex at 2 AM?": "Zero chance. Put the phone down, drink water, and go to sleep. You'll thank me tomorrow. 😈",
            "What do you think about my startup idea?": "If you need validation from an AI, it's probably not ready. Build a prototype and prove me wrong. ⚡",
            "Can you write a polite rejection message?": "Sure: 'Thanks for reaching out, but I'm focusing on other priorities right now.' Simple, no fluff."
        },
        defaultReply: "I tell you what you need to hear, not what you want to hear. What's on your mind? 😈"
    },
    {
        id: "boy",
        emoji: "🤝",
        name: "Dhruv Mode",
        tag: "Hinglish & Casual",
        color: "#7c3aed",
        promptPlaceholder: "Ask Dhruv anything (e.g. 'Bro what is the plan?')",
        presets: [
            "Bhai kya scene hai aaj raat ka?",
            "Can you explain React state simply?",
            "Coding seekhna difficult hai kya?"
        ],
        replies: {
            "Bhai kya scene hai aaj raat ka?": "Bhai ekdum set scene hai! Pehle kaam khatam kar, fir chill karte hai 🤙",
            "Can you explain React state simply?": "State = Component ki memory! Whenever state updates, React UI re-render kar deta hai. Simple scene hai boss!",
            "Coding seekhna difficult hai kya?": "Starting me thoda lagta hai, par daily 1 hour dega toh 2-3 months me pro ho jayega bhai! 🚀"
        },
        defaultReply: "Haan bhai bol! Kya scene hai? Main hoon yahan 🤝"
    },
    {
        id: "girl",
        emoji: "💚",
        name: "Annu Mode",
        tag: "Warm & Caring",
        color: "#22c55e",
        promptPlaceholder: "Talk to Annu (e.g. 'Had a long day at work')",
        presets: [
            "Had such a tiring day today 😭",
            "Give me some quick motivation!",
            "What should I eat for dinner?"
        ],
        replies: {
            "Had such a tiring day today 😭": "Aww rest up please! 🌸 Drink some warm water and take a good break. You worked super hard today!",
            "Give me some quick motivation!": "You're doing amazing! Just take one small step at a time, you've got this ✨",
            "What should I eat for dinner?": "Something comforting! Maybe hot soup or your favorite comfort food 🍲 Don't skip dinner okay?"
        },
        defaultReply: "Hii! I'm here for you 🌸 Tell me how your day went!"
    }
];

export default function DemoPlayground() {
    const [selectedPersona, setSelectedPersona] = useState(PRESET_PERSONAS[0]);
    const [inputQuery, setInputQuery] = useState("");
    const [chatLog, setChatLog] = useState([
        { sender: "ai", text: PRESET_PERSONAS[0].defaultReply }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const chatContainerRef = useRef(null);

    // Switch persona
    const handleSelectPersona = (persona) => {
        setSelectedPersona(persona);
        setChatLog([
            { sender: "ai", text: persona.defaultReply }
        ]);
        setInputQuery("");
    };

    // Auto scroll chat
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatLog, isTyping]);

    // Send user message
    const handleSend = (textToSend) => {
        const text = textToSend || inputQuery.trim();
        if (!text || isTyping) return;

        const updatedLogs = [...chatLog, { sender: "user", text }];
        setChatLog(updatedLogs);
        setInputQuery("");
        setIsTyping(true);

        // Simulate AI response delay
        setTimeout(() => {
            const aiReply = selectedPersona.replies[text] ||
                `[${selectedPersona.name}]: Got it! Once linked to WhatsApp, I respond to your contacts 24/7 in this exact voice. ✨`;
            setChatLog((prev) => [...prev, { sender: "ai", text: aiReply }]);
            setIsTyping(false);
        }, 900);
    };

    return (
        <section className="demo-sec" id="demo">
            <div className="demo-inner">
                {/* Section Header */}
                <div className="demo-header">
                    <div className="demo-badge">
                        <span className="demo-badge-dot" />
                        Interactive Sandbox
                    </div>
                    <h2 className="demo-title">
                        Test Drive the AI Personas<br />
                        <span>In Real Time</span>
                    </h2>
                    <p className="demo-sub">
                        Click a persona below and test how Devil AI adapts its tone, slang, and response style.
                    </p>
                </div>

                {/* Persona Selector Tabs */}
                <div className="demo-tabs">
                    {PRESET_PERSONAS.map((p) => (
                        <button
                            key={p.id}
                            className={`demo-tab ${selectedPersona.id === p.id ? "demo-tab--active" : ""}`}
                            style={{ "--p-color": p.color }}
                            onClick={() => handleSelectPersona(p)}
                        >
                            <span className="demo-tab-icon">{p.emoji}</span>
                            <div className="demo-tab-info">
                                <span className="demo-tab-name">{p.name}</span>
                                <span className="demo-tab-tag">{p.tag}</span>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Live Simulator Card */}
                <div className="demo-box" style={{ "--p-color": selectedPersona.color }}>
                    {/* Top bar */}
                    <div className="demo-box-head">
                        <div className="demo-box-user">
                            <div className="demo-box-avatar">{selectedPersona.emoji}</div>
                            <div>
                                <div className="demo-box-name">{selectedPersona.name}</div>
                                <div className="demo-box-status">
                                    <span className="demo-status-dot" /> Active · Simulating WhatsApp Engine
                                </div>
                            </div>
                        </div>
                        <div className="demo-box-tag">LIVE DEMO</div>
                    </div>

                    {/* Presets Row */}
                    <div className="demo-presets">
                        <span className="demo-presets-label">Try asking:</span>
                        {selectedPersona.presets.map((preset, idx) => (
                            <button
                                key={idx}
                                className="demo-preset-chip"
                                onClick={() => handleSend(preset)}
                                disabled={isTyping}
                            >
                                "{preset}"
                            </button>
                        ))}
                    </div>

                    {/* Chat Messages */}
                    <div className="demo-chat" ref={chatContainerRef}>
                        {chatLog.map((msg, i) => (
                            <div key={i} className={`demo-msg demo-msg--${msg.sender}`}>
                                <div className="demo-msg-bubble">
                                    {msg.text}
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="demo-msg demo-msg--ai">
                                <div className="demo-msg-bubble demo-typing">
                                    <span /><span /><span />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Bar */}
                    <form
                        className="demo-input-bar"
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSend();
                        }}
                    >
                        <input
                            type="text"
                            placeholder={selectedPersona.promptPlaceholder}
                            value={inputQuery}
                            onChange={(e) => setInputQuery(e.target.value)}
                            disabled={isTyping}
                        />
                        <button type="submit" className="demo-send-btn" disabled={!inputQuery.trim() || isTyping}>
                            <span>Send</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                            </svg>
                        </button>
                    </form>
                </div>
            </div>
        </section>
    );
}
