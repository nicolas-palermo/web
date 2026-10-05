const FALLBACK_BACKGROUND_RGB01 = [41 / 255, 41 / 255, 41 / 255] as const;

const HEX_COLOR = /^#(?<hex>[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/iu;

const channelFromHex = (hex: string): number => Number.parseInt(hex, 16);

const parseHexColor = (value: string): [number, number, number] | null => {
  const match = HEX_COLOR.exec(value);
  const hex = match?.groups?.hex;
  if (!hex) {
    return null;
  }
  if (hex.length === 3) {
    const [redChar, greenChar, blueChar] = hex;
    return [
      channelFromHex(redChar + redChar) / 255,
      channelFromHex(greenChar + greenChar) / 255,
      channelFromHex(blueChar + blueChar) / 255,
    ];
  }
  return [
    channelFromHex(hex.slice(0, 2)) / 255,
    channelFromHex(hex.slice(2, 4)) / 255,
    channelFromHex(hex.slice(4, 6)) / 255,
  ];
};

const parseRgbChannel = (value: string): number | null => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const channel = Number(trimmed);
  if (!Number.isFinite(channel)) {
    return null;
  }
  return channel / 255;
};

const parseRgbColor = (value: string): [number, number, number] | null => {
  const open = value.indexOf("(");
  const close = value.lastIndexOf(")");
  if (open === -1 || close <= open) {
    return null;
  }
  const prefix = value.slice(0, open).trim().toLowerCase();
  if (prefix !== "rgb" && prefix !== "rgba") {
    return null;
  }
  const body = value.slice(open + 1, close).trim();
  const parts = body.includes(",")
    ? body.split(",")
    : body.split(/\s+/u).filter((part) => part !== "/");
  if (parts.length < 3) {
    return null;
  }
  const red = parseRgbChannel(parts[0]);
  const green = parseRgbChannel(parts[1]);
  const blue = parseRgbChannel(parts[2]);
  if (red === null || green === null || blue === null) {
    return null;
  }
  return [red, green, blue];
};

const parseCssColorToRgb01 = (
  value: string
): [number, number, number] | null => {
  const trimmed = value.trim();
  return parseHexColor(trimmed) ?? parseRgbColor(trimmed);
};

export const readThemeBackgroundClear = (): [
  number,
  number,
  number,
  number,
] => {
  if (typeof document === "undefined") {
    return [
      FALLBACK_BACKGROUND_RGB01[0],
      FALLBACK_BACKGROUND_RGB01[1],
      FALLBACK_BACKGROUND_RGB01[2],
      1,
    ];
  }

  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--color-background")
    .trim();
  const rgb = parseCssColorToRgb01(raw);
  if (!rgb) {
    return [
      FALLBACK_BACKGROUND_RGB01[0],
      FALLBACK_BACKGROUND_RGB01[1],
      FALLBACK_BACKGROUND_RGB01[2],
      1,
    ];
  }
  return [rgb[0], rgb[1], rgb[2], 1];
};
