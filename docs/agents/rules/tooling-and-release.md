# Tooling and release

## Dependencies and hooks

Read `package.json`, `bun.lock` and `mise.toml` before changing versions.
Pin tool versions deliberately. Prefer the latest stable release after checking compatibility.
Respect the dependency cooldown in `bunfig.toml`. Do not bypass it without approval.
Use unmodified dependencies. Let Expo select its image generator.

When upgrading HK, update the executable pin, both Pkl package imports and
`min_hk_version` together. Read version-matched official documentation or source.
Run `mise install`, `bun run hooks:install`, `mise exec -- hk validate`
and `bun run hooks:check`. Check both valid and invalid conventional commit messages.
Run the staged pre-commit checks before committing.

`lint`, `format` and `hooks:fix` can write files. Inspect their diff and preserve unrelated changes.
Keep scripts in `package.json`, tool versions in `mise.toml` and hook behavior in `hk.pkl`.
Do not copy those configurations into additional rule files.

## Builds and CI

Build with `bun run build`. Keep the public plugin CommonJS with declarations in `build/`.
`app.plugin.js` loads the compiled plugin without a TypeScript loader.
Inspect package contents with `bun pm pack` before testing a release artifact.

Keep job orchestration in reusable workflows under `.github/workflows/`.
Use `.github/actions/` for composite actions that share steps inside jobs.
The shared setup action installs selected mise tools before selecting the job's Node version.
Keep dependency installation in the caller so packed-package jobs remain isolated from package dev dependencies.
Update Dependabot's directory coverage when adding local actions or a Bun project.
Run actionlint and ShellCheck through `bun run hooks:check` after workflow or script changes.
Local static checks do not prove that GitHub Actions ran successfully.

CI must check Node 22, Node 24 and Node 26. The package supports Expo SDK 56, 57 and 58.
Widen support only after version-matched fixtures and final-asset checks pass.
Keep minimum/latest SDK fixtures and final-image checks in the release gates.
Run weekly dist-tag probes against unpublished candidates only. Treat their failures as compatibility alerts,
not evidence that a new SDK is supported.

## Releases

Read the README's [release setup](../../../README.md#release-setup) before changing release automation.
Keep Release Please responsible for release PRs and version tags.
Use npm trusted publishing with OIDC and provenance, not a long-lived npm write token.

Publication must require owner approval and all these checks:

- Quality checks on the release commit.
- Supported-SDK fixtures from the release tarball, for each SDK's minimum and latest version.
- Isolated packed-package checks on Node 22, Node 24 and Node 26, including the minimum supported Node version.

Publish the same tarball that passed the checks. Do not rebuild it in the publishing job.
Keep publication manual and retain the protected `npm` environment.
Confirm external branch protection, environment reviewers and trusted-publisher settings before publication.
The scaffold must not publish. Complete the first-release acceptance checks first.
