"use client";

import { useEffect, useRef, useState } from "react";

import { startParticleEffect } from "../lib/start-particle-effect";

const ParticlePage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    return startParticleEffect(canvas, {
      onUnavailable: () => {
        setUnavailable(true);
      },
    });
  }, []);

  return (
    <main className="particle-stage relative m-0 h-dvh w-full overflow-hidden">
      <canvas
        aria-label="Interactive particle reconstruction of the Techint mark"
        className="particle-stage block h-full w-full cursor-none touch-none"
        ref={canvasRef}
      />
      {unavailable ? (
        <p className="particle-fallback absolute inset-0 flex items-center justify-center p-6 text-center text-sm">
          WebGPU is not available in this browser, so the particle canvas cannot
          run.
        </p>
      ) : null}
    </main>
  );
};

export default ParticlePage;
