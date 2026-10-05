# Saga Studio Creator's Guide

A complete guide to making a role playing game with Saga Studio, from a blank page to a finished game. It is written for a first time creator who enjoys RPGs and has never made one.

Read it online at guide.html inside the Studio, or keep this file. Both contain the same material.

## Contents

* [Start Here](#start-here)
* [Part 1: Before You Touch the Keyboard](#before-keyboard)
* [Part 2: A Tour of the Studio](#studio-tour)
* [Part 3, Stage 1: Charter and Rules](#stage-1)
* [Part 3: Stage 2, Art and Audio](#stage-2)
* [Part 3: Stage 3, World](#stage-3)
* [Part 3: Stage 4, Story](#stage-4)
* [Part 4: Stage 5, Test, Build, and Share](#stage-5)
* [Part 5: Reference](#reference)

<a id="start-here"></a>

## Start Here

Saga Studio turns an idea into a classic role playing game that plays on its own. This guide takes you from a blank page to a finished game, one decision at a time.

### What you are making

The kind of game Saga Studio makes is the classic turn based role playing game: a hero and a party of companions, a world map you walk across, towns with shops and people to talk to, dungeons with treasure, random battles, bosses at the end of each chapter, and a story that builds to an ending. You fill in forms, press buttons that build large pieces for you, test as you go, and at the end press **Build game** to get one file that anyone can open in a web browser.

You do not need to write code. You do need to make decisions: who the hero is, what the world feels like, how the story ends. The Studio keeps track of the details, checks your work, and tells you plainly when something does not fit together yet. This guide is mostly about those decisions, because that is where first time creators get stuck.

### What you need

* A modern web browser. A laptop or desktop is much easier for long sessions. A phone works for reading, testing, and light edits.
* No account, no install, and no payment. Your projects are saved inside your browser.
* Optional: a Claude API key. It switches on a few helpers (the Charter Interviewer, drafting dialogue lines, and an art helper). Everything required to finish a game works without one.
* Paper or a notes app. Part 1 asks you to think before you type, and a Design Sheet is included for that.

### How long it takes

Plan on several sessions, not one. As a rough planning figure (an estimate, not a measurement): one or two hours of planning on paper, one or two hours for the Charter, a few hours for Rules, under an hour for Art and Audio if you let **Quick Build** do the heavy lifting, under an hour for the World, a few hours for the Story, and an hour of testing and building. A weekend or a handful of evenings is realistic for a first game.

> **The one habit that matters most.** Export your project regularly. Your work lives in your browser, and browsers can lose it if storage is cleared or full. The **Export** button in the project bar writes a bundle file you can keep anywhere. Do it at the end of every session.

### How this guide is organized

1. **Part 1, Before You Touch the Keyboard.** A step by step way to think a game through on paper, ending with a Design Sheet you can fill in.
2. **Part 2, A Tour of the Studio.** What every part of the screen does, how projects are saved, and how stages lock and unlock.
3. **Part 3, Stage by Stage.** Every tab, form, and field in the five stages, in the order you meet them.
4. **Part 4, Test, Build, and Share.** Playing your game, building the finished file, and putting it on the web.
5. **Part 5, Reference.** ID prefixes, a glossary, troubleshooting, and a final checklist.

### Conventions used here

* Words in **bold** are labels exactly as they appear on screen, such as a button or a field name.
* **Required** means the Studio will not let you move on until the field is filled in.
* **Limit** is the maximum number of characters a field accepts.
* A running example appears in shaded boxes. It is an invented game called **The Salt Lantern** and it is only there to show what good answers look like. Use your own ideas.
* Words in `code style` are IDs and file names. You rarely type them, but you will see them.

### The five stages at a glance

Saga Studio is a pipeline of five stages that run in a fixed order. Each stage builds on the one before it, and a stage stays locked until the stage before it is marked **Final**.

| Stage | You decide | The Studio builds for you | Opens when |
| --- | --- | --- | --- |
| 1. Charter and Rules | Premise, setting, hero, party, villain, chapters, endings, battle style, characters, enemies, abilities, items, equipment, shops | The Codex of record types, battle simulations, difficulty targets | Always open |
| 2. Art and Audio | Colors, character looks, interface style, music and sound choices | Sprites, portraits, tilesets, animations, icons, music, sound effects (Quick Build) | Charter and Rules is Final |
| 3. World | The seed, how big each continent is, where encounters happen | The world map, every town, dungeon, and cave interior, encounter zones | Art and Audio is Final |
| 4. Story | Quests, dialogue, events, endings, gates | A starting set of quests, dialogue, and events for every chapter, then checks that the whole story can be finished | World is Final |
| 5. Game | Where to start a test, how to package | Test Play, and the finished game as one file or a folder | Story is Final |

<a id="before-keyboard"></a>

## Part 1: Before You Touch the Keyboard

An hour of thinking on paper saves many hours of rebuilding. The Studio will happily let you start typing, but every later stage builds on what you decide in the Charter. This part walks you through those decisions in the order that makes them easiest.

> **Why planning matters here.** You can change the Charter after you lock it, using **Amend**. But a changed Charter marks every later stage **Stale**, and you will need to review and rebuild what depended on the change. Small edits cost little. Changing the premise, the number of chapters, or the battle style in the middle of the project costs a great deal.

1. **Write the one sentence pitch.** Complete this sentence: "A game about **[hero]** who must **[goal]** before **[consequence]**, in a world where **[what makes it special]**, feeling **[tone]**." If you cannot say it in one breath, the idea is not ready yet. Everything else in this guide grows out of that sentence, and it becomes the seed of your Premise.
2. **Choose your scale honestly.** Decide how big the game is before you decide what is in it. The Charter asks for the number of towns, dungeons, enemy families, bosses, and target play hours. The Studio also expects the main story to be planned at **twelve hours or more**: the Story checks add up each chapter's target minutes and require at least 720. Plan for that from day one. Six chapters of about two hours each reaches it. Trying to stretch a three chapter plan at the end is how people get stuck.
3. **Pick a battle style.** Choose one of the two presets, or build a custom one. Presets are far easier for a first game. See the comparison below. This choice shapes the Rules stage, so make it early.
4. **Design the hero and the party.** Write one paragraph for the hero and a short entry for each companion: name, a sentence of past, what they want, how they fight, and how they look. Fewer, vivid characters beat many thin ones. The Studio suggests eight starting party members but only warns if you have fewer.
5. **Give the villain a reason.** A villain needs a name, a command (what they control), and a motive. The best motives are almost sympathetic, and the Studio says so right in the field help. Decide who the boss is at the end of each chapter, because every chapter ends with one.
6. **Outline the chapters.** Chapters are the spine of the whole project. For each one write a name, a continent label, a two or three sentence summary, and a target in minutes. Chapters that share a continent label share a continent on the map. Decide what changes at the end of each chapter: a new place opens, a companion joins, a vehicle appears, the stakes rise.
7. **Plan the endings.** Decide at least one ending, and ideally two or three. Write each as a name and a concept. Later you will tie them to choices the player makes, so think now about which decisions matter. Keep it small for a first game.
8. **Decide how magic and weather work.** Write down where magic comes from, what it costs, and who can use it. Then decide how it ties to weather and the sky. Weather is a signature feature of the Studio: each weather state changes battles and how often enemies appear, and each one is named after a real world phenomenon such as fog or a thunderstorm.
9. **Name your themes, canon, and vocabulary.** Themes are short phrases the story keeps returning to. Canon is a list of facts that must never be contradicted. The glossary is every invented name with a one line definition. Writing these down now keeps your own story consistent six hours from now.
10. **Choose the look and the sound.** Decide the mood in a few words and the colors that go with it. Choose a tile size (sixteen pixels is the common default), a screen resolution (256 by 224 is the default), and a control scheme for phones. Pick a musical theme for the hero and another for the villain, because the Studio builds all the music from motifs.
11. **Sketch the world on paper.** Draw each continent as a blob. In each one mark where the first town is, where the key dungeon and the boss dungeon are, and where the sea is. You are not designing the geography, because the Studio generates it from a seed. You are deciding the journey: the order a player visits places and what blocks the way until they are ready.
12. **Plan the extras.** Side quests and each character's personal story are optional but make a world feel alive. Jot down two or three side quest ideas with a giver and a reward, and a personal arc for any companion who has one.
13. **Define done.** Write down what "finished" means before you start: playable from the title screen to an ending, every Studio check passing, and a built file that opens on a phone. When you are tempted to add one more thing, check it against that sentence.

### Choosing a battle style

The **Ruleset** section of the Charter offers three starting points. Pick a preset unless you have a very specific reason not to.

|  | Saga Preset | Classic Preset | Custom |
| --- | --- | --- | --- |
| Battle engine | Active Time Battle: each fighter has a gauge that fills with speed, and acts when it is full | Round based turns: everyone chooses, then everyone acts in order | You choose |
| Progression | Materia: slotted magic orbs that grow as you earn ability points | Classes | You choose (materia, jobs, or classes) |
| Elements | Six: fire, water, earth, air, holy, unholy, in three opposed pairs | Four: fire, ice, lightning, earth, no opposed pairs | You declare them |
| Saving | The Charter records a save policy, but the finished game always offers autosave plus three slots | Same as Saga | Same as Saga |
| Wait mode | On: gauges pause while a menu is open | Off | You choose |
| Good for | A first game that feels like a classic of the genre | A simpler, more traditional battle system | People who already know what they want |

### What a chapter becomes

It helps to know what the Studio does with each chapter, so you can plan content that fits. For every chapter the Studio creates a region on the map, a starting town, a key dungeon, and a boss dungeon. The main quest for each chapter follows the same five stages: arrive in the starting town, clear the key dungeon, defeat the boss, take the road to the next region, and complete the chapter. The last chapter ends with a castle and the finale instead. Chapters are linked by gates that open when the story says so, and vehicles such as a ship and later an airship appear as the story moves on.

> **Think in sets of three.** Each chapter needs a place to arrive, a puzzle to solve, and a boss to beat. If you can describe those three things in a sentence each, the chapter is ready to be typed in.

### A classic story shape for the chapters

If you are not sure how to pace six chapters, this common shape works well and is easy to adapt. It is a suggestion, not a rule.

| Chapter | Job in the story | What the player should feel |
| --- | --- | --- |
| 1 | Introduce the hero, the world, and the first threat. Teach battles gently. | Curiosity and a small win |
| 2 | Widen the world and add a companion or two. Show the villain's reach. | Momentum |
| 3 | Cross a threshold to somewhere unfamiliar. Reveal a secret about the hero or the villain. | Surprise |
| 4 | Raise the stakes. Give the player a new way to travel or fight. | Power and danger together |
| 5 | The lowest point. A loss, a betrayal, or a hard choice. | Doubt |
| 6 | The finale. The villain, the hard choice paid off, and the ending. | Release |

> **Running example: The Salt Lantern**
>
> **Pitch.** A game about a lighthouse keeper's apprentice who must relight the sea lamp before the fog swallows every harbor on the coast, in a world where weather is a kind of magic, feeling hopeful and a little lonely.
>
> **Scale.** Six chapters of about two hours each. Three towns on the first two continents, six dungeons in all, six bosses.
>
> **Battle style.** Saga Preset, because the weather magic fits six elements in three opposed pairs.
>
> **Party.** The apprentice, a retired smuggler, a weather scholar, a harbor guard, and a ferry captain's child.
>
> **Villain.** The Hollow One, a drowned lighthouse keeper who believes darkness is kinder than a light that fails.

### The Design Sheet

Copy this sheet onto paper or into a notes app and answer every line before you open the Charter. The order matches the Charter, so when you start typing you are only copying your answers across. Where the Studio has a limit, it is shown.

**The Pitch**

* [ ] My one sentence pitch (hero, goal, consequence, what makes the world special, tone)
* [ ] Saga title (limit 80 characters)

**Premise and World**

* [ ] Premise: two or three sentences, who, where, and what is at stake
* [ ] Setting: the world, its regions, and its era
* [ ] Tone, in a short phrase (limit 160 characters), for example hopeful, melancholy, or wry
* [ ] Technology level, in a short phrase (limit 160 characters), for example medieval, steam age, or ruined machines

**Magic**

* [ ] Where magic comes from, what it costs, and who can use it
* [ ] How magic ties to weather, sky, or seasons (optional but recommended)

**Cast**

* [ ] Protagonist: who they are, what they want, and what stands in the way
* [ ] Each party member: name (limit 60) and a one sentence past (limit 300), plus how they fight and what they want
* [ ] Villain: who they are and what they command
* [ ] Villain motive: why they do it, ideally almost sympathetic

**Structure**

* [ ] Number of chapters, and the target minutes for each (the total should reach 720 or more)
* [ ] For each chapter: name, continent label (limit 60), a short summary, and what changes at its end
* [ ] The boss at the end of each chapter
* [ ] Endings: a name (limit 80) and a concept for each
* [ ] Themes: a few short phrases, for example "grief and memory" or "borrowed time"

**Consistency**

* [ ] Canon: facts that must never be contradicted, one statement each (limit 400)
* [ ] Glossary: each invented term (limit 80), its category, and a definition (limit 500)

**Rules and Scale**

* [ ] Battle style: Saga, Classic, or Custom
* [ ] Quotas: towns, dungeons, enemy families, bosses, and target play hours
* [ ] Weather states I want, each tied to a real phenomenon
* [ ] Two or three side quest ideas, each with a giver, a chapter, and a reward

**Look and Sound**

* [ ] Mood in three words, and the main colors
* [ ] Tile size (8 to 64 pixels, 16 is common), and screen size (default 256 by 224)
* [ ] Control scheme for phones: D pad and buttons, virtual stick and buttons, tap to move, or hybrid
* [ ] A musical idea for the hero and a different one for the villain

### Mistakes first time creators make

* **Planning too small a story.** The twelve hour floor is real. Decide your chapter count early.
* **Too many characters.** Every party member needs stats, a look, a portrait, and a place in the story. Five vivid characters are better than eight blurry ones.
* **A villain without a reason.** Players forgive a simple plot. They do not forgive a villain who just wants to be evil.
* **No ending plan.** Decide where the story is going before you decide how it starts.
* **Skipping difficulty.** Battles that are too easy or too hard ruin pacing. The Rules stage has a Simulator for exactly this. Use it.
* **Editing the Charter late.** Amending is allowed, but every change marks later stages as stale.
* **Never exporting.** One cleared browser can erase days of work. Export at the end of every session.

### Are you ready to start typing?

If you can answer yes to all of these, open the Studio.

**Readiness check**

* [ ] I can say my game in one sentence.
* [ ] I know how many chapters it has and roughly how long each lasts.
* [ ] I know who the hero, the party, and the villain are, and why the villain acts.
* [ ] I have written at least one ending.
* [ ] I have chosen Saga, Classic, or Custom for the battle style.
* [ ] I have a canon list and a glossary, even if short.
* [ ] I know what "done" means for this game.

<a id="studio-tour"></a>

## Part 2: A Tour of the Studio

Before the stages, a quick look at the screen itself: what each control does, how your work is saved, and how stages lock and unlock.

### The screen from top to bottom

1. **Header.** The Saga Studio title with an App 150 badge, a link back to the AppADay portfolio, a sound button, a theme button that switches between the night and parchment looks, and the **Settings** gear.
2. **Project bar.** Your project title (tap it to rename), a size chip showing how large the project is, a **Coverage** chip that appears once art exists (for example 173/173 means every required piece of art is present), and a validation chip showing OK, warnings, or errors. Then four buttons: **Save**, **Projects**, **Import**, and **Export**.
3. **Stage bar.** Five numbered buttons, one for each stage, each with a status chip: **Locked**, **Open**, **Stale**, or **Final**. Tap a locked stage and the Studio tells you why it is locked.
4. **Status row.** A sentence about the current stage on the left, then the **Mark stage Final** button, a **Test Play** button (on the Story and Game stages), and the **Unresolved** button with chips that show how many warnings are open.
5. **Tabs.** The workspaces inside the current stage. Each stage has its own set of tabs.
6. **Workspace.** Where you fill in forms and press buttons.
7. **Footer.** The app name and the link to the portfolio.

### Starting and managing projects

The Studio opens with a blank project called **Untitled Saga**. Tap the title in the project bar to rename it. The **Projects** button opens your project list, where you can start a **New project** (it asks for a title and a **Create** button), open an existing one, duplicate it, or delete it. It also offers any drafts that the standalone forge apps left in this browser, added as new projects without touching the originals.

**Import** reads a bundle file. If the file is a project you already have, it asks one question with three answers: **Replace**, **Keep both**, or **Cancel**. The Studio files an imported project at the furthest stage it has already completed.

> **Ignore the demo buttons on the Start tabs.** The Start tab of Art and Audio, World, and Story each show a **Load the demo** button and a **Load a Day N bundle** button. They are leftovers from the standalone forge apps. The Studio ships no demo game, so **Load the demo** does not load anything here. Use **Projects** and **Import** in the project bar instead.

### How your work is saved

* The Studio saves automatically to this browser as you work, using IndexedDB (or local storage if that is not available).
* **Save** (or Ctrl+S) saves a draft immediately.
* If the browser refuses to save because storage is full, a banner appears: "This browser refused to save the draft because storage is full. Export the bundle now so no work is lost." Press **Export now**.
* The size chip turns amber as the project grows past about 1.5 MB and red when you are close to the browser limit. Open it for details.
* **Export** writes a bundle file for the stage on screen. The bundle still opens in the four original forge apps, so it is both your backup and your way to move a project to another computer.

> **A good backup rhythm.** Export at the end of every session, and again whenever you mark a stage Final. Name the files with the date. Keep them somewhere that is not this browser.

### How stages lock and unlock

A stage unlocks when the stage before it has been marked **Final** and still holds. You never download anything to move forward. **Mark stage Final** runs that stage's own checks, stamps the result, and unlocks the next stage. Here is what a locked stage tells you:

| Where you are stuck | What the Studio says | What to do |
| --- | --- | --- |
| Art and Audio is locked | Lock the Charter on the Charter stage first. | Finish the Charter and press Lock Charter, then mark Charter and Rules Final. |
| Any stage is locked | Mark the [previous stage] stage Final first. | Go back one stage and press Mark stage Final. |
| World will not open | The Charter has no chapters, or art has no biome tilesets or interior tilesets. | Add chapters in the Charter, and run Quick Build in Art and Audio. |
| Story will not open | The world has no Final export, or the world does not validate cleanly. | Fix the World validation tab, then mark World Final. |
| Game will not open | Mark the Story stage Final first. | Get every Story check to pass, then mark Story Final. |

### Stale stages

A stage that was marked Final can become **Stale** when something upstream changes underneath it. The Studio shows a **Stale** chip and a sentence that says why. It happens when:

* You amend and relock the Charter after a later stage was marked Final.
* A stage before it is no longer Final.
* The world changed after the Story was built on it.

To clear a stale stage, review it and mark it Final again. One known gap, stated plainly: if you edit art after marking the World Final, the Studio does not flag the world as stale, though the World checks still catch any tile or sprite reference that actually breaks.

### Errors, broken references, and forward references

The validation chip and the **Unresolved** drawer use three words you will see all the time.

| Word | Meaning | Does it block you? |
| --- | --- | --- |
| Error | A field is missing, out of range, or malformed. | Yes, until fixed. |
| Broken | A record points at something that does not exist, such as an enemy that was deleted. | Yes. A Final export is blocked while a reference is broken. |
| Forward | A record points at something a later stage owes you, such as a sprite that Art and Audio has not made yet. | No. It is owed, not broken, and is only checked once the owing stage opens. |

The **Unresolved** drawer lists everything that still points nowhere, grouped by area, with forward references shown separately as owed. Every item has a **Jump** button that takes you to the exact record and field. The drawer stays open between visits until you close it.

### Settings

The gear in the header opens **Settings**.

| Field | What it does |
| --- | --- |
| Claude API key | Optional. Switches on the AI helpers. Stored only in this browser and shared with other AppADay apps on the same site. Use **Show or hide key** to check it, **Test Key** to verify it, and **Clear key** to remove it. |
| Session name | A label for your own reference, kept with your settings. For example "Saga weekend build". |
| Theme | Match system, Night, or Parchment. |
| Model tiers (haiku, sonnet, opus, fable) | Which Claude model each helper uses. Leave blank to use the portfolio default. You normally never change these. |
| Storage | How much browser storage the project is using. |

<a id="stage-1"></a>

## Part 3, Stage 1: Charter and Rules

The first stage is where you decide everything the rest of the game depends on. It has five tabs: Charter, Codex, Rules, Arena, and Simulator. You finish by locking the Charter and marking the stage Final.

### The order of work

1. Fill in every section of the **Charter**.
2. Press **Lock Charter**. This opens the Codex.
3. On the **Codex** tab, press **Generate Codex**. This opens Rules.
4. Build your content on the **Rules** tab: characters, enemies, abilities, items, equipment, troops, and shops.
5. Test fights in the **Arena** and balance them in the **Simulator**.
6. Press **Mark stage Final**.

### The Charter tab

The Charter has thirteen sections, listed down the side on a wide screen or behind a menu on a phone. Each section shows a status as you fill it in. The bar at the top shows whether the Charter is **Draft**, **Locked** with a version number, or **Amending**, and says how many items still need finishing before it can lock.

### Premise

| Field | Required | Limit | What to write |
| --- | --- | --- | --- |
| Saga title | Yes | 80 | The name of your game. |
| Premise | Yes | None | Two or three sentences: who, where, and what is at stake. |
| Setting | Yes | None | The world, its regions, and its era. |
| Tone | Yes | 160 | For example hopeful, melancholy, or wry. |
| Technology level | Yes | 160 | For example medieval, steam age, or ruined machines. |

### Magic

| Field | Required | What to write |
| --- | --- | --- |
| Magic system | Yes | Where magic comes from, what it costs, and who can use it. |
| Weather tie | No | How magic connects to weather, sky, or seasons. Rules can use this to ground weather states. |

### Villain and Protagonist

| Section | Field | Required | What to write |
| --- | --- | --- | --- |
| Villain | Villain | Yes | Who they are and what they command. |
| Villain | Motive | Yes | Why they do it. The best motives are almost sympathetic. |
| Protagonist | Protagonist | Yes | Who they are, what they want, and what stands in the way. |

### Starting Party

A list of the companions who begin the journey with the hero. Add one entry for each. The target is eight but you can add more or fewer, and the Studio only warns if you have fewer than eight. It also warns if two members share a name.

| Field | Required | Limit | What to write |
| --- | --- | --- | --- |
| Name | Yes | 60 | The character name. |
| Past | Yes | 300 | One sentence about who they were before the story. |

> **How many fight at once.** Your Charter can list as many companions as you like, but the finished game puts at most four characters in the active party at a time. Plan your story so that the full cast rotates in and out rather than all fighting together.

### Chapters

Chapters are the spine of the saga. Add the first one to begin the outline. Each chapter gets a permanent ID that every later stage refers to, so a chapter keeps its identity even if you rename it. You need at least one chapter before the Charter will lock.

| Field | Required | Range or limit | What to write |
| --- | --- | --- | --- |
| Name | Yes | None | The chapter title. The Studio warns if two chapters share a name. |
| Continent label | Yes | 60 | Where this chapter takes place, for example "Northern Reach". Chapters that share a label share a continent on the map. |
| Summary | Yes | None | What happens in the chapter. |
| Target minutes | Yes | 1 to 600 | How long an average player should take. Later stages use this to size continents and pace difficulty. |

> **The minutes warning.** If the chapter minutes add up to far more or far less than your **Target play hours** in Quotas (outside 70 to 130 percent), the Charter shows a warning. It does not block locking, but the Story stage later requires 720 minutes in total.

### Endings, Themes, Canon, and Glossary

| Section | Field | Required | Limit | What to write |
| --- | --- | --- | --- | --- |
| Endings | Name | Yes | 80 | A short name for the ending. |
| Endings | Concept | Yes | None | How the story concludes. |
| Themes | Theme (one per entry) | Yes, at least one | None | A short phrase such as "grief and memory" or "borrowed time". Empty entries produce a warning. |
| Canon | Statement (one per rule) | No | 400 | A fact about the world that must never be contradicted. Each rule gets a permanent ID. |
| Glossary | Term | Yes, per entry | 80 | The name of a person, place, faction, creature, item, or idea. Duplicates produce a warning. |
| Glossary | Category | No | Fixed list | Person, place, faction, creature, item, magic, concept, or other. |
| Glossary | Definition | Yes, per entry | 500 | One or two sentences. |

### Specs

| Field | Required | Range | What to choose |
| --- | --- | --- | --- |
| Tile size in pixels | Yes | 8 to 64 | Square tiles. Sixteen is common for this style. |
| Internal resolution, Width and Height | No | 64 to 1920 wide, 64 to 1080 tall | The size of the game canvas. Leave both empty to use 256 by 224. Set both or neither. The Studio warns if the resolution is not a whole number of tiles. |
| Palette size | Yes | 2 to 256 | How many colors the master palette holds. |
| Mobile control scheme | Yes | Four choices | D pad and buttons, Virtual stick and buttons, Tap to move, or Hybrid: stick, tap, and buttons. |

### Quotas

| Field | Required | Range | What it means |
| --- | --- | --- | --- |
| Towns | Yes | 0 to 99 | How many towns the saga should contain. |
| Dungeons | Yes | 0 to 99 | How many dungeons. |
| Enemy families | Yes | 0 to 200 | How many kinds of enemy. |
| Bosses | Yes | 0 to 200 | How many bosses. |
| Target play hours | Yes | 1 to 500 | How long the whole game should take. Compared against your chapter minutes. |

### Ruleset

This is where you choose the battle rules the whole project is built on. Start by choosing a **Saga**, **Classic**, or **Custom** card. A preset fills in everything below. You can then edit any of it while the Charter is unlocked.

| Field | Required | What it controls |
| --- | --- | --- |
| Battle engine | Yes | turn.atb is Active Time Battle. turn.rounds is classic rounds. turn.ctb is a forecast queue. |
| Scheduler | Yes | atb, rounds, or conditional. The engine and scheduler should match: turn.atb with atb, turn.rounds with rounds. A mismatch is a warning. |
| Progression | Yes | Materia, jobs, or classes. The Codex generates the matching record type. |
| Battle options: Wait mode | No | Pause the gauges while a menu is open. |
| Battle options: Tick rate | No | 1 to 240. How often the battle updates. |
| Save policy: Slots | Yes | 1 to 16 save slots. |
| Save policy: Mode | Yes | savepoint (save only at save points) or anywhere. |
| Save policy: Suspend save | No | Allow a temporary save that is deleted when loaded. |
| Stats | Yes | A list. Each stat has a Key (lowercase letters and digits, up to 12), a Label (up to 30), a Min (0 to 99999), and a Max (1 to 99999). Max must be at least Min. |
| Elements | No, but recommended | A list. Each has a Key (up to 16), a Label (up to 30), and a Color. With no elements, abilities have no element to choose. |
| Element relations | No | Opposed pairs. Each side is the other side's weakness. An element cannot oppose itself, and a pair cannot appear twice. |
| Taxonomy | No | A Label such as Type or Kind, the Values that classify enemy families, and Inverted values. Inverted values are healed by damage and hurt by healing. |
| Formula set | No | A table that maps a role (phys, mag, heal, exp, ap, atb, var) to a built in formula template or a formula record. Unknown ids produce a warning. |

> **About the save policy fields.** The Save policy settings are recorded in your project, but the finished game currently always offers an automatic save plus three manual slots, however you set them here. Do not design around a save point only rule or a different slot count.

> **Keys are lowercase.** Stat and element keys must be lowercase letters and digits and start with a letter. Spaces, capitals, and symbols are rejected. Labels are what the player sees, so they can be anything.

### The Interviewer and Locking

The **Interviewer** button opens a conversation that helps you sharpen one section at a time. It asks one probing question of at most forty words, and can offer three strongly contrasting options for you to react to. It checks new material against your Canon and Glossary. It needs a Claude API key; without one the Charter works perfectly well on its own.

When every section is complete, press **Lock Charter**. The Studio refuses and lists every item that needs attention if anything blocks it. A first lock sets the version to 1 and shows "Charter locked at version 1. The Codex is now open." If you leave the resolution empty, the lock fills in 256 by 224.

### Amending a locked Charter

A locked Charter is read only. To change it, press **Amend** and confirm. The Codex and Rules tabs close until you relock. When you press **Relock Charter**, you can add an **Amendment note** saying what changed and why. The version rises by one, and the Studio lists the downstream records that depend on what you changed so you can review them. If nothing changed, it simply relocks at the same version.

### The Codex tab

The Codex turns your locked ruleset into the list of record types you can build. It opens only after the Charter is locked. Press **Generate Codex** once. If you amend the Charter later, press **Regenerate**. You do not need to edit anything here, but it is worth reading once because it shows exactly what you will build:

* **Core types** (14): Character, Ability, Item, Equipment, Status, Formula, Enemy family, Enemy, Gambit set, Troop, Shop, Weather state, Limit break, and Expected Party State.
* **Progression module** (1): Materia, Job, or Class, depending on your ruleset.
* **Living World** (3, optional): Rumor, Side quest seed, and Boss strategy.
* **Charter records**: Chapters.
* **Forward slots by owing stage**: fields that a later stage will fill in, such as sprites that Art and Audio will make.
* **Prefix table**: the short code that begins every ID. See the Reference part.
* **Save schema**: how saved games are structured.

### The Rules tab

Rules is where you build the content of the game. The side menu groups it into the ruleset views and the record types. Every record has a required **Name**, and a permanent ID that never changes.

| Group | Views |
| --- | --- |
| Ruleset views | Stats, Elements, Relations, Taxonomy, Affinity |
| Mechanics | Formulas, Statuses, Weather states |
| Progression | Materia (or Jobs, or Classes) |
| Core content | Ability, Character, Enemy family, Enemy, Equipment, Item, Shop, Troop, Limit break, Gambit set |
| Pacing | Expected Party State, Economy |
| Living World (optional) | Boss strategy, Rumor, Side quest seed |

The ruleset views edit the same stats, elements, relations, and taxonomy you set in the Charter. **Affinity** is a computed table showing how each enemy type reacts to each element: its own element is resisted, and its opposite is its weakness.

Every record type has a list view with the same toolbar. **Search** filters the list. **New** asks for a name and opens an empty record to fill in. **Draft with Claude** and **Draft a Set** ask Claude to write one record or several for you to review and accept. The two Claude buttons need an API key. Without one, everything in Rules still works, but you type each record yourself.

> **Rules is the most hand work in the Studio.** Art, the world, and most of the story are built for you by buttons. Rules content (characters, abilities, enemies, items, and so on) is the part you author or draft yourself. A Claude key makes it much faster, but you can always do it by hand, and a complete game needs less than you might fear. See the benchmark below.

### Benchmark: how much a complete game contains

Saga Studio's own test games are the smallest content sets that have been checked from the first stage to the last, and both play from the title screen to an ending. Use them to size your first game, not as a requirement. Your game may need more, and it can certainly be bigger.

| Content | Short test game (2 chapters) | Full test game (6 chapters) |
| --- | --- | --- |
| Chapters and planned minutes | 2 chapters, 720 minutes | 6 chapters, 780 minutes |
| Characters (party) | 3 | 3 |
| Abilities | 6 | 6 |
| Items | 4 | 4 |
| Equipment | 3 | 3 |
| Materia | 2 | 2 |
| Statuses | 3 | 3 |
| Weather states | 3 | 3 |
| Enemy families | 6 | 6 |
| Enemies | 7 | 11 |
| Troops | 4 | 13 |
| Shops | 1 | 1 |
| Expected Party State rows | 2 (one per chapter) | 6 (one per chapter) |
| Limit breaks | 1 | 1 |
| Gambit sets | 1 | 1 |
| Side quest seeds | 0 | 2 |
| Ending concepts in the Charter | 2 | 1 |

Notice the pattern. Chapters, troops, and Expected Party State rows grow with the length of the game. Everything else (abilities, items, equipment) can stay small and grow later. Add one Expected Party State row for every chapter, and enough troops that each chapter has regular fights and a boss.

### A sensible order for building content

1. **Characters.** One for each member of your Charter party. With a Claude key, **Draft a Set** can create them from your party entries and keeps each name and past. Without a key, press **New** for each one and fill in the fields yourself.
2. **Items and Equipment.** A few consumables first, then weapons, armor, and accessories.
3. **Abilities.** Attacks, spells, heals, and skills, grouped by what they do.
4. **Progression** (Materia, Jobs, or Classes) so characters can grow.
5. **Enemy families, then Enemies.** Families set the type and affinity, enemies are the individual monsters.
6. **Troops.** Groups of enemies that appear together in a battle.
7. **Shops.** What each shop sells.
8. **Statuses and Weather states.**
9. **Expected Party State.** The target strength of the party at each chapter.
10. **Limit breaks, Gambit sets, and the Living World records** if you want them.

### Character

| Field | Required | Range | What to write |
| --- | --- | --- | --- |
| Name | Yes | None | The character name. |
| Weapon class | No | None | For example sword, staff, or claw. Equipment with the same class can be worn. |
| Stat leanings | No | 0 to 5 | Relative strengths. One is average, two is double. |
| Base stats | Yes | 0 to 99999 | Starting value of each stat. |
| Growth per level | No | 0 to 9999 | How much each stat rises per level. |
| Limit tree | No | List | Limit breaks in unlock order. |
| Relationship hooks | No | List | Each hook names another Character and a short Note about how they relate. |
| B storyline | No | None | The personal subplot that runs under the main story. The Story stage can build a side story from it. |
| Move | No | 1 to 12 | Optional: tiles per turn for a future tactics mode. |

### Ability

| Field | Required | Range | What to write |
| --- | --- | --- | --- |
| Name | Yes | None | The ability name. |
| Kind | Yes | Fixed list | Attack (physical), Magic, Heal, Status, Summon, Command, Limit, Enemy skill, or Passive. |
| Element | No | Your elements | Leave empty for non elemental. |
| Power | No | 0 to 9999 | How strong it is. |
| Cost: MP, AP, Item consumed | No | 0 to 9999 | What it costs to use. |
| Targeting: Side | Yes | foe, ally, self, any | Who it can be aimed at. |
| Targeting: Scope | Yes | single, all, row, random | How many it hits. |
| Charge ticks | No | 0 to 65536 | Wind up before the action lands. Zero is instant. |
| Formula | No | A formula | Leave empty to use the ruleset formula set for this kind. |
| Status effects | No | List | Each entry has a Status and a Chance from 0 to 1. |
| Range and Area | No | 0 to 20 and 0 to 10 | Optional, for a future tactics mode. |

### Item and Equipment

| Record | Field | Required | What to write |
| --- | --- | --- | --- |
| Item | Kind | Yes | Consumable, key, or material. |
| Item | Price | No | Cost in gil, 0 to 9,999,999. |
| Item | Effect | No | The ability that fires when the item is used. |
| Equipment | Slot | Yes | Weapon, armor, or accessory. |
| Equipment | Weapon class | No | Weapons only. Matches a character weapon class. |
| Equipment | Gear tier | No | 1 to 20. Compared with the Expected Party State gear tier. |
| Equipment | Price | No | Cost in gil. |
| Equipment | Stat bonuses | No | A table of stat changes, from minus 9999 to 9999. |
| Equipment | Slot layout | No | Slots (0 to 8) and Links, pairs of slot numbers counted from zero such as 0 and 1. |

### Status and Formula

| Record | Field | What to write |
| --- | --- | --- |
| Status | Gauge effect (required) | Normal, freeze, or empty. Freeze stops the gauge. Empty resets it each tick. |
| Status | Tick effect | Kind (none, damage, heal, mpDrain) and Percent of max (0 to 100) applied each tick. |
| Status | Duration in turns | 0 to 99. Zero lasts until cured. |
| Status | Cure | Ends with battle, Ends when hit, and Cured by (a list of items or abilities). |
| Formula | Template | A built in template. Leave empty to write an expression. |
| Formula | Expression | Used when no template is chosen. Variables: a.stat, a.level, t.stat, t.level, power, and p.name. |
| Formula | Parameters | A table of numbers, read in expressions as p.name. |

### Enemy family and Enemy

| Record | Field | Required | What to write |
| --- | --- | --- | --- |
| Enemy family | Type (your taxonomy label) | Yes | Which of your taxonomy values this family belongs to. |
| Enemy family | Palette: Base and Accent | No | The two colors the art stage will use for this family. |
| Enemy family | Absorbs its own type | No | Its own element heals it instead of being resisted. |
| Enemy family | Default affinity | Computed | Shown for each element. Edit enemies, not this. |
| Enemy family | Generate tiers | Button | Clones the family and its enemies into stronger tiers with scaled stats and a palette shift. |
| Enemy | Family | Yes | The family it belongs to. |
| Enemy | Tier and Level | No | Tier 1 to 9, level 1 to 99. |
| Enemy | Stats | Yes | A value for every stat, 0 to 999,999. |
| Enemy | Affinity overrides | No | Weak, normal, resist, immune, or absorb for any element, overriding the family. |
| Enemy | Gambits | No | A gambit set that controls how it fights. |
| Enemy | Drops and Steal | No | Each entry is an Item and a Chance from 0 to 1. |
| Enemy | Gil, EXP, AP | No | Rewards for winning. |
| Enemy | Boss | No | Marks the enemy as a boss. |

### Troop, Shop, and Weather state

| Record | Field | Required | What to write |
| --- | --- | --- | --- |
| Troop | Members | Yes, 1 to 8 | Each member is an Enemy and a Row (front or back). |
| Troop | Chapter | No | Which chapter this troop belongs to. A boss troop in each chapter lets the world place the boss. |
| Troop | No escape | No | Prevents fleeing from the battle. |
| Troop | Preemptive chance | No | 0 to 1. |
| Shop | Inventory | No | Each entry is an Item and an optional Price override. |
| Shop | Available from chapter | No | The chapter from which the shop stocks these things. |
| Weather state | Real world phenomenon | Yes (limit 80) | For example supercell thunderstorm or radiation fog. |
| Weather state | Element multipliers | No | A multiplier from 0 to 5 for each element. One is normal. |
| Weather state | Encounter modifiers | No | An Encounter rate (0 to 5, one is normal) and Family weights (0 to 10) that change which enemies appear. |

### Progression: Materia, Jobs, or Classes

Which of these you see depends on the **Progression** choice in your Ruleset.

| Record | Field | What to write |
| --- | --- | --- |
| Materia | Kind (required) | Magic, summon, command, support, or independent. Each kind grants certain kinds of ability. |
| Materia | Element | The element of the materia. |
| Materia | AP thresholds | AP needed to reach each level after the first. |
| Materia | Grants per level | Each entry has a Level (1 to 9) and an Ability. |
| Materia | Stat mods | Stat changes from minus 100 to 100. |
| Materia | Support effect | Support materia only: All, Element, Added effect, Counter, HP absorb, or MP absorb. It modifies its linked neighbor. |
| Materia | Price | Cost in gil. |
| Job | Abilities by level | Each entry has a Job level (1 to 99), an Ability, and Stat mods. |
| Class | Skill tree | Each entry has an Ability, a Level (1 to 99), and Stat mods. |

### Expected Party State and Economy

Expected Party State is how you tell the Studio how strong the party should be at the start of each chapter. The Simulator and the Arena both read it, so this is what makes difficulty testable.

| Field | Required | Range | What to write |
| --- | --- | --- | --- |
| Chapter | Yes | A chapter | The chapter this row describes. |
| Target level | No | 1 to 99 | The level the party should have. |
| Gear tier | No | 1 to 20 | The equipment tier the party should have. Compared with Equipment gear tier. |
| Materia, Job, or Class set | No | List | What the party has equipped. |
| Gil on hand | No | 0 to 9,999,999 | Money the party should carry. |
| Abilities | No | List | Abilities the party should know. |
| Target win rate | No | 0 to 100 | A percentage. The Simulator draws it as a target line. |

**Fill from curves** sets the target levels for you from the EXP curve, spreading the experience needed for the last chapter across the chapters by their target minutes. It asks before replacing any level you set by hand. The **Economy** view shows how money flows through the game.

### Limit break, Gambit set, and the Living World

| Record | Field | What to write |
| --- | --- | --- |
| Limit break | Limit level (required) | 1 to 4. |
| Limit break | Unlock | After uses (of the previous limit) and After kills. |
| Limit break | Action (required) | The ability the limit break performs. |
| Gambit set | Rules (required) | Checked top to bottom. The first rule whose condition holds acts. Conditions include own HP below a fraction, a target having a status, every N turns, fewer foes than N, and random chance. Targets include self, random foe, foe with lowest HP, all foes, and ally choices. |
| Gambit set | Counters | Triggers such as hit by a physical attack, hit by magic, an ally is KO, or falls below a quarter HP, each with an action. |
| Rumor | Rumor (required), Chapter, Truthful, About | What townsfolk say, and whether it is true. |
| Side quest seed | Quest seed (required), Chapter, Rewards, Involves | The idea of a side quest. The Story stage turns each seed into a quest. |
| Boss strategy | Boss and Strategy (required), Rules, Counters | A plan in words plus the rules the engine runs. Same shape as a gambit set. |

### The Arena tab

The Arena lets you fight a battle right now to see how your rules feel. It needs no other stage.

| Control | What it does |
| --- | --- |
| Troop | Choose which enemy group to fight, grouped by chapter. |
| Weather | Choose clear, rain, snow, or another weather state, to see its effect. |
| Level and gear | Use custom values or the expected state for any chapter. |
| Seed | A number that makes the fight repeatable. **Random seed** picks a new one. |
| Party and Rows | Pick who fights and which row each character stands in (Front or Back). |
| Run speed | Choose Wait or Active mode, and speed 1x, 2x, or 4x. |
| Start battle, New battle, Paste battle code | Start a fight, restart, or replay one from a shared code. |

### The Simulator tab

The Simulator runs many battles automatically and reports how often the party wins, so you can tune difficulty with numbers instead of guessing.

| Field | What it does |
| --- | --- |
| Chapter | All chapters, or one. |
| Battles per troop | How many fights to simulate for each troop. |
| Base seed | Makes the simulation repeatable. |
| Weather | The weather to simulate under. |
| Party | Use the Expected Party State, or a custom party. |
| Run simulation | Runs it and charts the win rate against the target win rate. |

> **How to read the Simulator.** If a boss troop wins far less often than your target win rate, the fight is too hard for the level you expect. Lower the boss stats or raise the expected level or gear tier, and run it again.

### Finishing Stage 1

Open the **Unresolved** drawer and make sure there are no broken references. Then press **Mark stage Final**. It succeeds when the Charter is locked and nothing is broken. That can be true very early, but later stages read from your Rules, so before you move on make sure you have your full party, a set of enemies, troops for each chapter, an Expected Party State row for each chapter, and a boss troop for each chapter. If you skip a boss troop, the Story stage will ask you to choose one later, but it is easier to settle it now.

<a id="stage-2"></a>

## Part 3: Stage 2, Art and Audio

This stage gives your game its look and sound. The good news for a first project is that one button builds all of it, and everything after that is optional polish.

### What this stage does

Everything in your Rules and Charter is still just text: names, numbers, colors, and descriptions. This stage turns that text into pictures and sound. Every sprite is a recipe of parts (shadow, back gear, body, legs, torso, head, hair, front gear) dressed in a color palette, and every sound is a small set of synthesizer numbers. Nothing is a file you have to draw or record. Everything plays and previews right in the browser, and none of it needs a Claude key.

> **The shortcut.** Open the **Start** tab and press **Quick Build**. It fills in every missing art record, keeps any record you have already edited, and links the eight reserved forward fields that earlier stages left open. You can ship a game having used nothing else in this stage. Treat the rest of this chapter as a menu of things you can change after you have looked at the result.

### The tabs

| Tab | What it holds | When you will visit |
| --- | --- | --- |
| Start | Quick Build, plus the coverage list that shows what exists and what is still owed. | First, and again to check coverage. |
| Palette | The master palette and every palette fitted to it. | When the colors feel wrong. |
| Sprites | Characters, villain and townspeople, monsters, portraits, and the part library. | When a character or monster does not look right. |
| Motion | Poses, animations, ability effects, element effects, and weather. | When battles or weather feel flat. |
| World Art | Terrain tilesets, interiors, stacking priority, tile animation, and battle backgrounds. | Before building the world, to confirm every biome has art. |
| Interface | Icons, window frame, pixel font, cursor, touch controls, and title screen. | To make the menus and title screen yours. |
| Sound | Instruments, sound effects, motifs, score by role, and a jukebox. | To choose or change the music. |
| Playtest | A test room where you can walk the tiles, with the touch controls if you like. | To check that tiles are walkable and look right. |
| Export | Writes the art bundle for the stage. | Last. |

### The Start tab and coverage

Coverage is a checklist of everything the game will need to draw or play, grouped as **Palettes**, **Sprites**, **Portraits**, **Icons**, **Motion**, **World art**, **Interface**, **Sound**, and **Forward fields**. The **Coverage** chip in the project bar shows the total, for example 173/173. When the numbers match, nothing is missing. The Studio keeps this list honest by counting what your Charter and Rules ask for, so adding a character in Stage 1 raises the number you need here, and Quick Build fills the gap.

### Palette

The master palette is the single set of colors that everything in the game is drawn from. It is built from your Charter element colors, every monster family's colors, and skin, hair, terrain, and metal anchors, then filled in with smooth ramps. That is why the whole game feels like one picture instead of a pile of mismatched pieces.

| Sub view | What you can do |
| --- | --- |
| Master | See all 64 colors. Pick a new color for any entry or type a hex value. Editing one color recolors everything that uses it. An **Anchors** list shows the colors the palette was built to honor and how close it came to each. |
| Colorways | Each character, the villain, and each townsperson type gets its own 16 slot mini palette: outline, skin, hair, two cloth colors, and metal. Party members are spread around the color wheel so they read as different people. |
| Tier palettes | One palette for each monster family. Stronger versions of a monster use shifted colors so they are easy to tell apart. |
| Element palettes | Four steps for each element (dark, base, light, hot) plus a flash and a tint. Each element also has a **Particle** choice (spark, flake, bubble, shard, ring, wisp, or bolt) and a **Screen** choice (none, wave, shake, or darken), so fire and ice stay distinct even in a small palette. |

Two buttons here deserve a warning. **Regenerate** refits every palette to the current colors and can change things you have tweaked. **Rebuild from bundle** is for rebuilding from imported data. Use them only when you mean to.

### Sprites

A sprite is the little picture of a character or monster. The Studio builds each from its stats, weapon class, and name, so a fast thief and a heavy knight do not end up looking the same. Only frames you hand edit are stored as actual pixels; everything else is regenerated from the recipe, which keeps your project small.

| Sub view | What it shows | What you can change |
| --- | --- | --- |
| Characters | Each party member with a field sprite (four directions, three walking frames) and a battle sprite. | Body build, outfit, hair, and weapon look. Duplicate or hand edit a frame. |
| Villain and NPCs | Your villain and the townsperson types the World stage will place. | Duplicate one to add a new type. Delete types your world does not need. |
| Bestiary | One battle sprite for each monster family. | The body type. Stronger tiers share the base look in their own colors. |
| Portraits | A face for each character, three tiles square. | Face parts and colorway. |
| Parts | The library of humanoid parts and monster bodies the generator uses. | Duplicate a part to vary it, or draw one by hand. The parts are genre neutral, so colorways and settings decide whether they read as medieval, steampunk, or science fiction. |

### Motion

| Sub view | What it covers |
| --- | --- |
| Poses | The poses every sprite can strike, grouped by use: Field, Emotes, Battle party, Battle enemy. Required poses can be relabeled but not removed, because coverage counts them. Pick a **Preview on** character or **Enemy** to see a pose on a real sprite, and tick **Pause previews** to freeze the motion. |
| Animations | Lists of poses with durations, offsets, and flashes, plus markers that tell the battle when a hit lands and the sound engine when to play. |
| Ability animations | How a spell or skill looks: the caster strikes a pose, the effect travels, and the element bursts on the target. The look comes from the ability's kind, targeting, and element. |
| Effects | The particle burst and screen movement for each element. |
| Weather | An overlay for each weather state in your Rules (rain streaks, snow, ash, fog, blowing leaves, lightning). Clear weather is an overlay of type none, which still counts as covered. A description with no known keyword gets a plain generic overlay for you to edit. |

### World Art

This is the terrain. Tiles are the square building blocks of every map, and the size comes from the Charter (16 pixels here), so previews always match the game.

| Sub view | What it covers |
| --- | --- |
| Tilesets | One tileset for each biome, each with climate keys (from frigid to hot, from arid to saturated, and water depth or shore) that the World stage reads when it decides where each biome goes. |
| Interiors | Floors, walls, doors, stairs, counters, and furnishings for towns and dungeons. Walls, rugs, and channels join automatically like terrain. Flags decide what the party can walk on, and an **above** flag draws a tile over the party, like a beam over a doorway. |
| Priority | Where two biomes meet, the higher one draws its rounded edge over the lower one. Moving a biome in this list renumbers the stacking order. |
| Tile animations | How water, lava, and similar tiles move. Each type has a **Technique** (cycle, scroll, or phase) and a **Frame (ms)** slider. |
| Backgrounds | The battle backdrop for each tileset, layered as sky, far, mid, near, and floor. Parallax and drift make clouds and waves move during a battle. |
| Invent a biome | Adds a new terrain type of your own, with its own tileset, if the built in ones do not suit your world. |

> **Do biomes now, not later.** The World stage will not open until the art has biome tilesets and interior tilesets. If you invent a biome here, remember that it also needs a place in the Charter's regions or the World stage will have no reason to use it.

### Interface

| Sub view | Fields and choices |
| --- | --- |
| Icons | One 16 by 16 icon for every item, equipment piece, ability, status, and materia, tinted by element or name. A **Draft icons** button is there for Claude generated icons and needs your API key. |
| Window and font | The frame every menu uses: **Top of the gradient**, **Bottom of the gradient**, **Outer line**, **Border** colors, **Corner** (Square, Round, Notch), **Border** thickness (Thin, Medium, Thick), **Opacity**, and **Opening** style (Grow, Fade, None) with **Opening ms**. Below it is a hand drawn 5 by 7 pixel font where you can pick a character and toggle its pixels. |
| Cursor | The pointer that marks the chosen menu entry. Choose **Fill**, **Highlight**, **Outline** colors, a **Shape** (Triangle, Hand, Diamond, Bar), and how much it bobs (**Bob pixels** and **Bob ms**). |
| Touch skin | The on screen controls a phone player sees: **Controls** and **Ink** colors, a **Scheme** (follow the Charter, D pad and buttons, virtual stick and buttons, tap to move, or a hybrid), **Shape** (Round or Square), **Opacity**, **Size**, labels for the **A**, **B**, and **Menu** buttons, and a **Move sound**. Press the controls in the preview to try them. |
| Title | The first screen a player sees: **Logo text**, **Prompt**, **Credit line**, **Logo style** (Outline, Shadow, Plain), **Layout** (Center, Upper, Lower), **Logo scale**, a **Background** from your battle backdrops, and logo and prompt colors. The logo text follows your Charter title unless you type your own. |

### Sound

Music is four voice chiptune, the sound of classic console RPGs: two pulse waves, a triangle wave, and noise for drums. Sound effects are generated from small parameter sets. All of it plays through the browser's Web Audio, so a browser without it can still edit and export the records but cannot play them.

| Sub view | What it covers |
| --- | --- |
| Instruments | Each instrument is a set of tables stepped 60 times a second: duty (pulse width), volume with an optional loop point, arpeggio, and pitch, plus vibrato and release. |
| Effects | Battle and menu cues, one spell sound for each element, and one for each ability. Choose **New sound from a preset** (Hit, Magic, UI, Ambient, Item, Special) and use **Mutate** to nudge a sound into a cousin of itself. |
| Motifs | Short melodic themes, shown with their key, length, and tempo, which follow characters from the field into battle. |
| Score by role | Every place the game plays music is a role. There are eight fixed ones (Title, Town, Dungeon, Battle, Boss, Victory, Defeat, Ending), one field role for each continent in your Charter, and one for each ending you write. Quick Build derives a track from a motif for each role. Use **Add a role** with a **Label** for anything extra. Battles call the battle (or boss), victory, and defeat roles on their own. |
| Jukebox | Every track and cue in one place, with a mixer: **Music volume**, **Effects volume**, and **Mute**. Four meters show what each voice is playing. |

### Playtest and Export

**Playtest** drops you into a test room built from your tiles. Walk around, bump into walls, and check that doorways, water, and cliffs behave. Turn the touch skin on to try it with your thumbs. **Export** writes the art bundle. Mark the stage Final from the status row when coverage is complete and the Unresolved drawer has no errors or broken references. Final is blocked by errors, broken references, and forward fields that were never filled.

<a id="stage-3"></a>

## Part 3: Stage 3, World

The World stage builds your maps from a seed number, places every town, dungeon, and gate, and proves that a player can walk the whole game from start to finish.

### What this stage does

You do not draw maps. You describe the shape of each continent, and the Studio grows a world from a **World seed**: a number that decides the layout. The same seed always makes the same world, and a different seed makes a different one. The Studio then places sites (towns, dungeons, and other landmarks), connects them with the gates that control progress, and checks that the whole thing can be completed in order.

> **Before it opens.** World needs a locked Charter with chapters, plus art that has biome tilesets and interior tilesets. If it will not open, run **Quick Build** in Art and Audio and make sure the Charter has chapters.

| Tab | What it holds |
| --- | --- |
| Start | The **World seed**, a **Reroll** button for a new one, and **Lay out again** to rebuild with the current settings. |
| World | The map itself and its controls. |
| Sites | Every place on the map and a preview of each. |
| Encounters | Where and how often battles happen. |
| Validation | The proof that the world can be finished. |
| Export | Writes the world bundle. |

### The World tab

Each continent has three sliders that shape it. **Radius** sets how large it is. **Ruggedness** sets how broken up the coast and terrain are. **Mountain share** sets how much of the land is mountains. Press **Generate again** to rebuild with the same seed after changing a slider, or **New seed** for a different world entirely.

Two overlays can be switched on over the map: **Sites** and **Gates**. A set of layers shows how the world was made: **Tiles**, **Biome**, **Elevation**, **Temperature**, **Moisture**, **Regions**, and **Zones**. If a region looks wrong, look at Temperature and Moisture first, because those two decide most biome placement.

### Sites

Sites are the places a player can enter: towns, dungeons, and special locations. The Studio places one set for each chapter in your Charter, with starting towns, dungeons, bosses, and the gates between chapters. You can preview any site and look at its map. Gates are what keep the story in order. The gate keys are **chapter**, **seal**, **ship**, and **airship**, and each one blocks the way until the Story stage says it is open.

### Encounters

This tab lists four groups: **Overworld zones**, **floors** (dungeon levels), **Bosses and guardians**, and **Side quest givers**. Each zone links to a list of troops from your Rules, and each shows a weight and a rate. Press **Edit** on a zone to change the **weights and rates**. A higher weight makes a troop appear more often in that zone, and a higher rate makes battles happen more often as you walk. If a boss slot is empty, pick a troop for it here or return to the Rules stage.

### Validation

This is the part that makes the stage worth having. Validation walks your game chapter by chapter, from the first town to the final gate, and checks several things.

| Check | What it proves |
| --- | --- |
| Progression | Each chapter can be reached and left in order, with no gate that opens too early or never. |
| References | Every site, troop, and record the world uses exists. |
| Map flags | Maps are walkable where they should be and blocked where they should be. |
| Encounter zones | Every zone has troops and rates that make sense. |
| Generation | The world was built without problems. |
| Records | The world records are well formed. |

A red result tells you what is wrong and where. Most problems are an empty boss slot, a chapter with no site, or a continent too small to fit everything. Fix them, press **Generate again**, and check again.

### Export and finishing

Choose **Draft** or **Final** in the radio buttons. **Include engine-world.js** adds the engine file the bundle needs to run on its own, and **Bake maps** stores finished maps inside the bundle. Final requires a clean validation. Press **Mark stage Final** when it is.

<a id="stage-4"></a>

## Part 3: Stage 4, Story

This stage writes the plot into the game: flags, quests, conversations, events, and endings. It is the stage where your planning pays off the most.

### What this stage does

The Story stage takes your Charter chapters and your finished world and builds the structure of the plot automatically: a flag for each gate, a quest for each chapter, dialogue for each quest, and events for each town, boss, and exit. You then read it, fix it, and add your own writing. Like the other stages, it does not need a Claude key, though the **Draft with Claude** buttons do.

> **Before it opens.** Story needs the World stage to be Final and valid. It also checks that your main story is long enough: the sum of every chapter's target minutes must reach the **12 hour floor** (720 minutes) for the main story alone. Side quests do not count toward the floor.

### The words you need

| Word | Meaning | Example from The Salt Lantern |
| --- | --- | --- |
| Flag | A named whole number the game remembers. Zero means no, one or more means yes or a count. | light_lit starts at 0 and becomes 1 when the lantern is lit. |
| Quest | A goal that moves through stages like a state machine. | Find the lamp oil, bring it to the keeper, light the lantern. |
| Dialogue | A conversation with nodes, lines, and choices. | The keeper explains what the lantern does. |
| Event | A thing that happens on the map when a trigger fires, made of pages, conditions, and commands. | Stepping on the harbor steps starts a cutscene. |
| Ending | One possible conclusion, chosen by priority and condition. | The lantern lit or left dark. |

| Tab | What it holds |
| --- | --- |
| Start | Playtime for side quests, the endings list, and a shortcut to the finale. |
| Flags | Every flag, with gate bindings. |
| Quests | Every quest and its stages. |
| Dialogue | Every conversation. |
| Events | Every map event. |
| Validation | The checks that decide whether the story is finishable. |
| Export | Writes the story bundle. |

### Start tab and endings

Set the **playtime in minutes** for side quests here. **Update endings** refreshes the list from your Charter, **Add ending** creates a new one, and **Open the finale** jumps to the final event. Every ending has the same fields.

| Field | What it means |
| --- | --- |
| Name | What the ending is called (limit 80 characters). |
| Priority | When several endings are possible, the one with the highest priority that passes wins. |
| Concept | A sentence about what happens and how it feels. |
| Credits music | Which music role plays during the credits. |
| Epilogue | The text that follows the final scene. |
| Earned when | The condition that unlocks this ending, built from the condition options listed under Events. |
| Make this the fallback | Marks the ending that plays when none of the others pass. Exactly one ending must be the fallback. |

### Flags

Flags are the game's memory. The Studio creates the gate flags for you and binds them to the gates in the world, which you can see under **Gate bindings**. You can **Add flag** for anything of your own, **Change flag** to edit one, **Search flags** to find one, and **Regenerate bindings** to rebuild the gate links if you changed the world. Flags are whole numbers only, so a yes or no is 0 or 1, and a counter simply counts.

### Quests

A quest is a list of stages. The player is always in exactly one stage of each started quest, and conditions move them forward. Use the filters **All**, **Main**, **Side**, **B story**, and **Yours** to find what you want. **Update quests** brings the list up to date, and **Add quest** creates one. Two checkboxes control what is built automatically: a side quest for each seed, and a B story for each character.

| Stage field or button | What it does |
| --- | --- |
| Stage label | The name the player sees in the journal. |
| Site | Where the stage takes place on the map. |
| Note | A reminder for yourself or the player. |
| Move on when | A condition. When it passes, the quest moves to the next stage. |
| Add a flag change | Sets or changes a flag when the stage is reached. |
| Save stage | Keeps your edits. |
| Earlier and Later | Moves the stage up or down the list. |
| Add stage after, Delete stage | Inserts or removes a stage. |
| Add branch group | Lets a stage go several ways based on a choice. |
| Add a failure rule | Defines when the quest is failed. |
| Reset to generated | Throws your changes away and goes back to what the Studio built. |

### Dialogue

A conversation is a graph of nodes. Each node has the **Lines** spoken, any **effects**, and **What comes next**. **Update dialogue** and **Add dialogue** manage the list, and **+ Node** and **Rename** edit one conversation. The **Dialogue speaker** field names who is talking, and **Draft with Claude** writes a first pass if you have a key. **Preview** shows how it reads, and **Run from the start** plays it through.

| Effect | What it does |
| --- | --- |
| Set a flag | Puts a value into a flag. |
| Add to a flag | Raises or lowers a flag by an **Amount**. |
| Give an item | Adds an item to the party. |
| Take an item | Removes an item. |
| Gil | Gives or takes money. |
| Quest stage | Moves a quest to a stage. |
| Party member | Adds or removes a character. |

**What comes next** has three choices: **Ends here**, **Goes to another node**, or **Offers choices**. A good conversation is rarely more than a few nodes. If you find yourself building a maze, split it into two conversations.

### Events

Events are the map's moments: a cutscene on entering town, an elder who speaks, a seal that breaks, a boss fight, an exit. The filters **Openers**, **Talk**, **Seals**, **Bosses**, **Exits**, **Finale**, and **Yours** sort them. Each event has **pages**, and the page on the right that passes its condition is the one that runs. Tick **Once** to make an event run a single time.

A condition can be **All**, **Any**, or **None** of a group of tests, or one of these: **A flag**, **An item**, **The chapter**, **A quest**, or **Always**. Comparisons are **at least**, **more than**, **exactly**, **not equal to**, **at most**, and **fewer than**. Quest tests are **is at stage**, **is complete**, **has failed**, **has reached stage**, and **has started**.

Each page is a list of commands. There are 21 kinds.

| Group | Commands |
| --- | --- |
| Talk and decide | Show text, Offer a choice, If a condition passes |
| Story state | Move a quest, Run another event, End the game, Set a flag, Add to a flag |
| Items and party | Give an item, Take an item, Give or take gil, Party member joins or leaves |
| Battle and movement | Start a battle, Move someone, Turn someone, Wait |
| Screen and sound | Fade the screen, Play music, Play a sound |
| Travel | Change map, Board or leave a vehicle |

The **Empty boss slots** list shows boss events that still have no troop. Choose one for each. The **Playtester** lets you run one event on its own by choosing the **Event to play**, the **Page**, the **Chapter to start in**, and a quest stage, with **Carry on** to continue after it ends. **Play** runs the event, and **Play the golden path** runs the main story from the beginning.

### Validation and Export

| Check | What it proves |
| --- | --- |
| Story smells | Warnings about things that look wrong but still work, such as a flag nobody reads. |
| References | Every flag, item, quest, and troop that the story mentions exists. |
| The walk | The golden path is followed from the start to the end. |
| The proofs | Every gate can be opened and every quest can be completed. |
| No softlock | There is no state where the player cannot continue. |
| The 12 hour floor | The main story targets at least 720 minutes. |

Choose **Draft** or **Final**. **Include engine-story.js** adds the engine, and **Final whole game kit** bundles everything the finished game needs. Mark the stage Final when every check passes.

<a id="stage-5"></a>

## Part 4: Stage 5, Test, Build, and Share

The last stage turns everything into a game that someone else can play, and gives you a way to test it first.

### Before it opens

The Game stage opens when the Story stage is Final. To build the game, every stage must be Final, none may be marked Stale, and the **Unresolved** drawer must be clear. If the story check has not been run, building runs it for you.

### Test Play

You do not have to wait until the end to play. **Test Play** is on the Story and Game stages and opens a picker that asks where to start.

| Start | What it does | Extra choices |
| --- | --- | --- |
| New game | Begins at the title screen like a real player. | None. |
| Start of a chapter | Jumps to the opening of any chapter, with the party and items it should have by then. | Chapter. |
| On a map | Drops you onto any map to test one place. | Map. |
| A battle | Starts a single fight, which is the best way to tune a boss. | Troop. |

Test saves are kept apart from real saves, so testing never overwrites a game you have been playing. When something feels wrong, play the same spot twice before changing a number. One unlucky fight is not a balance problem.

### Build the game

Press **Build game** and choose how you want to receive it.

| Choice | What you get | Best for |
| --- | --- | --- |
| One HTML file | A single file that holds the whole game. Open it in a browser and play. | Sending to a friend, or putting on a web page. |
| Folder as a .zip | The same game as a folder of files, zipped. | Hosting on a website where you want separate files. |

### What the finished game plays like

The game runs in any modern browser, on a computer or a phone.

| Control | Keyboard |
| --- | --- |
| Move | Arrow keys or W, A, S, D |
| A (confirm, talk) | Enter, Space, or Z |
| B (cancel, back) | Escape, X, or Backspace |
| Menu | M |

On a phone, the touch controls from the Interface tab appear on screen. The menu has **Status**, **Equip and Materia**, **Items**, **Journal**, **Airship**, **Save**, and **Settings**. The game saves automatically and also offers three save slots. Up to four party members fight at once.

### Sharing your game

1. Build the game as **One HTML file**.
2. Give it a clear name, such as the title of your saga.
3. To put it online for free, create a new repository on GitHub, upload the file (rename it index.html), open the repository settings, and turn on **Pages** from the main branch. In a minute or two your game has a web address anyone can open.
4. Play it once on a phone and once on a computer before you share the link.
5. Keep your project bundle. Use **Export** in the project bar to save it, because that file is what lets you change the game later.

<a id="reference"></a>

## Part 5: Reference

Quick lookups for when you are in the middle of work.

### What the record IDs mean

Every record has an ID made of a short prefix and a number. When the Studio reports a problem, the prefix tells you what kind of thing it is.

| Prefix | Kind of record | Stage |
| --- | --- | --- |
| chr | Character | Rules |
| abl | Ability | Rules |
| itm | Item | Rules |
| eqp | Equipment | Rules |
| sta | Status effect | Rules |
| frm | Formula | Rules |
| fam | Monster family | Rules |
| enm | Enemy | Rules |
| gmb | Gambit | Rules |
| trp | Troop | Rules |
| shp | Shop | Rules |
| wth | Weather state | Rules |
| lim | Limit | Rules |
| eps | Expected Party State row | Rules |
| mat, job, cls | Materia, job, class | Rules |
| rmr, sdq, bst | Living world records | Rules |
| chp | Chapter | Charter |
| spr, por, anm, sfx, ico, mus | Sprite, portrait, animation, sound effect, icon, music | Art and Audio |
| til, pal, bgd, uik, efx, wov, ins, prt | Tileset, palette, background, interface kit, effect, weather overlay, instrument, part | Art and Audio |
| map, reg, npc, twn, dgn | Map, region, townsperson, town, dungeon | World |
| flg, qst, dlg, evt, end | Flag, quest, dialogue, event, ending | Story |

### Glossary

| Term | Meaning |
| --- | --- |
| Bundle | A file that holds the work of one or more stages. Export writes one and Import reads one. |
| Charter | The founding document of your game: premise, world, party, systems, chapters, and rules of play. |
| Codex | A generated reference of your Charter that opens the Rules stage. |
| Final | A stage that is finished and checked. The next stage can open. |
| Stale | A stage that was Final but whose inputs changed afterwards. |
| Forward reference | A record that points at something a later stage owes. |
| Broken reference | A record that points at something that does not exist. |
| Gate | A point that blocks the way until the story allows it. |
| Golden path | The shortest route through the main story from start to finish. |
| Softlock | A state where the player cannot continue and cannot go back. |
| Tileset | The set of square pieces used to draw one kind of terrain. |
| Biome | A kind of terrain such as forest, desert, or snow. |
| Seed | A number that decides how a world is generated. |
| Troop | A group of enemies that appear in one battle. |
| Materia | A socketable item that grants abilities, in the style of classic console RPGs. |

### Troubleshooting

| Problem | Likely cause | Fix |
| --- | --- | --- |
| A stage is Locked | The stage before it is not Final. | Go back and press Mark stage Final. |
| Mark stage Final does nothing | There are errors or broken references. | Open the Unresolved drawer and use Jump on each item. |
| A stage turned Stale | You changed something it depends on. | Open it, review, and mark it Final again. |
| World will not open | No biome or interior tilesets in the art. | Run Quick Build in Art and Audio. |
| Story will not open | The world is not Final or does not validate. | Fix World Validation. |
| The 12 hour floor fails | Chapter target minutes add up to less than 720. | Raise chapter targets in the Charter, or add a chapter. |
| A boss has no troop | An Empty boss slot in Events or Encounters. | Pick a troop for it. |
| Claude buttons do nothing | No API key saved. | Open Settings, paste your key, and press Test Key. |
| A save failed with a storage banner | The browser is full. | Press Export now, then clear space. |
| Load the demo does nothing | The Studio ships no demo game. | Use Projects and Import instead. |

### Final checklist

1. The pitch fits in one sentence and I can say why a player would want it.
2. The Charter is locked with all 13 sections complete.
3. Rules has a full party, enemies, troops, a boss for every chapter, and an Expected Party State row for each chapter.
4. Art coverage is complete and I have heard the music.
5. The world validates and I have walked at least one chapter in Playtest.
6. The Story passes every check, including the 12 hour floor.
7. Every ending has a condition, and exactly one is the fallback.
8. No stage is Stale and the Unresolved drawer is clear.
9. I played from New game on a phone and on a computer.
10. I exported my project bundle and saved it somewhere safe.

