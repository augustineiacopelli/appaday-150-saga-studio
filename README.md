# Saga Studio (AppADay 150)

Saga Studio unifies the four Saga forges into one pipeline: Charter and Rules (Day 146), Art and Audio (Day 147), World (Day 148), and Story (Day 149), with one project store, then plays the finished game and exports it as a standalone HTML file or zip. It is the AppADay Day 150 milestone.

Live: https://augustineiacopelli.github.io/appaday-150-saga-studio/
Portfolio: https://augustineiacopelli.github.io/appaday/

## Status

Phases 0 to 6 of 7 are complete: the vendored forges and fixtures, the load sandwich, one store, one import and one project list, the gated five stage pipeline with the unresolved references drawer, the player shell that plays a finished game from its bundle alone, Test Play from the Story and Game stages, from the title or from any chapter, map or battle, and now Build game, which writes a finished project out as a game that plays on its own, as one HTML file or as a folder in a zip. Phase 7 (tests across everything, layout audits, ship) is next. See build-log.txt for the full record.

## Layout

| Path | What it holds |
| --- | --- |
| player/ | The game itself: player.html, player.js, player.css. Kit free; loads with the five engines and a bundle only |
| core/ | KIT:CORE and its CSS (cut once from Day 146), and the Studio's own files: studio.js (the sandwich), idb.js (the store), projects.js (the importer and project list), pipeline.js and unresolved.js (the stages and the drawer), testplay.js (Test Play), export.js (Build game), player-text.js (the player as strings, derived by vendor.js), studio-boot.js |
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

Never edit core/kit.js, core/kit.css, engines/, or forge/ by hand. Change the owning forge, then run node vendor.js. After any change to player/, run node vendor.js too: it rederives core/player-text.js, which Build game writes the player from, and vendor.js --check fails until it does.

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

## Phase 4: the player shell

player/player.js and player/player.css are the game. They load with nothing but the five engines and a Final bundle, per Day 149's day150 contract, and declare one global, SagaPlayer. Open player/player.html?bundle=../test/out/demo149-bundle.json (or four149) to play a fixture; an exported game will carry its bundle inline instead.

The overworld and every interior are rebuilt from the seed with ENGINE_WORLD exactly as Day 148 recorded them (the bake is used when it still matches), and the walker from Day 147's playtest turns standing, stepping, entering and talking into the moves ENGINE_STORY.host.moves offers. A choice or a battle needs a person while the story hooks are synchronous, so a move is played with the answers in hand, stops at the first unanswered question, shows the effects so far, and is played again from the same state with one more answer. Battles run ENGINE_BATTLE behind ENGINE_RENDER's presenter with Day 147's command menu, and outcomes map through Day 149's OUTCOMES table (flee only when the story allows escape). The party is Day 146's buildParty (bestGear, placeMateria, epsFor) for the current chapter, and the Equip and Materia screen edits it. Menus are Status, Equip and Materia, Items, Journal, Airship (once held), Save, and Settings. Saves use ENGINE_STORY.save in localStorage under the game's slug, with an autosave, three slots, and download and load of save files. Random encounters come from Day 148's zones. Dungeon small keys and treasure are the shell's own, so the story state stays exactly what the walk proved. Audio starts on the first tap; phones get the touch controller drawn with Day 147's touch skin, desktops the keyboard.

```
cd test
node phase4.js        # 50 checks in headless Chromium (Playwright): static rules, a bare engines only page, the opening
                      # against the contract, both fixtures' golden paths and every demo ending played by walking the
                      # world, saves, menus, a hand fought battle, game over, layout at 390 and 1280
```

test/player-bot.js is the bot those runs use: it walks with the player's own route planner, fetches small keys, answers choices, and lets battles run on auto.

## Phase 5: Test Play from anywhere

