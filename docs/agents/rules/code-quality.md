# Code quality

These rules apply to code and configuration. A change is incomplete if it breaks a rule.
Use the [architecture guide](architecture.md) for module ownership and public interfaces.
Keep formatting rules in Biome rather than duplicating its rule set here.

## Deep modules and small interfaces

- Keep interfaces small and place complexity behind them.
- Remove modules or functions that only pass calls to another implementation.
- Add no abstraction, option or extension point for an unapproved feature.
- Give each module and file one responsibility. State that responsibility in one sentence.
- Keep decisions separate from side effects.

## Names

- Use names a new reader understands without reading the implementation.
- Use one name for each concept. Call text strips `overlays`, not `badges` or `labels`.
- Start function names with a verb that states the result, such as `findIconTargets`.
- Start boolean names with `is`, `has` or `should`.
- Avoid abbreviations such as `cfg`, `img` and `fg`. Common format names such as PNG, SVG and WASM are allowed.
- Avoid vague names such as `utils`, `helpers`, `common`, `data`, `manager` and `process`.
- Replace literal numbers with named constants, except obvious values such as `0` and `1`.
  Put the unit in the name, such as `STRIP_HEIGHT_RATIO` or `MINIMUM_FONT_SIZE_PX`.

## Functions and types

- Each function does one task at one level of detail.
- Select behavior with named values or separate functions, not boolean parameters.
- Preserve the strict TypeScript options in `tsconfig.json`.
- Use no `any`, non-null assertions or unchecked type casts.
- Give each `biome-ignore` comment a reason.

## Errors and comments

- Each error names the option or file, states the problem and gives a corrective action.
- Catch errors only when handling them. Never hide an error.
- Comments explain why code exists. They must not repeat what the code does.
- Keep no dead code, disabled tests or `TODO` comments.
