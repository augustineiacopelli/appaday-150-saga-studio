# Saga Studio (AppADay 150)

Saga Studio unifies the four Saga forges into one pipeline: Charter and Rules (Day 146), Art and Audio (Day 147), World (Day 148), and Story (Day 149), with one project store, then plays the finished game and exports it as a standalone HTML file or zip. It is the AppADay Day 150 milestone.

Live: https://augustineiacopelli.github.io/appaday-150-saga-studio/
Portfolio: https://augustineiacopelli.github.io/appaday/

## Status

Phases 0 to 3 of 7 are complete: the vendored forges and fixtures, the load sandwich, one store, one import and one project list, and now the gated five stage pipeline with the unresolved references drawer. The player shell arrives in Phase 4. See build-log.txt for the full record.

## Layout

| Path | What it holds |
| --- | --- |
| core/ | KIT:CORE and its CSS (cut once from Day 146), and the Studio's own files: studio.js (the sandwich), idb.js (the store), projects.js (the importer and project list), studio-boot.js |
| engines/ | The five game engines (render, audio, world, battle, story) in load order |
| forge/146 to forge/149 | One file per forge fence, copied byte for byte from each forge's shipped page |
| forge/manifest.json | Every vendored file with its sha256, size, load order, and the owners' commits |
| vendor.js | Developer tool that cuts and verifies the vendored files; the shipped page has no build step |
| day146.js to day149.js | Locate sibling clones of the four forges (never committed) |
| test/ | jsdom tests and the fixture builder |
| build-log.txt | The session by session build record; read it first |

## Working on it

Clone the four forges next to this repository (appaday-146-saga-forge, appaday-147-art-and-audio-forge, appaday-148-world-forge, appaday-149-story-forge). Then:

```
node vendor.js --check     # every vendored file still byte equal to its owner
cd test && npm install     # once
node make-demo.js          # rebuild the Day 149 Final fixtures (byte identical on rebuild)
node phase0.js             # Phase 0 acceptance
```

Never edit anything in core/, engines/, or forge/ by hand. Change the owning forge, then run node vendor.js.

## Phase 1: the load sandwich

index.html loads every forge into one page with no build step. Each forge's own scripts sit between `Studio.begin('x')` and `Studio.end('x')`. While a forge loads, core/studio.js swaps the Kit store, import and export functions, `Kit.mount`, `Kit.on`, the registries and `window.WS` for recording proxies, and restores the real ones when it ends. Tab ids are filed under the stage (art.world, world.world), CSS is scoped to `body[data-stage]`, and the stage on screen gets its own recorded Kit functions, handlers, validators, record types and ID prefixes back (native mode). Nothing visible ships yet.

```
cd test && npm install
node phase1.js                       # the Studio's own acceptance (63 checks)
node run-forge-suites.js             # every phase test of Days 147 to 149, unchanged, driven inside this page
```

Result: 2039 of 2040 forge checks pass. The one difference is Day 147's phase 5 check that the battle engine declares no global: on its own page Day 146 is absent, here Day 146's Arena legitimately defines ENGINE_BATTLE. test/archive/phase0.js is the retired Phase 0 acceptance (it checked the old built-page vendoring).

## Phase 2: one store, one import, one project list

The Studio keeps every project in IndexedDB (database `saga-studio`: a `projects` store keyed by project id that holds the bundle, and a `meta` store that holds the project list, the current id and Kit's other keys). An in memory mirror keeps Kit's synchronous `Kit.store.get` working, and Kit's own debounced autosave drives the writes. Without IndexedDB the same two stores live in localStorage. `kit:settings` (the Claude key) stays in localStorage on purpose, because every AppADay app on the origin shares it.

One importer takes a bundle from any forge, runs `Kit.bundle.migrate`, reads `kit.forges` and files the project at the furthest stage whose Final is present. The forges' import gates are gone from the Studio; Phase 3 moves them into the pipeline. The Import button asks one question only when the file is a project already here (Replace, Keep both, Cancel). The Projects button (was Slots) opens, duplicates and deletes projects, and offers the drafts the forges left in this browser (`art147:draft`, `world148:draft`, `story149:draft`, in localStorage or in `appaday-149` IndexedDB, plus `kit:draft`), added as projects without moving the originals.

Every export is the stage on screen's own (`Kit.buildExport` and `Kit.openExport` pass to it), so each writes `kit.forges['14N']` exactly as the forge does and a Studio bundle opens in Days 146 to 149.

Native mode (each forge keeps its own storage) is now opt in, for the forges' own phase suites: set `window.STUDIO_NATIVE` before the page loads. test/boot.js does that unless a test passes `native: false`.

```
cd test
node phase2.js                       # the Studio's Phase 2 acceptance
node phase1.js                       # still 63 of 63 (native mode)
node run-forge-suites.js             # the forges' own suites, inside this page (native mode)
```

## Phase 3: the pipeline and the unresolved panel

The shell header shows five stages: Charter and Rules, Art and Audio, World, Story, Game. A stage unlocks when the stage before it is marked Final and its readiness function still returns true against the bundle in memory. A locked stage refuses a click with the reason, and a project opens at the furthest stage that is not locked. Mark stage Final runs the stage's own checks and its own Final export logic (opening its namespace and stamping the hash) and discards the files, so nothing is downloaded and nothing is reimported. Stale badges come only from the stamps the forges already keep: the Charter version, a predecessor that is no longer Final, and Day 149's world stamp. The unresolved drawer (core/unresolved.js) calls Kit.validate plus each reached stage's checks, groups findings by namespace, lists FORWARD references apart as owed (they never block until the owing stage opens), and every Jump switches stage first. The drawer stays open across reloads. Tests: test/phase3.js, 72 checks.
