"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { startParticleEffect } from "../lib/particles";
import { particleSettings } from "../lib/particles/settings";

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
      {unavailable ? (
        <Image
          alt="Techint"
          className="object-contain mix-blend-lighten"
          fill
          sizes="(min-width: 64rem) 64rem, 100vw"
          src={particleSettings.sourceImageUrl}
        />
      ) : (
        <canvas
          aria-label="Interactive particle reconstruction of the Techint mark"
          className="block h-full w-full cursor-none touch-none"
          ref={canvasRef}
        />
      )}
    </div>
  );
};
