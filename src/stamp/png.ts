// Decodes PNG bytes and encodes stamped RGBA pixels regardless of file extension.
import { PNG } from "pngjs";

const PNG_SIGNATURE = Buffer.from("89504e470d0a1a0a", "hex");

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
  return PNG.sync.write(image);
}
