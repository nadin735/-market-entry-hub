import React, { useEffect, useRef, useState } from "react";

// One 3D hero object: the logo as a layered object with real depth (back ring,
// logo plate, front ring) that follows the pointer. Pure CSS 3D, no WebGL, so it
// is tiny. Static (just the children) for reduced motion and touch devices.
export default function HeroObject({ children }) {
  const wrap = useRef(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(pointer: coarse)");
    const update = () => setLive(!rm.matches && !coarse.matches);
    update();
    rm.addEventListener && rm.addEventListener("change", update);
    return () => rm.removeEventListener && rm.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!live) return;
    const el = wrap.current;
    let raf = 0, rx = 0, ry = 0;
    const move = (e) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
      const dy = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
      ry = Math.max(-1, Math.min(1, dx * 2)) * 14;
      rx = Math.max(-1, Math.min(1, dy * 2)) * -10;
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; el.style.setProperty("--rx", rx + "deg"); el.style.setProperty("--ry", ry + "deg"); el.classList.add("is-driven"); });
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => { window.removeEventListener("pointermove", move); cancelAnimationFrame(raf); };
  }, [live]);

  if (!live) return <div style={{ position: "relative", zIndex: 1 }}>{children}</div>;
  return (
    <div className="hero3d" aria-hidden={false}>
      <style>{`
        .hero3d{perspective:1000px;display:flex;justify-content:center;padding:16px 0 36px}
        .hero3d-stage{position:relative;transform-style:preserve-3d;transform:rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));transition:transform .25s ease-out;animation:hero3d-sway 14s ease-in-out infinite}
        .hero3d-stage.is-driven{animation:none}
        .hero3d-ring{position:absolute;left:50%;top:50%;border:1px solid var(--accent);border-radius:50%;pointer-events:none}
        .hero3d-ring.back{width:100%;aspect-ratio:1;margin:0;transform:translate(-50%,-50%) translateZ(-70px);opacity:.35}
        .hero3d-ring.front{width:74%;aspect-ratio:1;transform:translate(-50%,-50%) translateZ(60px);opacity:.5}
        .hero3d-plate{transform:translateZ(0)}
        .hero3d-shadow{position:absolute;left:12%;right:12%;bottom:-26px;height:14px;border-radius:50%;background:rgba(0,0,0,.55);filter:blur(10px);transform:translateZ(-80px)}
        @keyframes hero3d-sway{0%,100%{transform:rotateX(2deg) rotateY(-7deg)}50%{transform:rotateX(-2deg) rotateY(7deg)}}
        @media (prefers-reduced-motion: reduce){.hero3d-stage{animation:none;transition:none}}
      `}</style>
      <div ref={wrap} className="hero3d-stage">
        <div className="hero3d-ring back" />
        <div className="hero3d-plate">{children}</div>
        <div className="hero3d-ring front" />
        <div className="hero3d-shadow" />
      </div>
    </div>
  );
}
