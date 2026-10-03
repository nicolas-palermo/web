import {
  clock,
  compute,
  draw,
  frameLoop,
  init,
  storage,
  surface,
  texture,
} from "vgpu";
import type { FrameLoopHandle, Gpu } from "vgpu";

import packShader from "../shaders/pack.wgsl";
import particlesShader from "../shaders/particles.wgsl";
import simulateShader from "../shaders/simulate.wgsl";
import {
  DAMPING,
  DARK_LUMA_CUTOFF,
  LUMA_GAMMA,
  MAX_DOT_ALPHA,
  MAX_DOT_SIZE_PX,
  MAX_DPR,
  MAX_DT_SECONDS,
  MIN_DOT_ALPHA,
  MIN_DOT_SIZE_PX,
  PARTICLE_ATLAS_WIDTH,
  PARTICLE_BYTES,
  PARTICLE_COUNT,
  PARTICLE_SEED,
  REPULSION_RADIUS_CSS_PX,
  REPULSION_STRENGTH,
  SOURCE_IMAGE_URL,
  SPRING_STRENGTH,
  WORKGROUP_SIZE,
} from "./particle-constants";
import {
  imageDataFromBitmap,
  loadSourceImage,
  packParticles,
  sampleParticlesFromLuma,
} from "./sample-particles";

interface ParticleEffectOptions {
  onUnavailable: () => void;
}

interface PointerState {
  ndcX: number;
  ndcY: number;
  active: number;
}

const pointerFromEvent = (
  canvas: HTMLCanvasElement,
  event: PointerEvent
): PointerState => {
  const bounds = canvas.getBoundingClientRect();
  const width = Math.max(bounds.width, 1);
  const height = Math.max(bounds.height, 1);
  const x = (event.clientX - bounds.left) / width;
  const y = (event.clientY - bounds.top) / height;
  return {
    active: 1,
    ndcX: x * 2 - 1,
    ndcY: 1 - y * 2,
  };
};

const containScale = (
  imageAspect: number,
  viewWidth: number,
  viewHeight: number
): [number, number] => {
  const viewAspect = viewWidth / Math.max(viewHeight, 1);
  if (imageAspect > viewAspect) {
    return [1, viewAspect / imageAspect];
  }
  return [imageAspect / viewAspect, 1];
};

