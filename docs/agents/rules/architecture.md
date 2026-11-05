# Architecture

## Ownership and interfaces

`src/index.ts` connects the modules. It contains no validation rules, drawing,
Expo mods or file operations. Shared public types belong in `src/types.ts`.

| Module    | Only public functions           | Responsibility                                                                              |
| --------- | ------------------------------- | ------------------------------------------------------------------------------------------- |
| `options` | `parseOptions`, `resolveTokens` | Validate values, defaults, clashes and tokens without Expo, pixels or files.                |
| `stamp`   | `stampIcon`                     | Draw overlays using layout, text fit, SVG, codecs and blends without Expo or project files. |
| `native`  | `registerIconOverlayMods`       | Own Expo APIs, SDK differences, paths, discovery, warnings and native file updates.         |

Get owner approval before adding a module export. Import other modules through their public index.
Keep public access limited with `exports` in `package.json`.
Expose only the plugin, public option and overlay types, `./app.plugin.js` and `./package.json`.
Enforce module import boundaries with Biome `noRestrictedImports`.

## Decisions and side effects

- Pass version text to `options`, not an Expo config object.
- Use one `Surface` value to change drawing behavior. Keep platform checks outside `stamp`.
- `options` and `stamp` read no project files and write no files.
- Only `stamp/rasterize.ts` may read this package's WASM and font assets. Other `stamp` files read no files.
- Use the concrete rasterizer and PNG libraries without ports or dependency injection. Each has one implementation.
- Keep iOS and Android handling separate inside `native`.
- Shape changes belong in types, `options` and `stamp`. A new shape must not require changes in `native`.
- Keep `.icon` metadata and layer-file updates in `native`. Rendering must not interpret `icon.json`.
- Define `.icon` rendering interfaces only during the approved follow-up phase, not in the first release.

## Plugin flow

1. Parse options when the config loads.
2. Return the config unchanged when `enabled` is false or `overlays` is empty.
3. Check duplicate active entries and the consumer's Expo compatibility.
4. Register one dangerous mod per platform through `native`.
5. In each mod, discover targets and warn about skipped icons.
6. Resolve tokens for supported targets.
7. Read, stamp and write each target through `native`.

Read version-matched official documentation or installed source before using Expo APIs.
