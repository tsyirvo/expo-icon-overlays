// Composes straight-alpha overlay pixels using the surface's blend operation.
const CHANNELS_PER_PIXEL = 4;
const ALPHA_CHANNEL = 3;
const MAXIMUM_CHANNEL = 255;

export type Blend = "over" | "atop" | "erase";

export function blendPixels(
  destination: Buffer,
  source: Buffer,
  blend: Blend
): void {
  for (
    let offset = 0;
    offset < destination.length;
    offset += CHANNELS_PER_PIXEL
  ) {
    const sourceAlpha =
      source.readUInt8(offset + ALPHA_CHANNEL) / MAXIMUM_CHANNEL;
    if (sourceAlpha === 0) {
      continue;
    }
    const destinationAlpha =
      destination.readUInt8(offset + ALPHA_CHANNEL) / MAXIMUM_CHANNEL;
    if (blend === "erase") {
      destination[offset + ALPHA_CHANNEL] = Math.round(
        destinationAlpha * (1 - sourceAlpha) * MAXIMUM_CHANNEL
      );
      continue;
    }
    const outputAlpha =
      blend === "atop"
        ? destinationAlpha
        : sourceAlpha + destinationAlpha * (1 - sourceAlpha);
    const sourceWeight =
      blend === "atop" ? sourceAlpha * destinationAlpha : sourceAlpha;
    for (let channel = 0; channel < ALPHA_CHANNEL; channel += 1) {
      const sourceColor = source.readUInt8(offset + channel);
      const destinationColor = destination.readUInt8(offset + channel);
      destination[offset + channel] =
        outputAlpha === 0
          ? 0
          : Math.round(
              (sourceColor * sourceWeight +
                destinationColor * destinationAlpha * (1 - sourceAlpha)) /
                outputAlpha
            );
    }
    destination[offset + ALPHA_CHANNEL] = Math.round(
      outputAlpha * MAXIMUM_CHANNEL
    );
  }
}
