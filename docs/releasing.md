# Release procedure

This procedure requires owner approval before any push, workflow dispatch, npm staging or publication.
The repository is `tsyirvo/expo-icon-overlays`. The release workflow is `.github/workflows/publish.yml`.

## Security model

GitHub Actions builds one tarball without npm credentials. Separate jobs test that artifact on Node 22, Node 24 and Node 26, including Node `22.13.0`.
Only the final job can request an npm OIDC identity. OIDC supplies short-lived credentials for the configured publisher.
The job runs on a fresh GitHub-hosted runner after approval of the protected `npm` environment.
It downloads the immutable artifact by ID and checks its SHA-256 against the build job output.
It does not check out source, install package dependencies or run package lifecycle scripts.

The workflow can only stage a package when npm restricts this publisher to stage-only access.
A maintainer then reviews the package and approves it with npm 2FA.
A workflow checkbox is not an authorization control. Environment protection and npm permissions provide the controls.
The workflow runs from the release tag, so provenance names the commit that built the tarball.
The `npm` environment must allow `v*` tags as deployment refs and must keep its required reviewers.
A tag ruleset must restrict who can create or move `v*` tags, because a run uses the workflow file stored in its tag.
Provenance links an artifact to a workflow and source commit. It does not detect malicious source or dependencies.

## Release checks and approval

Release Please owns versions, changelogs and tags. Do not edit versions or create tags manually.
To force a version, add a `Release-As: x.y.z` footer to a commit on `main`. It applies only to the next release.

1. Review the release PR, dependency changes, lockfiles and workflow changes.
2. Check that the tag's commit is on `main` and that the tag matches the package version. Later commits on `main` do not block a release.
3. Dispatch `Publish` from the tag, not from `main`, with the same approved tag and the staging approval input:
   `gh workflow run publish.yml --ref vX.Y.Z -f tag=vX.Y.Z -f approved=true`.
4. Require successful quality checks, source fixtures and isolated tarball checks on Node 22, Node 24 and Node 26.
   Require isolated tarball checks on Node `22.13.0` as well.
5. Before environment approval, inspect the tarball listing and SHA-256 from the pack job.
   Expect only `build/`, `app.plugin.js`, font assets, licenses, README and `package.json`.
   Reject credentials, extra executables, unexpected lifecycle scripts or unexplained dependency changes.
6. Approve the protected `npm` deployment only after these checks pass.
7. In npm, review the stage ID, version, source commit, provenance and tarball contents.
8. Download the staged tarball. Compare its SHA-256 with the workflow output before approval.
9. Approve that stage with npm 2FA. Approval makes the version public.
10. Check the new version, the `latest` dist-tag and public provenance on npm before updating consumers.

The workflow requires npm CLI 11.15.0 or later for staging. It fails if the runner supplies an older CLI.
Do not install an unreviewed `npm@latest` in the OIDC job to bypass that check.
If a check fails, stop. A rerun must use the same reviewed commit and a newly reviewed artifact.
No local test replaces remote CI, npm approval or a check of the published artifact.

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
