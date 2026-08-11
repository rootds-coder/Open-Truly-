import { useState } from "react";
import Navbar from "../components/landing/Navbar";
import Hero from "../components/landing/Hero";
import Features from "../components/landing/Features";
import DemoPlayground from "../components/landing/DemoPlayground";
import Personas from "../components/landing/Personas";
import HowItWorks from "../components/landing/HowItWorks";
import Comparison from "../components/landing/Comparison";
import FAQ from "../components/landing/FAQ";
import CTA from "../components/landing/CTA";
import Footer from "../components/landing/Footer";
import "../components/landing/ThemeLight.css";
import "../components/landing/ThemeDark.css";

export default function Landing({ authenticated, setAuthenticated }) {
    const [theme, setTheme] = useState(() => {
        try {
            return localStorage.getItem("landing_theme") || "dark";
        } catch {
            return "dark";
        }
    });

    const [showLogin, setShowLogin] = useState(false);
    const [showRegister, setShowRegister] = useState(false);
    const [passwordInput, setPasswordInput] = useState("");
    const [regUsername, setRegUsername] = useState("");
    const [regPassword, setRegPassword] = useState("");
    const [regKey, setRegKey] = useState("");
    const [authError, setAuthError] = useState("");

    const toggleTheme = () => {
        const nextTheme = theme === "dark" ? "light" : "dark";
        setTheme(nextTheme);
        try {
            localStorage.setItem("landing_theme", nextTheme);
        } catch (_) {}
    };

    const handleDashboardClick = () => {
        if (authenticated) {
            setAuthenticated(true);
        } else {
            setShowLogin(true);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        const password = passwordInput.trim();
        if (!password) {
            setAuthError("Password is required");
            return;
        }
        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
                credentials: "include"
            });
            const data = await res.json();
            if (res.ok && data.ok) {
                setAuthenticated(true);
                setPasswordInput("");
                setAuthError("");
                setShowLogin(false);
            } else {
                setAuthError(data.error || "Invalid security password");
            }
        } catch {
            setAuthError("Sign in failed. Check connection.");
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        const username = regUsername.trim();
        const password = regPassword.trim();
        const key = regKey.trim();
        if (!username || !password) {
            setAuthError("Username and password are required");
            return;
        }
        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password, apiKey: key }),
                credentials: "include"
            });
            const data = await res.json();
            if (res.ok && data.ok) {
                setAuthenticated(true);
                setRegUsername("");
                setRegPassword("");
                setRegKey("");
                setAuthError("");
                setShowRegister(false);
            } else {
                setAuthError(data.error || "Registration failed");
            }
        } catch {
            setAuthError("Registration failed. Try again.");
        }
    };

    return (
        <div className="tc-landing" data-theme={theme}>
            <div className="tc-ambient" aria-hidden="true">
                <div className="tc-orb tc-orb-1" />
                <div className="tc-orb tc-orb-2" />
                <div className="tc-orb tc-orb-3" />
                <div className="tc-grid-bg" />
            </div>

            <Navbar
                onDashboardClick={handleDashboardClick}
                theme={theme}
                toggleTheme={toggleTheme}
            />

            <main>
                <Hero onDashboardClick={handleDashboardClick} />
                <Features />
                <DemoPlayground />
                <Personas onDashboardClick={handleDashboardClick} />
                <HowItWorks />
                <Comparison />
                <FAQ />
                <CTA onDashboardClick={handleDashboardClick} />
            </main>

            <Footer />

            {/* ── Sign In Modal ── */}
            {showLogin && (
                <div className="tc-modal-overlay" onClick={() => setShowLogin(false)}>
                    <div className="tc-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="tc-modal-close" onClick={() => setShowLogin(false)}>✕</button>
                        <h2>Sign In</h2>
                        <p>Enter security password to access admin console.</p>
                        
                        <form onSubmit={handleLogin}>
                            <div className="tc-form-group">
                                <label className="tc-label">Security Password</label>
                                <input
                                    type="password"
                                    className="tc-input"
                                    placeholder="Enter password"
                                    value={passwordInput}
                                    onChange={(e) => { setPasswordInput(e.target.value); setAuthError(""); }}
                                    autoFocus
                                    required
                                />
                            </div>

                            {authError && <div className="tc-form-error">{authError}</div>}

                            <button type="submit" className="tc-btn tc-btn-primary" style={{ width: "100%", marginTop: "12px" }}>
                                Authenticate →
                            </button>

                            <p style={{ marginTop: "20px", fontSize: "0.85rem", textAlign: "center", color: "var(--text-secondary)" }}>
                                Need a personal workspace?{" "}
                                <button
                                    type="button"
                                    style={{ color: "var(--green)", background: "none", border: "none", cursor: "pointer", fontWeight: "600" }}
                                    onClick={() => { setShowLogin(false); setShowRegister(true); setAuthError(""); }}
                                >
                                    Create Account
                                </button>
                            </p>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Register Modal ── */}
            {showRegister && (
                <div className="tc-modal-overlay" onClick={() => setShowRegister(false)}>
                    <div className="tc-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="tc-modal-close" onClick={() => setShowRegister(false)}>✕</button>
                        <h2>Create Workspace</h2>
                        <p>Register a personal account session.</p>

                        <form onSubmit={handleRegister}>
                            <div className="tc-form-group">
                                <label className="tc-label">Choose Username</label>
                                <input
                                    type="text"
                                    className="tc-input"
                                    placeholder="Enter username"
                                    value={regUsername}
                                    onChange={(e) => { setRegUsername(e.target.value); setAuthError(""); }}
                                    required
                                />
                            </div>

                            <div className="tc-form-group">
                                <label className="tc-label">Choose Password</label>
                                <input
                                    type="password"
                                    className="tc-input"
                                    placeholder="Enter password"
                                    value={regPassword}
                                    onChange={(e) => { setRegPassword(e.target.value); setAuthError(""); }}
                                    required
                                />
                            </div>

                            <div className="tc-form-group">
                                <label className="tc-label">OpenRouter API Key (Optional)</label>
                                <input
                                    type="password"
                                    className="tc-input"
                                    placeholder="sk-or-v1-..."
                                    value={regKey}
                                    onChange={(e) => setRegKey(e.target.value)}
                                />
                            </div>

                            {authError && <div className="tc-form-error">{authError}</div>}

                            <button type="submit" className="tc-btn tc-btn-primary" style={{ width: "100%", marginTop: "12px" }}>
                                Register & Launch →
                            </button>

                            <p style={{ marginTop: "20px", fontSize: "0.85rem", textAlign: "center", color: "var(--text-secondary)" }}>
                                Already registered?{" "}
                                <button
                                    type="button"
                                    style={{ color: "var(--green)", background: "none", border: "none", cursor: "pointer", fontWeight: "600" }}
                                    onClick={() => { setShowRegister(false); setShowLogin(true); setAuthError(""); }}
                                >
                                    Sign In
                                </button>
                            </p>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}