# Release procedure

Every push, workflow dispatch, npm staging and publication needs owner approval.
The repository is `tsyirvo/expo-icon-overlays`. The release workflow is `.github/workflows/publish.yml`.

## Versions

Release Please creates the release PR, changelog and tag. Do not edit versions or create tags by hand.
To force a version, add a `Release-As: x.y.z` footer to a commit on `main`. It applies to the next release only.

## Steps

1. Review the release PR, including dependency, lockfile and workflow changes.
2. Check that the tag points to a commit on `main` and matches the package version.
   Later commits on `main` don't block the release.
3. Run `Publish` from the tag, not from `main`:
   `gh workflow run publish.yml --ref vX.Y.Z -f tag=vX.Y.Z -f approved=true`.
4. Wait for every check to pass:
   quality checks, release-tarball fixtures for each tested SDK on Node 22.13.0, 24 and 26,
   and the locked and isolated tarball checks on Node 22.13.0.
5. Before you approve the `npm` environment, check the tarball listing and SHA-256 from the pack job.
   Expect only `build/`, `app.plugin.js`, font assets, licenses, README and `package.json`.
   Reject credentials, extra executables, unexpected lifecycle scripts or unexplained dependency changes.
6. Approve the protected `npm` deployment. The workflow stages the package on npm.
7. In npm, review the stage ID, version, source commit, provenance and tarball contents.
8. Download the staged tarball and compare its SHA-256 with the workflow output.
9. Approve the stage with npm 2FA. This makes the version public.
10. On npm, check the new version, the `latest` dist-tag and the public provenance.

If a check fails, stop. A rerun must use the same reviewed commit and a newly reviewed artifact.
Local checks never replace remote CI, npm approval or a check of the published package.

The workflow needs npm CLI 11.15.0 or later for staging, and fails on an older one.
Do not install an unreviewed `npm@latest` in the publish job to get around this.

## Why it works this way

- **Build without credentials.** CI builds one tarball without npm credentials,
  then separate jobs test that same file on every supported Node version.
- **Short-lived credentials only.** Only the final job can get npm credentials, through OIDC.
  It runs on a fresh GitHub-hosted runner after the protected `npm` environment is approved.
- **Publish what was tested.** The final job downloads the tarball by ID and checks its SHA-256.
  It doesn't check out the source, install dependencies or run package scripts.
- **A human approves the release.** npm limits this publisher to staging, so publication needs npm 2FA.
  The `approved=true` input is not a security control; environment protection and npm permissions are.
- **Traceable source.** The workflow runs from the tag, so provenance names the commit that built the tarball.
  Provenance links the package to its source. It does not detect malicious source or dependencies.

These settings must stay in place outside the repository:

- The `npm` environment allows `v*` tags as deployment refs and keeps its required reviewers.
- A tag ruleset restricts who can create or move `v*` tags, because each run uses the workflow file from its tag.

## If you suspect a compromise

1. Stop release approvals.
2. Remove the trusted publisher or disable release workflows from the owner account.
3. Review GitHub and npm access. Revoke affected credentials and remove unknown maintainers.
4. Save run IDs, commit IDs and artifact hashes, without copying secrets.
5. Tell users which versions are affected and which version is safe.

Deprecating a version does not remove copies that were already downloaded.

## Official references

- [npm trusted publishers](https://docs.npmjs.com/trusted-publishers/)
- [npm staged publishing](https://docs.npmjs.com/staged-publishing/)
- [npm provenance](https://docs.npmjs.com/generating-provenance-statements/)
- [GitHub deployment environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
- [GitHub rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
