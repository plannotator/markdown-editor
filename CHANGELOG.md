# Changelog

All notable changes to this package will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions
follow [SemVer](https://semver.org) (pre-1.0: minors may break).

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
