# Build caching

Expo uses a native fingerprint to identify native build inputs.
Changing plugin options can change that fingerprint and prevent reuse of a cached native build.
With fingerprint-based runtime policies, it can also change OTA compatibility.

## Choose overlay text

For development, prefer a fixed `DEV` banner without a version.
A cached native build can contain older icon text.

A literal version or commit SHA changes plugin options whenever that value changes.
Prefer `{version}` when a version overlay is necessary:

```ts
{ type: "ribbon", text: "{version}" }
```

The plugin resolves this token from `config.version` during prebuild, not when the config loads.
The token does not refresh icons in an installed binary.

## Tested behavior

The fingerprint checks use `runtimeVersion: { policy: "appVersion" }` and skip config versions.
SDK 58's default balanced preset already skips them.
A version-only change preserves the fingerprint with a `{version}` overlay in these checks.
Literal version text changes it.

SDK 56 and SDK 57 hash `version` by default, with or without this plugin.
A version change therefore changes their fingerprint, whatever the overlay text.
To keep the fingerprint across version changes, skip config versions in `fingerprint.config.js`:

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

`sourceSkips` replaces the default skips. Read Expo's fingerprint documentation for your SDK before changing it.

Other fingerprint presets and runtime policies can behave differently.
This result does not guarantee OTA compatibility for other configurations.
Icon changes still require prebuild and a new native build.

See [configuration](configuration.md) for environment selection and token rules.
