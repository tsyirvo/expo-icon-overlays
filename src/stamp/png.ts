// Decodes PNG bytes and encodes stamped RGBA pixels regardless of file extension.
import { PNG } from "pngjs";

const PNG_SIGNATURE = Buffer.from("89504e470d0a1a0a", "hex");
const CHANNELS_PER_PIXEL = 4;
const ALPHA_CHANNEL = 3;
const MAXIMUM_CHANNEL = 255;
const RGB_COLOR_TYPE = 2;

function hasTransparentPixel(pixels: Buffer): boolean {
  for (
    let offset = ALPHA_CHANNEL;
    offset < pixels.length;
    offset += CHANNELS_PER_PIXEL
  ) {
    if (pixels.readUInt8(offset) !== MAXIMUM_CHANNEL) {
      return true;
    }
  }
  return false;
}

export function decodePng(bytes: Uint8Array): PNG {
  const input = Buffer.from(bytes);
  if (!input.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error(
      "png icon is not PNG data. Regenerate native icons with an Expo PNG image generator."
    );
  }
  try {
    return PNG.sync.read(input);
  } catch (cause) {
    throw new Error(
      "png icon cannot be decoded. Replace the damaged icon and run prebuild again.",
      { cause }
    );
  }
}

export function encodePng(image: PNG): Buffer {
  // App Store Connect rejects large icons that have an alpha channel, even if every pixel is opaque.
  return hasTransparentPixel(image.data)
    ? PNG.sync.write(image)
    : PNG.sync.write(image, { colorType: RGB_COLOR_TYPE });
}
