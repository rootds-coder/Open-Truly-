import "./CTA.css";

export default function CTA({ onDashboardClick }) {
    return (
        <section className="cta" id="pricing">
            <div className="cta__inner">
                <div className="cta__glow" aria-hidden="true" />

                <div className="cta__box">
                    <div className="cta__label">Get started today</div>
                    <h2 className="cta__title">
                        Stop replying manually.<br />
                        Let AI be you.
                    </h2>
                    <p className="cta__desc">
                        Free to set up. Bring your own OpenRouter key. No subscriptions, no middlemen.
                        Your conversations stay yours.
                    </p>
                    <div className="cta__actions">
                        <button className="cta__btn cta__btn--primary" onClick={onDashboardClick}>
                            Launch Your Console →
                        </button>
                        <div className="cta__note">
                            <span>🔒</span> No credit card required
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}