The Story and Game stages carry a Test Play button, and the Game stage has the same start picker in its panel. Test Play opens player/player.html, the page Build game will package, in a full screen frame above the Studio and posts it `{type: 'saga:play', bundle, test}` with the bundle in memory, so what is tested is what ships. Four starts:

| Start | What happens |
| --- | --- |
| New game | The title's New Game: the opening and all |
| Start of a chapter | The Studio replays Day 149's golden path (STORY.day150's golden.steps, the path the story checks proved) through ENGINE_STORY.host.play, every choice and battle answered as the path answered it, and stops the moment the chapter is the one asked for. The player lands where that chapter's opening put the party (the last changeMap after the chapter began), else at the chapter's start town, on exactly the state the replay reached |
| On a map | The same replay to the map's chapter, then the player stands at the map's entrance (the site entrance, else where another map's exit arrives) |
| A battle | The same replay to the troop's chapter, so the party is that chapter's with its gear tier and materia, then the fight starts at once. The outcome comes back to the Studio's bar; the story state is untouched |

Restart posts the same start again, Change start reopens the picker over the frame, and Close or Escape gives the Studio back. Saves made in a test go under `saga150test:` so testing never overwrites a real save of the game. Only chapters on the golden path can be started directly; the picker says why when the story checks have not proven a path yet. A project whose Story stage is locked cannot Test Play.

```
cd test
node phase5.js        # 63 checks in headless Chromium: static rules, the button on Story and Game only and refused when locked,
                      # a new game to the contract opening hash, every chapter of both fixtures on the exact replayed state,
                      # the rest of the golden path walked to the golden ending from the last chapter's start, map and battle
                      # starts, test saves kept apart, Restart, Change start, Close, Escape, the Game picker, layout at 390 and 1280
```

## Phase 6: Build game

The Game stage's Build game section writes the project out as a game that stands on its own. What a game is comes from Day 149's Day 150 contract: the five engines in load order (render, audio, world, battle, story) and the Final bundle, with nothing from any forge, no Kit, no network and no key. The player is player/player.js, the same file Test Play runs, so what was tested is what ships.

| Button | What it writes |
| --- | --- |
| One HTML file | `<slug>.html`: player.css in a style element, the five engines inline byte for byte in contract order, the bundle as a `type="application/json"` script, then player.js. Opens from disk with no network and nothing beside it |
| Folder as a .zip | `<slug>-game.zip` holding `<slug>/`: index.html (the player and the bundle inline, the engines loaded from beside it), the five engine files, bundle.json, Day 149's story manifest and a README. Upload the folder to any static host, GitHub Pages included. engine-story.js carries the bundle hash on its `/* Bundle hash */` line, as Day 149's Final writes it |

Both buttons need every forge stage Final and none stale, and the unresolved drawer empty. When the only thing missing is a story check that has not run on the project as it is now, the button runs the checks first and builds if they pass. Before writing anything, both forms recheck every engine's sha256 against the game kit table and the player's against core/player-text.js, and check that the manifest's contract asks for the same engines in the same order with the same pins; any mismatch stops the build and names the file. The bundle is the only text escaped (`<`, `>`, `&` and every non ASCII character as `\uXXXX`), so a built page is pure ASCII. Building changes nothing in the project, and the same project builds the same bytes: the manifest's exportedAt and every zip entry carry the project's last saved time. JSZip loads from cdnjs only when the zip button is pressed; when cdnjs cannot be reached, the same nine files download one by one under names that cannot collide, and the toast says to rename the page to index.html.

```
cd test
node phase6.js        # 71 checks in headless Chromium: static rules and the player text, the gate (short of Final, stale,
                      # unchecked), both fixtures built as one file (engines byte for byte and pinned, the bundle exact,
                      # deterministic, nothing of the Studio inside), each opened from disk with the network refused and
                      # walked to its golden ending, every demo ending, the zip's contents, pins and bytes, the unzipped folder
                      # played from disk, the cdnjs fallback, and layout at 390 and 1280
```
