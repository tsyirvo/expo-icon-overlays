// Checks config-time validation and mod-time token resolution at the options interface.
import { describe, expect, it } from "vitest";
import { parseOptions, resolveTokens } from "./index";

const BANNER = { text: "DEV", type: "banner" };
const RIBBON = { text: "1.0", type: "ribbon" };
const OPTION_ERRORS: [string, unknown, string][] = [
  ["missing options", undefined, "options"],
  ["null options", null, "options"],
  ["array options", [], "options"],
  ["unknown option", { extra: true, overlays: [] }, "extra"],
  ["invalid enabled", { enabled: "false", overlays: [] }, "enabled"],
  ["null enabled", { enabled: null, overlays: [] }, "enabled"],
  ["missing overlays", {}, "overlays"],
  ["non-array overlays", { overlays: {} }, "overlays"],
  ...[
    [null, "overlays[0]"],
    [[], "overlays[0]"],
    [{ ...BANNER, extra: true }, "extra"],
    [{ text: "DEV" }, "type"],
    [{ ...BANNER, type: "image" }, "type"],
    [{ ...BANNER, position: "top-right" }, "position"],
    [{ ...RIBBON, position: "bottom" }, "position"],
    [{ ...BANNER, position: null }, "position"],
    [{ ...BANNER, background: "red" }, "background"],
    [{ ...BANNER, background: "#FFFF" }, "background"],
    [{ ...BANNER, background: 123 }, "background"],
    [{ ...BANNER, color: "#12345G" }, "color"],
    [{ ...BANNER, color: null }, "color"],
    [{ ...BANNER, text: 12 }, "text"],
    [{ type: "banner" }, "text"],
  ].map(([overlay, field]): [string, unknown, string] => [
    `invalid overlay ${String(field)} ${JSON.stringify(overlay)}`,
    { overlays: [overlay] },
    String(field),
  ]),
  ["duplicate default position", { overlays: [BANNER, BANNER] }, "position"],
  ["duplicate ribbon position", { overlays: [RIBBON, RIBBON] }, "position"],
  [
    "top banner with ribbon",
    { overlays: [{ ...BANNER, position: "top" }, RIBBON] },
    "position",
  ],
  [
    "disabled invalid options",
    { enabled: false, overlays: [{ ...BANNER, text: "" }] },
    "text",
  ],
];

const INVALID_TEXT = [
  "",
  " ",
  "\u00a0",
  "\tDEV",
  "DEV\n",
  "DEV\r",
  "DEV\u0000",
  "\u007f",
  "\u0085",
  "DEV\u00ad",
  "😀",
  "東京",
  "e\u0304\u0301",
  "{buildNumber}",
  "{Version}",
  "{}",
  "DEV {",
  "DEV }",
  "{{version}}",
  "{version",
  "version}",
  "{ver{version}sion}",
];

describe("parseOptions", () => {
  it.each(OPTION_ERRORS)(
    "rejects %s and names the field",
    (_name, raw, field) => {
      expect(() => parseOptions(raw)).toThrow(field);
    }
  );

  it.each(INVALID_TEXT)("rejects invalid text %j", (text) => {
    expect(() => parseOptions({ overlays: [{ ...BANNER, text }] })).toThrow(
      "text"
    );
  });

  it("normalizes NFC while preserving case, spacing, colors and array order", () => {
    expect(
      parseOptions({
        overlays: [
          {
            ...BANNER,
            background: "#aBc",
            color: "#123456",
            text: "  De\u0301v & QA  ",
          },
          { ...RIBBON, text: "{version}" },
        ],
      })
    ).toEqual({
      enabled: true,
      overlays: [
        {
          background: "#aBc",
          color: "#123456",
          position: "bottom",
          text: "  Dév & QA  ",
          type: "banner",
        },
        {
          background: "#111111",
          position: "top-right",
          text: "{version}",
          type: "ribbon",
        },
      ],
    });
  });

  it("accepts empty, disabled and non-clashing explicit positions", () => {
    expect(parseOptions({ overlays: [] })).toEqual({
      enabled: true,
      overlays: [],
    });
    expect(parseOptions({ enabled: false, overlays: [] }).enabled).toBe(false);
    expect(
      parseOptions({
        overlays: [{ ...BANNER, position: "top" }, BANNER],
      }).overlays.map((overlay) => overlay.position)
    ).toEqual(["top", "bottom"]);
    expect(
      parseOptions({
        overlays: [BANNER, { ...RIBBON, position: "top-left" }, RIBBON],
      }).overlays.map((overlay) => overlay.position)
    ).toEqual(["bottom", "top-left", "top-right"]);
  });

  it("accepts each supported non-brace character", () => {
    const points = [
      ...Array.from({ length: 95 }, (_value, index) => index + 0x20),
      ...Array.from({ length: 224 }, (_value, index) => index + 0xa0),
    ].filter((point) => ![0x7b, 0x7d, 0xad].includes(point));
    const text = String.fromCodePoint(...points);
    expect(
      parseOptions({ overlays: [{ ...BANNER, text }] }).overlays[0]?.text
    ).toBe(text.normalize("NFC"));
  });
});

describe("resolveTokens", () => {
  const { overlays } = parseOptions({
    overlays: [{ ...BANNER, text: "v{version} / {version}" }],
  });

  it("replaces every token with normalized version text without changing the input", () => {
    expect(resolveTokens(overlays, { version: "1.0-e\u0301" })[0]?.text).toBe(
      "v1.0-é / 1.0-é"
    );
    expect(overlays[0]?.text).toBe("v{version} / {version}");
  });

  it("inserts replacement patterns in config.version as literal text", () => {
    expect(resolveTokens(overlays, { version: "1.0$&" })[0]?.text).toBe(
      "v1.0$& / 1.0$&"
    );
  });

  it.each([undefined, ...INVALID_TEXT, "{version}"])(
    "rejects invalid config.version %j",
    (version) => {
      expect(() => resolveTokens(overlays, { version })).toThrow(
        "config.version"
      );
    }
  );

  it("does not require config.version for literal text", () => {
    const literal = parseOptions({ overlays: [BANNER] }).overlays;
    expect(resolveTokens(literal, {})).toEqual(literal);
  });
});
