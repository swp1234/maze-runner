# Maze Runner

Procedural maze game published at `/maze-runner/` on DopaBrain.

## Current product

- Normal, fog-of-war, and timed modes
- Keys, bonus items, traps, enemies, hints, and a minimap
- Keyboard, pointer, touch, sound, local progress, and PWA support
- 12 locale bundles and four focused related game routes

## Advertising status

Ad loading, interstitials, rewarded lives, and manual pushes are disabled while the site is under an invalid-traffic review that began on 2026-09-03. Restoring them requires a separate policy review and verified release.

## Analytics contract

Each private stage fires at most once per page view:

`maze_runner_view -> maze_runner_start -> maze_runner_progress -> maze_runner_complete -> maze_runner_share / maze_runner_related_click`

The events contain no mode, stage number, path, score, time, result, error description, or URL. A share is recorded only after the native share or clipboard operation succeeds. Historical `exception`, `page_engage`, traffic-quality, and generic cross-promo events are excluded from product decisions.

## Local run

Serve the repository root over HTTP and open `/maze-runner/?lang=en`. The repository-level `verify:maze-runner-suspension` command is the release gate for source mutations and mobile/desktop browser journeys.
