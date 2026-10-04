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
