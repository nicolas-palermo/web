"use client";

import { useRef, useState } from "react";

import { startParticleEffect } from "../lib/particles";

export const TechintParticles = () => {
  const disposeRef = useRef<(() => void) | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const canvasRef = (canvas: HTMLCanvasElement | null) => {
    disposeRef.current?.();
    disposeRef.current = null;
    if (!canvas) {
      return;
    }
    disposeRef.current = startParticleEffect(canvas, {
      onUnavailable: () => {
        setUnavailable(true);
      },
    });
  };

  return (
    <div className="relative h-full w-full">
      <canvas
        aria-label="Interactive particle reconstruction of the Techint mark"
        className="block h-full w-full cursor-none touch-none"
        ref={canvasRef}
      />
      {unavailable ? (
        <p className="text-foreground/55 absolute inset-0 flex items-center justify-center p-6 text-center text-sm">
          WebGPU is not available in this browser, so the particle canvas cannot
          run.
        </p>
      ) : null}
    </div>
  );
};
