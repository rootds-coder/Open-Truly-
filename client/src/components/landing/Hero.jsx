import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { motion } from "framer-motion";
import { ArrowRight, Play, CheckCircle2, Zap, Shield, Sparkles } from "lucide-react";
import "./Hero.css";

const messages = [
  { from: "user", text: "Hey, you there?" },
  { from: "ai", text: "Always. What do you need? 😈" },
  { from: "user", text: "Can you reply as Dhruv?" },
  { from: "ai", text: "Already switched persona. Talk normally, I've got it. 🤙" },
];

export default function Hero({ onDashboardClick }) {
  const heroRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(".hero__tag", { opacity: 0, y: -20, duration: 0.6 })
        .from(".hero__title span", { opacity: 0, y: 30, stagger: 0.15, duration: 0.8 }, "-=0.4")
        .from(".hero__subtitle", { opacity: 0, y: 20, duration: 0.6 }, "-=0.4")
        .from(".hero__actions", { opacity: 0, scale: 0.95, duration: 0.5 }, "-=0.3")
        .from(".hero__stats", { opacity: 0, y: 15, duration: 0.5 }, "-=0.2")
        .from(".hero__card", { opacity: 0, x: 40, duration: 0.8 }, "-=0.6");
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className="hero" ref={heroRef}>
      {/* Mesh orb background */}
      <div className="hero__mesh" aria-hidden="true">
        <div className="hero__orb hero__orb--1" />
        <div className="hero__orb hero__orb--2" />
        <div className="hero__orb hero__orb--3" />
        <div className="hero__noise" />
      </div>

      <div className="hero__inner">
        {/* Left Column */}
        <div className="hero__left">
          <div className="hero__tag">
            <span className="hero__tag-dot" />
            <span>AI-Powered WhatsApp Autonomous Engine</span>
          </div>

          <h1 className="hero__title">
            <span>Your contacts think</span><br />
            <span className="hero__title-accent">you're always online.</span><br />
            <span>You're not.</span>
          </h1>

          <p className="hero__subtitle">
            Devil AI replies as you — learning your tone, style, and context — across any WhatsApp chat. Set a persona, walk away.
          </p>

          <div className="hero__actions">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="hero__btn hero__btn--primary"
              onClick={onDashboardClick}
            >
              <span>Launch Command Console</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
            <a href="#demo" className="hero__btn hero__btn--ghost">
              <Play className="w-4 h-4 fill-current text-purple-400" />
              <span>Interactive Sandbox</span>
            </a>
          </div>

          <div className="hero__stats">
            <div className="hero__stat">
              <strong>120K+</strong>
              <span>Messages Processed</span>
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
            <span className="hero__tech-label">Powered by:</span>
            <span className="hero__tech-chip">⚡ Baileys WASocket</span>
            <span className="hero__tech-chip">🤖 OpenRouter AI</span>
            <span className="hero__tech-chip">🎙️ Whisper Voice</span>
            <span className="hero__tech-chip">🔒 MongoDB Engine</span>
          </div>
        </div>

        {/* Right Column — Live Chat Mockup */}
        <div className="hero__right">
          <div className="hero__card">
            <div className="hero__card-header">
              <div className="hero__card-avatar">D</div>
              <div>
                <div className="hero__card-name">Devil AI</div>
                <div className="hero__card-status">
                  <span className="hero__card-dot" />
                  Online · Replying as Dhruv
                </div>
              </div>
              <div className="hero__card-badge">LIVE</div>
            </div>

            <div className="hero__chat">
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.15 }}
                  className={`hero__msg hero__msg--${m.from}`}
                >
                  {m.text}
                </motion.div>
              ))}
            </div>

            <div className="hero__card-footer">
              <div className="hero__typing">
                <span /><span /><span />
              </div>
              <span className="hero__card-footer-label">AI is generating response…</span>
            </div>
          </div>

          {/* Floating Badges */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="hero__badge hero__badge--a"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>WASocket Sync Active</span>
          </motion.div>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="hero__badge hero__badge--b"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>😈 Persona Active</span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}