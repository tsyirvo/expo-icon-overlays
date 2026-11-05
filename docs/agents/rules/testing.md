# Testing

There is no coverage target. Do not add a test only to increase coverage.

## When to add a test

Add a test only when all these conditions hold:

- You can name a realistic failure that the test catches.
- The failure matters to a plugin user, such as a wrong icon, a silent failure or a broken build.
- The test adds a distinct regression check. Module and integration tests can check the same outcome at different interfaces.

Reject these tests:

| Type                | Meaning                                             | Examples                                                                |
| ------------------- | --------------------------------------------------- | ----------------------------------------------------------------------- |
| Tautological        | Expected values come from production code or mocks. | Repeating the production formula or asserting a mock's return value.    |
| Structure-sensitive | A behavior-preserving refactor makes the test fail. | Asserting private calls, call order, file layout or SVG strings.        |
| Cannot-fail         | No realistic code change makes the test fail.       | Asserting `toBeDefined`, constants or facts that TypeScript guarantees. |

## Test design

- Test behavior through the module interface. Test an internal function directly only for complex logic, such as text fit.
- Use real inputs and outputs. Do not mock package modules, resvg or pngjs.
- Assert user-visible results, such as pixels, generated files or build failures.
- For errors, assert the option or file name, not the full message.
- Use one table-driven test for similar cases instead of one test per input variation.
- Each test name states the expected behavior.
- Break the covered code before keeping a test. Remove the test if it still passes.
- Inspect a changed image before updating its reference.
- Remove tests that no longer meet these rules.

## Commands and verification boundaries

Use `bun run test` to invoke Vitest. Never use `bun test`.
Use `bun run check:fixtures` for source-plugin final-asset checks after full iOS and Android prebuilds.
Use `bun run check:package` for the same checks after isolated tarball installation and public-entry resolution.
Use `bun run check:sdk -- <version-or-range>` for supported-SDK compatibility checks.
These checks need no Doppler values or secrets. They do not prove native compilation or device behavior.

Before changing fixture dependencies or packed-package checks, also read
[Tooling and release](tooling-and-release.md). Use unmodified dependencies.
