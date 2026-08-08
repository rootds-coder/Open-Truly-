import { useEffect, useRef } from "react";

export default function SnowCanvas() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        let animationFrameId;

        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };
        window.addEventListener("resize", handleResize);

        // Generate ~45 delicate snow particles
        const particleCount = 45;
        const particles = Array.from({ length: particleCount }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 2 + 0.8,
            density: Math.random() * particleCount,
            opacity: Math.random() * 0.5 + 0.25,
            speedY: Math.random() * 0.7 + 0.3,
            swingSpeed: Math.random() * 0.02 + 0.005,
            step: Math.random() * Math.PI * 2,
        }));

        const render = () => {
            ctx.clearRect(0, 0, width, height);

            for (let i = 0; i < particleCount; i++) {
                const p = particles[i];
                p.step += p.swingSpeed;
                p.y += p.speedY;
                p.x += Math.sin(p.step) * 0.5;

                // Reset particle if it drifts below the screen
                if (p.y > height) {
                    p.y = -10;
                    p.x = Math.random() * width;
                }
                if (p.x > width) p.x = 0;
                if (p.x < 0) p.x = width;

                // Draw soft glowing snow flake
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2, false);
                ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
                ctx.shadowBlur = 4;
                ctx.shadowColor = "rgba(255, 255, 255, 0.6)";
                ctx.fill();
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener("resize", handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                pointerEvents: "none",
                zIndex: 1,
            }}
        />
    );
}
