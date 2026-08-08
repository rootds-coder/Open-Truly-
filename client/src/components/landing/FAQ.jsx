import { useState } from "react";
import "./FAQ.css";

const FAQS = [
    {
        q: "Is my WhatsApp account safe from getting banned?",
        a: "Yes! Devil AI uses native Baileys WebSockets directly connected to your phone via WhatsApp Web login. It mimics human typing speeds with random delay jitter and presence updates, avoiding automated spam triggers."
    },
    {
        q: "Do I need to pay monthly subscription fees?",
        a: "No! Devil AI is 100% open-source software. You bring your own free or pay-as-you-go OpenRouter/OpenAI key, giving you total control over costs (usually under $1/month for high volume)."
    },
    {
        q: "How does style & context training work?",
        a: "Simply export any WhatsApp chat as a .txt file from your phone and upload it via the Admin Console. Devil AI extracts your vocabulary, emojis, and sentence structure to reply exactly like you."
    },
    {
        q: "Does it support Voice Notes and Images?",
        a: "Yes! Incoming voice notes are transcribed in real time using OpenAI Whisper, and replies can be sent back as native Opus voice notes matching your persona. Images are analyzed using GPT-4o Vision."
    },
    {
        q: "What happens if a user is inactive for 20 minutes?",
        a: "The system automatically resets their state. When they message again after 20 minutes, the default Don Away notice and AI prompt are triggered once, maintaining clean conversation boundaries."
    }
];

export default function FAQ() {
    const [openIdx, setOpenIdx] = useState(0);

    const toggle = (idx) => {
        setOpenIdx(openIdx === idx ? -1 : idx);
    };

    return (
        <section className="faq-sec" id="faq">
            <div className="faq-inner">
                <div className="faq-header">
                    <div className="faq-label">Got Questions?</div>
                    <h2 className="faq-title">
                        Frequently Asked<br />
                        <span>Questions</span>
                    </h2>
                    <p className="faq-sub">
                        Everything you need to know about Devil AI engine and privacy.
                    </p>
                </div>

                <div className="faq-list">
                    {FAQS.map((faq, idx) => {
                        const isOpen = openIdx === idx;
                        return (
                            <div key={idx} className={`faq-item ${isOpen ? "faq-item--open" : ""}`}>
                                <button className="faq-question" onClick={() => toggle(idx)}>
                                    <span>{faq.q}</span>
                                    <span className="faq-icon">{isOpen ? "−" : "+"}</span>
                                </button>
                                {isOpen && (
                                    <div className="faq-answer">
                                        <p>{faq.a}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
