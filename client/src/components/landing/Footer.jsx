import "./Footer.css";

export default function Footer() {
    return (
        <footer className="footer">
            <div className="footer__inner">
                <div className="footer__brand">
                    <div className="footer__logo">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                        </svg>
                    </div>
                    <span className="footer__brand-name">Devil AI</span>
                </div>
                <p className="footer__copy">
                    © 2026 Devil AI · Built with 💜 for automation
                </p>
                <div className="footer__links">
                    <a href="#features">Features</a>
                    <a href="#personas">Personas</a>
                    <a href="#pricing">Pricing</a>
                </div>
            </div>
        </footer>
    );
}