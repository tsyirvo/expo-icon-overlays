// Provides a secret-free native prebuild fixture for source and packed plugins.
module.exports = {
  android: { package: "dev.tsyirvo.iconoverlays.fixture" },
  ios: { bundleIdentifier: "dev.tsyirvo.iconoverlays.fixture" },
  name: "IconOverlaysFixture",
  plugins: [
    [
      process.env.ICON_OVERLAYS_PLUGIN ?? "../../app.plugin.js",
      { overlays: [{ text: "DEV", type: "banner" }] },
    ],
  ],
  slug: "icon-overlays-fixture",
  version: "1.0.0",
};