export const startParticleEffect = (
  canvas: HTMLCanvasElement,
  options: ParticleEffectOptions
): (() => void) => {
  let disposed = false;
  let loop: FrameLoopHandle | undefined;
  let gpu: Gpu | undefined;
  let visible = true;
  let pageHidden = document.hidden;
  let reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const pointer: PointerState = { active: 0, ndcX: 0, ndcY: 0 };
  const teardowns: (() => void)[] = [];
  const workgroups = Math.ceil(PARTICLE_COUNT / WORKGROUP_SIZE);

  const applyPointer = (event: PointerEvent): void => {
    const next = pointerFromEvent(canvas, event);
    pointer.active = next.active;
    pointer.ndcX = next.ndcX;
    pointer.ndcY = next.ndcY;
  };
  const deactivatePointer = (): void => {
    pointer.active = 0;
  };
  const syncPageHidden = (): void => {
    pageHidden = document.hidden;
  };

  const dispose = (): void => {
    if (disposed) {
      return;
    }
    disposed = true;
    loop?.stop();
    for (const teardown of teardowns.toReversed()) {
      teardown();
    }
    const activeGpu = gpu;
    queueMicrotask(() => {
      activeGpu?.dispose();
    });
  };

  const fail = (): void => {
    if (!disposed) {
      options.onUnavailable();
    }
    dispose();
  };

  void (async () => {
    let nextGpu: Gpu;
    try {
      nextGpu = await init({
        powerPreference: "high-performance",
      });
    } catch {
      fail();
      return;
    }

    gpu = nextGpu;
    if (disposed) {
      nextGpu.dispose();
      return;
    }

    try {
      const image = await loadSourceImage(SOURCE_IMAGE_URL);
      if (disposed) {
        return;
      }

      const luma = imageDataFromBitmap(
        image,
        image.naturalWidth,
        image.naturalHeight
      );
      const sampled = sampleParticlesFromLuma(luma, {
        count: PARTICLE_COUNT,
        darkCutoff: DARK_LUMA_CUTOFF,
        lumaGamma: LUMA_GAMMA,
        maxAlpha: MAX_DOT_ALPHA,
        maxSize: MAX_DOT_SIZE_PX,
        minAlpha: MIN_DOT_ALPHA,
        minSize: MIN_DOT_SIZE_PX,
        seed: PARTICLE_SEED,
      });
      const packed = packParticles(sampled);
      const imageAspect = luma.width / luma.height;
      const canvasSurface = surface(gpu, canvas, { dpr: [1, MAX_DPR] });
      teardowns.push(() => {
        canvasSurface.dispose();
      });

      const particleState = storage(gpu, PARTICLE_COUNT * PARTICLE_BYTES);
      particleState.write(packed);
      const atlasHeight = Math.ceil(PARTICLE_COUNT / PARTICLE_ATLAS_WIDTH);
      const particleAtlas = texture(gpu, {
        format: "rgba32float",
        kind: "2d",
        size: [PARTICLE_ATLAS_WIDTH, atlasHeight],
        usage: ["copy_dst", "storage_binding", "texture_binding"],
      });

      const simulation = compute(gpu, simulateShader, {
        constants: { WG: WORKGROUP_SIZE },
        label: "particle-sim",
        set: {
          particles: particleState,
          u: {
            damping: DAMPING,
            dt: 0,
            mouse_active: 0,
            mouse_ndc: [0, 0],
            particle_count: PARTICLE_COUNT,
            reduced_motion: reducedMotion ? 1 : 0,
            repulsion_radius: REPULSION_RADIUS_CSS_PX,
            repulsion_strength: REPULSION_STRENGTH,
            rest_scale: [1, 1],
            spring: SPRING_STRENGTH,
            viewport: [1, 1],
          },
        },
      });

      const packParticlesGpu = compute(gpu, packShader, {
        constants: { WG: WORKGROUP_SIZE },
        label: "particle-pack",
        set: {
          draw_tex: particleAtlas,
          particles: particleState,
          u: {
            atlas_width: PARTICLE_ATLAS_WIDTH,
            particle_count: PARTICLE_COUNT,
          },
        },
      });

      const particlesDraw = draw(gpu, {
        blend: "alpha",
        depth: false,
        instances: PARTICLE_COUNT,
        label: "particle-draw",
        set: {
          particles_tex: particleAtlas,
          u: {
            _pad: [0, 0, 0],
            atlas_width: PARTICLE_ATLAS_WIDTH,
            rest_scale: [1, 1],
            viewport: [
              Math.max(canvas.clientWidth, 1),
              Math.max(canvas.clientHeight, 1),
            ],
          },
        },
        shader: particlesShader,
        vertices: 6,
      });

      const syncFit = (): void => {
        const cssWidth = Math.max(canvas.clientWidth, 1);
        const cssHeight = Math.max(canvas.clientHeight, 1);
        const scale = containScale(imageAspect, cssWidth, cssHeight);
        simulation.set({
          u: {
            rest_scale: scale,
            viewport: [cssWidth, cssHeight],
          },
        });
        particlesDraw.set({
          u: {
            rest_scale: scale,
            viewport: [cssWidth, cssHeight],
          },
        });
      };

      const unsubscribeResize = canvasSurface.onResize(() => {
        syncFit();
      });
      teardowns.push(unsubscribeResize);

      const onMotion = (event: MediaQueryListEvent): void => {
        reducedMotion = event.matches;
      };

      canvas.addEventListener("pointermove", applyPointer);
      canvas.addEventListener("pointerdown", applyPointer);
      canvas.addEventListener("pointerleave", deactivatePointer);
      document.addEventListener("visibilitychange", syncPageHidden);
      const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      motionQuery.addEventListener("change", onMotion);
      teardowns.push(() => {
        canvas.removeEventListener("pointermove", applyPointer);
        canvas.removeEventListener("pointerdown", applyPointer);
        canvas.removeEventListener("pointerleave", deactivatePointer);
        document.removeEventListener("visibilitychange", syncPageHidden);
        motionQuery.removeEventListener("change", onMotion);
      });

      const intersection = new IntersectionObserver((entries) => {
        visible = (entries[0]?.intersectionRatio ?? 0) > 0;
      });
      intersection.observe(canvas);
      teardowns.push(() => {
        intersection.disconnect();
      });

      const time = clock(gpu);
      packParticlesGpu.dispatch(workgroups);
      loop = frameLoop(gpu, (frame) => {
        if (pageHidden || !visible) {
          time.advance(0);
          return;
        }

        simulation.set({
          u: {
            dt: Math.min(time.deltaTime, MAX_DT_SECONDS),
            mouse_active: pointer.active,
            mouse_ndc: [pointer.ndcX, pointer.ndcY],
            reduced_motion: reducedMotion ? 1 : 0,
          },
        });
        simulation.dispatch(workgroups);
        packParticlesGpu.dispatch(workgroups);
        frame.pass({ clear: [0, 0, 0, 1], target: canvasSurface }, (pass) => {
          pass.draw(particlesDraw);
        });
      });

      if (disposed) {
        loop.stop();
        gpu.dispose();
      }
    } catch {
      fail();
    }
  })();

  return dispose;
};
