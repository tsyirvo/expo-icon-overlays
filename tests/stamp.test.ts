// Checks image decoding, surface composition and visible rendering through stampIcon.
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import { parseOptions } from "../src/options/index";
import { stampIcon } from "../src/stamp/index";
import type { Surface } from "../src/types";

const ICON_SIZE_PX = 108;
const CHANNELS_PER_PIXEL = 4;
const MAXIMUM_CHANNEL = 255;
const ALPHA_CHANNEL = 3;
const SURFACES: Surface[] = [
  "square",
  "square-tinted",
  "round",
  "adaptive-foreground",
  "monochrome",
];

function createIcon(alpha = MAXIMUM_CHANNEL): Buffer {
  const icon = new PNG({ height: ICON_SIZE_PX, width: ICON_SIZE_PX });
  for (
    let offset = 0;
    offset < icon.data.length;
    offset += CHANNELS_PER_PIXEL
  ) {
    icon.data.set([40, 80, 120, alpha], offset);
  }
  return PNG.sync.write(icon);
}

const { overlays } = parseOptions({
  overlays: [{ background: "#F00", text: "DEV", type: "banner" }],
});

describe("stampIcon", () => {
  it.each([
    Buffer.from("RIFF0000WEBP"),
    Buffer.alloc(0),
    Buffer.from("89504e470d0a1a0a", "hex"),
  ])("rejects invalid icon bytes with a PNG error", async (bytes) => {
    await expect(stampIcon(bytes, overlays, "square")).rejects.toThrow("png");
  });

  it("leaves an empty overlay list byte-identical", async () => {
    // A decode/encode round trip would change these deliberately uncompressed bytes.
    const icon = PNG.sync.write(PNG.sync.read(createIcon()), {
      deflateLevel: 0,
    });
    expect(await stampIcon(icon, [], "square")).toEqual(icon);
  });

  it.each(SURFACES)("stamps a valid same-size PNG on %s", async (surface) => {
    const icon = createIcon();
    const output = await stampIcon(icon, overlays, surface);
    const decoded = PNG.sync.read(output);
    expect([decoded.width, decoded.height]).toEqual([
      ICON_SIZE_PX,
      ICON_SIZE_PX,
    ]);
    expect(decoded.data.equals(PNG.sync.read(icon).data)).toBe(false);
  });

  it.each(SURFACES)("rejects text that cannot fit on %s", async (surface) => {
    const long = parseOptions({
      overlays: [{ text: "W".repeat(100), type: "banner" }],
    });
    await expect(
      stampIcon(createIcon(), long.overlays, surface)
    ).rejects.toThrow("text");
  });

  it("preserves every existing alpha value on round icons", async () => {
    const icon = PNG.sync.read(createIcon());
    for (
      let offset = 0;
      offset < icon.data.length;
      offset += CHANNELS_PER_PIXEL
    ) {
      icon.data[offset + ALPHA_CHANNEL] =
        (offset / CHANNELS_PER_PIXEL) % (MAXIMUM_CHANNEL + 1);
    }
    const output = PNG.sync.read(
      await stampIcon(PNG.sync.write(icon), overlays, "round")
    );
    for (
      let offset = ALPHA_CHANNEL;
      offset < icon.data.length;
      offset += CHANNELS_PER_PIXEL
    ) {
      expect(output.data[offset]).toBe(icon.data[offset]);
    }
  });

  it("adds foreground pixels outside the existing alpha and cuts monochrome text through an opaque source", async () => {
    const transparent = createIcon(0);
    const adaptive = PNG.sync.read(
      await stampIcon(transparent, overlays, "adaptive-foreground")
    );
    expect(
      adaptive.data.some(
        (value, index) =>
          index % CHANNELS_PER_PIXEL === ALPHA_CHANNEL &&
          value === MAXIMUM_CHANNEL
      )
    ).toBe(true);
    const monochrome = PNG.sync.read(
      await stampIcon(createIcon(), overlays, "monochrome")
    );
    expect(
      monochrome.data.some(
        (value, index) =>
          index % CHANNELS_PER_PIXEL === ALPHA_CHANNEL && value === 0
      )
    ).toBe(true);
  });

  it.each([
    ["#FFF", "#000000"],
    ["#000", "#FFFFFF"],
    ["#D97706", "#000000"],
    ["#2563EB", "#FFFFFF"],
  ])("uses the higher-contrast text on %s", async (background, color) => {
    const automatic = parseOptions({
      overlays: [{ background, text: "DEV", type: "banner" }],
    });
    const explicit = parseOptions({
      overlays: [{ background, color, text: "DEV", type: "banner" }],
    });
    expect(await stampIcon(createIcon(), automatic.overlays, "square")).toEqual(
      await stampIcon(createIcon(), explicit.overlays, "square")
    );
  });

  it.each<Surface>(["square-tinted", "monochrome"])(
    "ignores owner colors on %s",
    async (surface) => {
      const fixed = parseOptions({
        overlays: [
          { background: "#FFF", color: "#000", text: "DEV", type: "banner" },
        ],
      });
      expect(await stampIcon(createIcon(), overlays, surface)).toEqual(
        await stampIcon(createIcon(), fixed.overlays, surface)
      );
    }
  );

  it("applies overlays in array order", async () => {
    const pair = parseOptions({
      overlays: [
        {
          background: "#F00",
          position: "top-left",
          text: "DEV",
          type: "ribbon",
        },
        {
          background: "#0F0",
          position: "top-right",
          text: "QA",
          type: "ribbon",
        },
      ],
    }).overlays;
    const icon = createIcon();
    const forward = await stampIcon(icon, pair, "square");
    const sequential = await stampIcon(
      await stampIcon(icon, pair.slice(0, 1), "square"),
      pair.slice(1),
      "square"
    );
    expect(forward).toEqual(sequential);
    expect(forward).not.toEqual(
      await stampIcon(icon, pair.toReversed(), "square")
    );
  });
});
