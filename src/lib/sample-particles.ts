export interface LumaImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface SampledParticle {
  restX: number;
  restY: number;
  size: number;
  alpha: number;
}

interface SampleParticlesOptions {
  count: number;
  seed: number;
  minSize: number;
  maxSize: number;
  minAlpha: number;
  maxAlpha: number;
  lumaGamma: number;
  darkCutoff: number;
}

const UINT32_RANGE = 4_294_967_296;
const LCG_MULTIPLIER = 1_664_525;
const LCG_INCREMENT = 1_013_904_223;

const wrapUint32 = (value: number): number => {
  const wrapped = value % UINT32_RANGE;
  return wrapped < 0 ? wrapped + UINT32_RANGE : wrapped;
};

const createUnitRandom = (seed: number): (() => number) => {
  let state = wrapUint32(seed);
  return (): number => {
    state = wrapUint32(Math.imul(LCG_MULTIPLIER, state) + LCG_INCREMENT);
    return state / UINT32_RANGE;
  };
};

const rec709Luma = (
  red: number,
  green: number,
  blue: number,
  alpha: number
): number => {
  if (alpha < 8) {
    return 0;
  }
  return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
};

const pixelWeight = (
  luma: number,
  lumaGamma: number,
  darkCutoff: number
): number => {
  if (luma <= darkCutoff) {
    return 0;
  }
  return luma ** lumaGamma;
};

const lowerBound = (prefix: Float64Array, target: number): number => {
  let low = 0;
  let high = prefix.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (prefix[mid] < target) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
};

export const sampleParticlesFromLuma = (
  image: LumaImage,
  options: SampleParticlesOptions
): SampledParticle[] => {
  const { width, height, data } = image;
  const pixelCount = width * height;
  const weights = new Float64Array(pixelCount);
  const prefix = new Float64Array(pixelCount);
  let totalWeight = 0;

  const lumaValues = new Float32Array(pixelCount);
  let lumaSum = 0;
  for (let index = 0; index < pixelCount; index += 1) {
    const offset = index * 4;
    const luma = rec709Luma(
      data[offset],
      data[offset + 1],
      data[offset + 2],
      data[offset + 3]
    );
    lumaValues[index] = luma;
    lumaSum += luma;
  }
  // Light-background marks (logos) invert so ink is dense, paper is empty.
  const invertLuma = lumaSum / Math.max(pixelCount, 1) > 0.5;

  for (let index = 0; index < pixelCount; index += 1) {
    const luma = invertLuma ? 1 - lumaValues[index] : lumaValues[index];
    const weight = pixelWeight(luma, options.lumaGamma, options.darkCutoff);
    weights[index] = weight;
    totalWeight += weight;
    prefix[index] = totalWeight;
  }

  if (totalWeight <= 0) {
    throw new Error("Source image has no luminous pixels to sample.");
  }

  const random = createUnitRandom(options.seed);
  const particles: SampledParticle[] = [];
  const sizeRange = options.maxSize - options.minSize;
  const alphaRange = options.maxAlpha - options.minAlpha;

  for (let index = 0; index < options.count; index += 1) {
    const pick = random() * totalWeight;
    const pixelIndex = lowerBound(prefix, pick);
    const column = pixelIndex % width;
    const row = Math.floor(pixelIndex / width);
    const jitterX = random();
    const jitterY = random();
    const restX = (column + jitterX) / width;
    const restY = (row + jitterY) / height;
    const luma =
      weights[pixelIndex] <= 0
        ? options.darkCutoff
        : weights[pixelIndex] ** (1 / options.lumaGamma);
    const density = Math.min(1, Math.max(0, luma));

    particles.push({
      alpha: options.minAlpha + density * alphaRange,
      restX,
      restY,
      size: options.minSize + density * sizeRange,
    });
  }

  return particles;
};

export const imageDataFromBitmap = (
  image: CanvasImageSource,
  width: number,
  height: number
): LumaImage => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("Could not read the source image for particle sampling.");
  }
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height);
  return { data: pixels.data, height, width };
};

export const loadSourceImage = async (
  url: string
): Promise<HTMLImageElement> => {
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  await image.decode();
  return image;
};

export const packParticles = (
  particles: readonly SampledParticle[]
): ArrayBuffer => {
  const packed = new Float32Array(particles.length * 8);
  for (let index = 0; index < particles.length; index += 1) {
    const particle = particles[index];
    const offset = index * 8;
    packed[offset] = particle.restX;
    packed[offset + 1] = particle.restY;
    packed[offset + 2] = 0;
    packed[offset + 3] = 0;
    packed[offset + 4] = particle.restX;
    packed[offset + 5] = particle.restY;
    packed[offset + 6] = particle.size;
    packed[offset + 7] = particle.alpha;
  }
  return packed.buffer;
};
