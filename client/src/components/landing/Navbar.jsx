import { useState, useEffect } from "react";
import "./Navbar.css";

export default function Navbar({ onDashboardClick, theme, toggleTheme }) {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 30);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <header className={`nav-wrapper ${scrolled ? "nav-wrapper--scrolled" : ""}`}>
            <nav className="nav-pill">
                <a href="#" className="nav-brand">
                    <div className="nav-logo">
                        <span className="nav-logo-icon">😈</span>
                    </div>
                    <span className="nav-title">
                        Devil<span className="nav-title-dim">.AI</span>
                    </span>
                </a>

                <ul className="nav-links">
                    <li><a href="#features">Features</a></li>
                    <li><a href="#demo">Live Demo</a></li>
                    <li><a href="#personas">Personas</a></li>
                    <li><a href="#how-it-works">How It Works</a></li>
                    <li><a href="#faq">FAQ</a></li>
                </ul>

                <div className="nav-actions">
                    <button
                        className="nav-theme-btn"
                        onClick={toggleTheme}
                        title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
                        aria-label="Toggle theme"
                    >
                        {theme === "dark" ? (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="5"/>
                                <line x1="12" y1="1" x2="12" y2="3"/>
                                <line x1="12" y1="21" x2="12" y2="23"/>
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                                <line x1="1" y1="12" x2="3" y2="12"/>
                                <line x1="21" y1="12" x2="23" y2="12"/>
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                            </svg>
                        ) : (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                            </svg>
                        )}
                    </button>

                    <button className="nav-cta-btn" onClick={onDashboardClick}>
                        <span className="nav-cta-pulse" />
                        <span>Launch Console</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                    </button>
                </div>
            </nav>
        </header>
    );
}