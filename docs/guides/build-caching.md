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

The fingerprint checks use Expo's default balanced preset with `runtimeVersion: { policy: "appVersion" }`.
A version-only change preserves the fingerprint with a `{version}` overlay in these checks.
Literal version text changes it.

Other fingerprint presets and runtime policies can behave differently.
This result does not guarantee OTA compatibility for other configurations.
Icon changes still require prebuild and a new native build.

See [configuration](configuration.md) for environment selection and token rules.
