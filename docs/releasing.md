# Release procedure

This procedure requires owner approval before any push, workflow dispatch, npm staging or publication.
The repository is `tsyirvo/expo-icon-overlays`. The release workflow is `.github/workflows/publish.yml`.

## Security model

GitHub Actions builds one tarball without npm credentials. Separate jobs test that artifact on Node 24 and Node 26.
Only the final job can request an npm OIDC identity. OIDC supplies short-lived credentials for the configured publisher.
The job runs on a fresh GitHub-hosted runner after approval of the protected `npm` environment.
It downloads the immutable artifact by ID and checks its SHA-256 against the build job output.
It does not check out source, install package dependencies or run package lifecycle scripts.

The workflow can only stage a package when npm restricts this publisher to stage-only access.
A maintainer then reviews the package and approves it with npm 2FA.
A workflow checkbox is not an authorization control. Environment protection and npm permissions provide the controls.
Provenance links an artifact to a workflow and source commit. It does not detect malicious source or dependencies.

## Release checks and approval

Release Please owns versions, changelogs and tags. The initial `release-as` is `0.1.0`.
Remove `release-as` in a separate reviewed change after the first release, before preparing another version.
The local preparation manifest stays at `0.0.0`. The workflow rejects that version.

1. Review the release PR, dependency changes, lockfiles and workflow changes.
2. Check the tag, package version and selected `main` commit. They must match.
3. Dispatch `Publish` from that commit with the approved tag and staging approval input.
4. Require successful quality checks, source fixtures and isolated tarball checks on Node 24 and Node 26.
5. Before environment approval, inspect the tarball listing and SHA-256 from the pack job.
   Expect only `build/`, `app.plugin.js`, font assets, licenses, README and `package.json`.
   Reject credentials, extra executables, unexpected lifecycle scripts or unexplained dependency changes.
6. Approve the protected `npm` deployment only after these checks pass.
7. In npm, review the stage ID, version, source commit, provenance and tarball contents.
8. Download the staged tarball. Compare its SHA-256 with the workflow output before approval.
9. Approve that stage with npm 2FA. Approval makes the version public.
10. Check `0.1.0`, the `latest` tag and public provenance on npm before updating consumers.

The workflow requires npm CLI 11.15.0 or later for staging. It fails if the runner supplies an older CLI.
Do not install an unreviewed `npm@latest` in the OIDC job to bypass that check.
If a check fails, stop. A rerun must use the same reviewed commit and a newly reviewed artifact.
No local test replaces remote CI, npm approval or a check of the published artifact.

## Starter integration after publication

Replace the local link on the starter's `feat/icon-overlays` branch with `bun add expo-icon-overlays@0.1.0`.
Inspect the manifest and lockfile. Neither may contain `file:` or `link:` references to this package.
Run `bun run lint:ts`, `bun run lint:ci`, `bun run format:check` and `bun run test`.
Get owner approval before pushing the branch or opening its PR.
Do not merge before the npm package and its provenance are available.

## Response to a suspected compromise

Stop release approvals. Remove the trusted publisher or disable release workflows through the owner account.
Review GitHub and npm access. Revoke affected credentials and remove unauthorized maintainers.
Preserve run IDs, commit IDs and artifact hashes without copying secrets.
Notify affected users with the affected versions and a safe version to use.
Deprecation does not remove an already downloaded package. Provenance alone does not repair affected consumers.

## Official references

- [npm trusted publishers](https://docs.npmjs.com/trusted-publishers/)
- [npm staged publishing](https://docs.npmjs.com/staged-publishing/)
- [npm provenance](https://docs.npmjs.com/generating-provenance-statements/)
- [GitHub deployment environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
- [GitHub rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
