# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-18

First public release.

### Added
- Visual buffer-tank (puffer) card for Home Assistant / Lovelace.
- Display of 1 to 3 temperatures at different heights; values are distributed
  evenly over the tank when fewer than three are configured.
- Color-coded thermal stratification (blue → cyan → amber → red) driven by the
  configurable `min_temp` / `max_temp` range.
- `normal` and `compact` layouts, selectable from the visual editor.
- `show_labels` option to show values only (labels hidden).
- Customizable labels with localized defaults.
- Click any value to open the entity's more-info dialog.
- Built-in graphical editor (ha-form), no YAML required.
- Multilingual UI (English / Italian) loaded from external per-language files
  under `dist/translations/`, with a built-in English fallback so the UI never
  shows raw keys.
- Theme-aware styling.

[1.0.0]: https://github.com/naked-head/puffer-card/releases/tag/v1.0.0
