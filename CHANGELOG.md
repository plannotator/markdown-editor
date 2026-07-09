# Changelog

All notable changes to this package will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions
follow [SemVer](https://semver.org) (pre-1.0: minors may break).

## [0.3.2]

### Changed

- `@plannotator/atomic-editor` peer range widened to include `^0.7.0` —
  engine 0.7.0 brings the Linear-style table pass (hover add-row/column
  controls, density, corruption fix for hand-typed rows) and
  `preferResolvedLabel` on `wikiLinks()` for rename-propagating wiki links.
  All engine features compose through the `extensions` prop; no wrapper
  code changes.

## [0.3.1]

### Changed

- `@plannotator/atomic-editor` peer range widened to `^0.5.0 || ^0.6.0`.
  Engine 0.6.0 adds two opt-in UI extensions that compose through this
  package's `extensions` prop with no wrapper changes: `slashCommands()`
  (insert menu on `/`) and `selectionToolbar()` (floating formatting bar,
  multi-line and table-cell aware), both themeable via the new
  `--atomic-editor-menu-*` variables. README shows the wiring.

## [0.3.0]

### Added

- **`extensions` prop**: extra CodeMirror 6 extensions forwarded verbatim to
  the underlying editor (appended after its built-ins). Enables consumers to
  plug in live collaboration (e.g. `y-codemirror.next`), custom keymaps, or
  update listeners. The package remains provider-agnostic — no collaboration
  dependencies or code ship with it. Covered by tests proving a facet-based
  extension and an update listener both reach the editor state through the
  wrapper.
- `@codemirror/state` is now an explicit (non-optional) peer dependency — the
  public `extensions` type references it. Package managers that auto-install
  peers (pnpm, npm 7+, bun) need no action from consumers.

## [0.2.0]

- Swapped the underlying editor to `@plannotator/atomic-editor` (our fork):
  YAML frontmatter parsing plus an Obsidian-style frontmatter Properties
  widget. Peer dependency renamed from `@atomic-editor/editor` —
  consumers change one install line. Byte-fidelity contract unchanged.

## [0.1.0]

- Initial release: byte-faithful live-preview markdown editor extracted from
  Plannotator's edit mode, with the `roundTrip` fidelity helper at
  `./testing`.
