# Build caching

Expo computes a native fingerprint from your native build inputs, including plugin options.
When the fingerprint changes, a cached native build can't be reused.
With a fingerprint-based runtime version policy, OTA compatibility changes too.

## Choose overlay text

- **Development builds:** use a fixed `DEV` banner without a version.
  A cached development build can show an older version, so a version on it can mislead.
- **Versioned builds:** use `{version}`, not a literal version or commit SHA.
  Literal text changes the plugin options, and so the fingerprint, every time the value changes.
  `{version}` stays the same in the options and is only replaced at prebuild.

```ts
{ type: "ribbon", text: "{version}" }
```

## Keep the fingerprint across version changes

With `{version}`, a version-only change keeps the same fingerprint, as long as Expo does not hash the app version itself:

- **SDK 58:** the default fingerprint settings already skip the version. Nothing to do.
- **SDK 56 and 57:** the default settings hash the version, with or without this plugin.
  To skip it, add `fingerprint.config.js`:

```js
const { SourceSkips } = require("@expo/fingerprint");

/** @type {import("@expo/fingerprint").Config} */
module.exports = {
  // Keep the SDK 56 and 57 default skip and add config versions.
  sourceSkips:
    SourceSkips.PackageJsonAndroidAndIosScriptsIfNotContainRun |
    SourceSkips.ExpoConfigVersions,
};
```

`sourceSkips` replaces the default skips. Read Expo's fingerprint documentation for your SDK before you change it.

This behavior is tested with `runtimeVersion: { policy: "appVersion" }`.
Other fingerprint settings and runtime policies can behave differently, so check OTA compatibility for your setup.
