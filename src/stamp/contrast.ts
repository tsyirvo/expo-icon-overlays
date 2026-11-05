// Selects black or white text using WCAG relative luminance contrast.
const SHORT_HEX_LENGTH = 3;
const HEX_RADIX = 16;
const MAXIMUM_CHANNEL = 255;
const LINEAR_THRESHOLD = 0.040_45;
const LINEAR_DIVISOR = 12.92;
const GAMMA_OFFSET = 0.055;
const GAMMA_DIVISOR = 1.055;
const GAMMA_EXPONENT = 2.4;
const RED_WEIGHT = 0.2126;
const GREEN_WEIGHT = 0.7152;
const BLUE_WEIGHT = 0.0722;
const CONTRAST_OFFSET = 0.05;
const HEX_CHANNEL_WIDTH = 2;

function linearizeChannel(hex: string): number {
  const channel = Number.parseInt(hex, HEX_RADIX) / MAXIMUM_CHANNEL;
  return channel <= LINEAR_THRESHOLD
    ? channel / LINEAR_DIVISOR
    : ((channel + GAMMA_OFFSET) / GAMMA_DIVISOR) ** GAMMA_EXPONENT;
}

export function selectTextColor(background: string): string {
  const digits = background.slice(1);
  const hex =
    digits.length === SHORT_HEX_LENGTH
      ? [...digits].map((digit) => digit.repeat(HEX_CHANNEL_WIDTH)).join("")
      : digits;
  const red = linearizeChannel(hex.slice(0, HEX_CHANNEL_WIDTH));
  const green = linearizeChannel(
    hex.slice(HEX_CHANNEL_WIDTH, HEX_CHANNEL_WIDTH * 2)
  );
  const blue = linearizeChannel(hex.slice(HEX_CHANNEL_WIDTH * 2));
  const luminance =
    red * RED_WEIGHT + green * GREEN_WEIGHT + blue * BLUE_WEIGHT;
  const blackContrast = (luminance + CONTRAST_OFFSET) / CONTRAST_OFFSET;
  const whiteContrast = (1 + CONTRAST_OFFSET) / (luminance + CONTRAST_OFFSET);
  return blackContrast >= whiteContrast ? "#000000" : "#FFFFFF";
}
