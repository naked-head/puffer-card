# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - 2026-06-30

### Fixed
- The `icon_mode` field was missing from the visual editor when editing an
  existing card without an icon already set, making the option undiscoverable.
  It is now always shown.
- The chart sensor selector bug from 1.2.0 was only fixed in the card itself,
  not in the visual editor (which keeps its own separate copy of the
  configuration): on first enabling the chart, the editor's checkboxes still
  appeared empty even though the chart correctly showed all sensors. The
  editor now applies the same defaulting logic as the card.

### Changed
- History chart data is now downsampled (averaged into fixed time bins,
  roughly one point per 4 px of chart width) before the smoothing curve is
  drawn. Raw History API data can be noisy with many closely-spaced state
  changes; without downsampling the smoothed curve still looked jagged. The
  chart is now visually calmer and closer to other popular history-graph
  cards, regardless of how many raw data points the sensor produced.
## [1.2.0] - 2026-06-30

### Added
- Optional `icon` next to the card title, or replacing it entirely
  (`icon_mode: beside` / `replace`), selectable via the visual editor's icon
  picker. The stub configuration now suggests a default tank icon.

### Changed
- History chart curves are now smoothed using Catmull-Rom interpolation
  (converted to cubic Béziers), matching the look of popular history-graph
  cards instead of straight-segment lines.

### Fixed
- The chart sensor multi-select could get out of sync with the rendered
  chart: on first enabling the chart, all configured sensors were drawn but
  none appeared selected in the editor: selecting one made the others
  disappear, and deselecting it left an empty chart area. `chart_sensors` is
  now always explicitly populated with all configured sensors as soon as the
  chart is enabled, so editor and rendering stay consistent from the start.

## [1.1.2] - 2026-06-30
 
### Fixed
- Chart configuration fields (`show_chart`, `chart_position`, `chart_hours`,
  `chart_style`, `chart_sensors`) were not localized in the visual editor and
  always showed up in English regardless of the Home Assistant language. The
  editor's label resolver now covers all chart-related fields.

## [1.1.1] - 2026-06-29

### Fixed
 - Translation error on graphical editor window

## [1.1.0] - 2026-06-29
 
### Added
- Optional history chart rendered below or above the tank (configurable).
- Selectable history period: 2 h, 6 h, 12 h, 24 h, 48 h.
- Two chart styles: area (filled) or lines only.
- Selector to choose which configured sensors appear in the chart.
- When the chart is active and more than one series is shown, the tank dots
  switch to fixed series colors (red / orange / blue) to match the chart
  legend, instead of the temperature-ramp color.
- History data fetched via HA REST History API; auto-refreshed every 60 s.

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

[1.2.1]: https://github.com/naked-head/puffer-card/releases/tag/v1.2.1
[1.2.0]: https://github.com/naked-head/puffer-card/releases/tag/v1.2.0
[1.1.2]: https://github.com/naked-head/puffer-card/releases/tag/v1.1.2
[1.1.1]: https://github.com/naked-head/puffer-card/releases/tag/v1.1.1
[1.1.0]: https://github.com/naked-head/puffer-card/releases/tag/v1.1.0
[1.0.0]: https://github.com/naked-head/puffer-card/releases/tag/v1.0.0