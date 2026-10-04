# Saga Studio (AppADay 150)

Saga Studio unifies the four Saga forges into one pipeline: Charter and Rules (Day 146), Art and Audio (Day 147), World (Day 148), and Story (Day 149), with one project store, then plays the finished game and exports it as a standalone HTML file or zip. It is the AppADay Day 150 milestone.

Live: https://augustineiacopelli.github.io/appaday-150-saga-studio/
Portfolio: https://augustineiacopelli.github.io/appaday/

## Status

Phase 0 of 7 is complete: the repository, the vendored forge sources, and the Day 149 Final fixtures. The Studio shell arrives in Phase 1. See build-log.txt for the full record.

## Layout

| Path | What it holds |
| --- | --- |
| core/ | KIT:CORE and its CSS, cut once from Day 146 and verbatim in every forge |
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
