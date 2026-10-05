'use strict';
// Part 2: the Studio tour and Stage 1 (Charter and Rules).
module.exports = [
{
  id: 'studio-tour', title: 'Part 2: A Tour of the Studio',
  lead: 'Before the stages, a quick look at the screen itself: what each control does, how your work is saved, and how stages lock and unlock.',
  blocks: [
    { t: 'h3', x: 'The screen from top to bottom' },
    { t: 'ol', items: [
      '**Header.** The Saga Studio title with an App 150 badge, a link back to the AppADay portfolio, a sound button, a theme button that switches between the night and parchment looks, and the **Settings** gear.',
      '**Project bar.** Your project title (tap it to rename), a size chip showing how large the project is, a **Coverage** chip that appears once art exists (for example 173/173 means every required piece of art is present), and a validation chip showing OK, warnings, or errors. Then four buttons: **Save**, **Projects**, **Import**, and **Export**.',
      '**Stage bar.** Five numbered buttons, one for each stage, each with a status chip: **Locked**, **Open**, **Stale**, or **Final**. Tap a locked stage and the Studio tells you why it is locked.',
      '**Status row.** A sentence about the current stage on the left, then the **Mark stage Final** button, a **Test Play** button (on the Story and Game stages), and the **Unresolved** button with chips that show how many warnings are open.',
      '**Tabs.** The workspaces inside the current stage. Each stage has its own set of tabs.',
      '**Workspace.** Where you fill in forms and press buttons.',
      '**Footer.** The app name and the link to the portfolio.'
    ] },
    { t: 'h3', x: 'Starting and managing projects' },
    { t: 'p', x: 'The Studio opens with a blank project called **Untitled Saga**. Tap the title in the project bar to rename it. The **Projects** button opens your project list, where you can start a **New project** (it asks for a title and a **Create** button), open an existing one, duplicate it, or delete it. It also offers any drafts that the standalone forge apps left in this browser, added as new projects without touching the originals.' },
    { t: 'p', x: '**Import** reads a bundle file. If the file is a project you already have, it asks one question with three answers: **Replace**, **Keep both**, or **Cancel**. The Studio files an imported project at the furthest stage it has already completed.' },
    { t: 'callout', kind: 'warn', title: 'Ignore the demo buttons on the Start tabs', x: 'The Start tab of Art and Audio, World, and Story each show a **Load the demo** button and a **Load a Day N bundle** button. They are leftovers from the standalone forge apps. The Studio ships no demo game, so **Load the demo** does not load anything here. Use **Projects** and **Import** in the project bar instead.' },
    { t: 'h3', x: 'How your work is saved' },
    { t: 'ul', items: [
      'The Studio saves automatically to this browser as you work, using IndexedDB (or local storage if that is not available).',
      '**Save** (or Ctrl+S) saves a draft immediately.',
      'If the browser refuses to save because storage is full, a banner appears: "This browser refused to save the draft because storage is full. Export the bundle now so no work is lost." Press **Export now**.',
      'The size chip turns amber as the project grows past about 1.5 MB and red when you are close to the browser limit. Open it for details.',
      '**Export** writes a bundle file for the stage on screen. The bundle still opens in the four original forge apps, so it is both your backup and your way to move a project to another computer.'
    ] },
    { t: 'callout', kind: 'tip', title: 'A good backup rhythm', x: 'Export at the end of every session, and again whenever you mark a stage Final. Name the files with the date. Keep them somewhere that is not this browser.' },
    { t: 'h3', x: 'How stages lock and unlock' },
    { t: 'p', x: 'A stage unlocks when the stage before it has been marked **Final** and still holds. You never download anything to move forward. **Mark stage Final** runs that stage\'s own checks, stamps the result, and unlocks the next stage. Here is what a locked stage tells you:' },
    { t: 'table', head: ['Where you are stuck', 'What the Studio says', 'What to do'], rows: [
      ['Art and Audio is locked', 'Lock the Charter on the Charter stage first.', 'Finish the Charter and press Lock Charter, then mark Charter and Rules Final.'],
      ['Any stage is locked', 'Mark the [previous stage] stage Final first.', 'Go back one stage and press Mark stage Final.'],
      ['World will not open', 'The Charter has no chapters, or art has no biome tilesets or interior tilesets.', 'Add chapters in the Charter, and run Quick Build in Art and Audio.'],
      ['Story will not open', 'The world has no Final export, or the world does not validate cleanly.', 'Fix the World validation tab, then mark World Final.'],
      ['Game will not open', 'Mark the Story stage Final first.', 'Get every Story check to pass, then mark Story Final.']
    ] },
    { t: 'h3', x: 'Stale stages' },
    { t: 'p', x: 'A stage that was marked Final can become **Stale** when something upstream changes underneath it. The Studio shows a **Stale** chip and a sentence that says why. It happens when:' },
    { t: 'ul', items: [
      'You amend and relock the Charter after a later stage was marked Final.',
      'A stage before it is no longer Final.',
      'The world changed after the Story was built on it.'
    ] },
    { t: 'p', x: 'To clear a stale stage, review it and mark it Final again. One known gap, stated plainly: if you edit art after marking the World Final, the Studio does not flag the world as stale, though the World checks still catch any tile or sprite reference that actually breaks.' },
    { t: 'h3', x: 'Errors, broken references, and forward references' },
    { t: 'p', x: 'The validation chip and the **Unresolved** drawer use three words you will see all the time.' },
    { t: 'table', head: ['Word', 'Meaning', 'Does it block you?'], rows: [
      ['Error', 'A field is missing, out of range, or malformed.', 'Yes, until fixed.'],
      ['Broken', 'A record points at something that does not exist, such as an enemy that was deleted.', 'Yes. A Final export is blocked while a reference is broken.'],
      ['Forward', 'A record points at something a later stage owes you, such as a sprite that Art and Audio has not made yet.', 'No. It is owed, not broken, and is only checked once the owing stage opens.']
    ] },
    { t: 'p', x: 'The **Unresolved** drawer lists everything that still points nowhere, grouped by area, with forward references shown separately as owed. Every item has a **Jump** button that takes you to the exact record and field. The drawer stays open between visits until you close it.' },
    { t: 'h3', x: 'Settings' },
    { t: 'p', x: 'The gear in the header opens **Settings**.' },
    { t: 'table', head: ['Field', 'What it does'], rows: [
      ['Claude API key', 'Optional. Switches on the AI helpers. Stored only in this browser and shared with other AppADay apps on the same site. Use **Show or hide key** to check it, **Test Key** to verify it, and **Clear key** to remove it.'],
      ['Session name', 'A label for your own reference, kept with your settings. For example "Saga weekend build".'],
      ['Theme', 'Match system, Night, or Parchment.'],
      ['Model tiers (haiku, sonnet, opus, fable)', 'Which Claude model each helper uses. Leave blank to use the portfolio default. You normally never change these.'],
      ['Storage', 'How much browser storage the project is using.']
    ] }
  ]
},
{
  id: 'stage-1', title: 'Part 3, Stage 1: Charter and Rules',
  lead: 'The first stage is where you decide everything the rest of the game depends on. It has five tabs: Charter, Codex, Rules, Arena, and Simulator. You finish by locking the Charter and marking the stage Final.',
  blocks: [
    { t: 'h3', x: 'The order of work' },
    { t: 'ol', items: [
      'Fill in every section of the **Charter**.',
      'Press **Lock Charter**. This opens the Codex.',
      'On the **Codex** tab, press **Generate Codex**. This opens Rules.',
      'Build your content on the **Rules** tab: characters, enemies, abilities, items, equipment, troops, and shops.',
      'Test fights in the **Arena** and balance them in the **Simulator**.',
      'Press **Mark stage Final**.'
    ] },
    { t: 'h3', x: 'The Charter tab' },
    { t: 'p', x: 'The Charter has thirteen sections, listed down the side on a wide screen or behind a menu on a phone. Each section shows a status as you fill it in. The bar at the top shows whether the Charter is **Draft**, **Locked** with a version number, or **Amending**, and says how many items still need finishing before it can lock.' },
    { t: 'h3', x: 'Premise' },
    { t: 'table', head: ['Field', 'Required', 'Limit', 'What to write'], rows: [
      ['Saga title', 'Yes', '80', 'The name of your game.'],
      ['Premise', 'Yes', 'None', 'Two or three sentences: who, where, and what is at stake.'],
      ['Setting', 'Yes', 'None', 'The world, its regions, and its era.'],
      ['Tone', 'Yes', '160', 'For example hopeful, melancholy, or wry.'],
      ['Technology level', 'Yes', '160', 'For example medieval, steam age, or ruined machines.']
    ] },
    { t: 'h3', x: 'Magic' },
    { t: 'table', head: ['Field', 'Required', 'What to write'], rows: [
      ['Magic system', 'Yes', 'Where magic comes from, what it costs, and who can use it.'],
      ['Weather tie', 'No', 'How magic connects to weather, sky, or seasons. Rules can use this to ground weather states.']
    ] },
    { t: 'h3', x: 'Villain and Protagonist' },
    { t: 'table', head: ['Section', 'Field', 'Required', 'What to write'], rows: [
      ['Villain', 'Villain', 'Yes', 'Who they are and what they command.'],
      ['Villain', 'Motive', 'Yes', 'Why they do it. The best motives are almost sympathetic.'],
      ['Protagonist', 'Protagonist', 'Yes', 'Who they are, what they want, and what stands in the way.']
    ] },
    { t: 'h3', x: 'Starting Party' },
    { t: 'p', x: 'A list of the companions who begin the journey with the hero. Add one entry for each. The target is eight but you can add more or fewer, and the Studio only warns if you have fewer than eight. It also warns if two members share a name.' },
    { t: 'table', head: ['Field', 'Required', 'Limit', 'What to write'], rows: [
      ['Name', 'Yes', '60', 'The character name.'],
      ['Past', 'Yes', '300', 'One sentence about who they were before the story.']
    ] },
    { t: 'callout', kind: 'note', title: 'How many fight at once', x: 'Your Charter can list as many companions as you like, but the finished game puts at most four characters in the active party at a time. Plan your story so that the full cast rotates in and out rather than all fighting together.' },
    { t: 'h3', x: 'Chapters' },
    { t: 'p', x: 'Chapters are the spine of the saga. Add the first one to begin the outline. Each chapter gets a permanent ID that every later stage refers to, so a chapter keeps its identity even if you rename it. You need at least one chapter before the Charter will lock.' },
    { t: 'table', head: ['Field', 'Required', 'Range or limit', 'What to write'], rows: [
      ['Name', 'Yes', 'None', 'The chapter title. The Studio warns if two chapters share a name.'],
      ['Continent label', 'Yes', '60', 'Where this chapter takes place, for example "Northern Reach". Chapters that share a label share a continent on the map.'],
      ['Summary', 'Yes', 'None', 'What happens in the chapter.'],
      ['Target minutes', 'Yes', '1 to 600', 'How long an average player should take. Later stages use this to size continents and pace difficulty.']
    ] },
    { t: 'callout', kind: 'note', title: 'The minutes warning', x: 'If the chapter minutes add up to far more or far less than your **Target play hours** in Quotas (outside 70 to 130 percent), the Charter shows a warning. It does not block locking, but the Story stage later requires 720 minutes in total.' },
    { t: 'h3', x: 'Endings, Themes, Canon, and Glossary' },
    { t: 'table', head: ['Section', 'Field', 'Required', 'Limit', 'What to write'], rows: [
      ['Endings', 'Name', 'Yes', '80', 'A short name for the ending.'],
      ['Endings', 'Concept', 'Yes', 'None', 'How the story concludes.'],
      ['Themes', 'Theme (one per entry)', 'Yes, at least one', 'None', 'A short phrase such as "grief and memory" or "borrowed time". Empty entries produce a warning.'],
      ['Canon', 'Statement (one per rule)', 'No', '400', 'A fact about the world that must never be contradicted. Each rule gets a permanent ID.'],
      ['Glossary', 'Term', 'Yes, per entry', '80', 'The name of a person, place, faction, creature, item, or idea. Duplicates produce a warning.'],
      ['Glossary', 'Category', 'No', 'Fixed list', 'Person, place, faction, creature, item, magic, concept, or other.'],
      ['Glossary', 'Definition', 'Yes, per entry', '500', 'One or two sentences.']
    ] },
    { t: 'h3', x: 'Specs' },
    { t: 'table', head: ['Field', 'Required', 'Range', 'What to choose'], rows: [
      ['Tile size in pixels', 'Yes', '8 to 64', 'Square tiles. Sixteen is common for this style.'],
      ['Internal resolution, Width and Height', 'No', '64 to 1920 wide, 64 to 1080 tall', 'The size of the game canvas. Leave both empty to use 256 by 224. Set both or neither. The Studio warns if the resolution is not a whole number of tiles.'],
      ['Palette size', 'Yes', '2 to 256', 'How many colors the master palette holds.'],
      ['Mobile control scheme', 'Yes', 'Four choices', 'D pad and buttons, Virtual stick and buttons, Tap to move, or Hybrid: stick, tap, and buttons.']
    ] },
    { t: 'h3', x: 'Quotas' },
    { t: 'table', head: ['Field', 'Required', 'Range', 'What it means'], rows: [
      ['Towns', 'Yes', '0 to 99', 'How many towns the saga should contain.'],
      ['Dungeons', 'Yes', '0 to 99', 'How many dungeons.'],
      ['Enemy families', 'Yes', '0 to 200', 'How many kinds of enemy.'],
      ['Bosses', 'Yes', '0 to 200', 'How many bosses.'],
      ['Target play hours', 'Yes', '1 to 500', 'How long the whole game should take. Compared against your chapter minutes.']
    ] },
    { t: 'h3', x: 'Ruleset' },
    { t: 'p', x: 'This is where you choose the battle rules the whole project is built on. Start by choosing a **Saga**, **Classic**, or **Custom** card. A preset fills in everything below. You can then edit any of it while the Charter is unlocked.' },
    { t: 'table', head: ['Field', 'Required', 'What it controls'], rows: [
      ['Battle engine', 'Yes', 'turn.atb is Active Time Battle. turn.rounds is classic rounds. turn.ctb is a forecast queue.'],
      ['Scheduler', 'Yes', 'atb, rounds, or conditional. The engine and scheduler should match: turn.atb with atb, turn.rounds with rounds. A mismatch is a warning.'],
      ['Progression', 'Yes', 'Materia, jobs, or classes. The Codex generates the matching record type.'],
      ['Battle options: Wait mode', 'No', 'Pause the gauges while a menu is open.'],
      ['Battle options: Tick rate', 'No', '1 to 240. How often the battle updates.'],
      ['Save policy: Slots', 'Yes', '1 to 16 save slots.'],
      ['Save policy: Mode', 'Yes', 'savepoint (save only at save points) or anywhere.'],
      ['Save policy: Suspend save', 'No', 'Allow a temporary save that is deleted when loaded.'],
      ['Stats', 'Yes', 'A list. Each stat has a Key (lowercase letters and digits, up to 12), a Label (up to 30), a Min (0 to 99999), and a Max (1 to 99999). Max must be at least Min.'],
      ['Elements', 'No, but recommended', 'A list. Each has a Key (up to 16), a Label (up to 30), and a Color. With no elements, abilities have no element to choose.'],
      ['Element relations', 'No', 'Opposed pairs. Each side is the other side\'s weakness. An element cannot oppose itself, and a pair cannot appear twice.'],
      ['Taxonomy', 'No', 'A Label such as Type or Kind, the Values that classify enemy families, and Inverted values. Inverted values are healed by damage and hurt by healing.'],
      ['Formula set', 'No', 'A table that maps a role (phys, mag, heal, exp, ap, atb, var) to a built in formula template or a formula record. Unknown ids produce a warning.']
    ] },
    { t: 'callout', kind: 'note', title: 'About the save policy fields', x: 'The Save policy settings are recorded in your project, but the finished game currently always offers an automatic save plus three manual slots, however you set them here. Do not design around a save point only rule or a different slot count.' },
    { t: 'callout', kind: 'tip', title: 'Keys are lowercase', x: 'Stat and element keys must be lowercase letters and digits and start with a letter. Spaces, capitals, and symbols are rejected. Labels are what the player sees, so they can be anything.' },
    { t: 'h3', x: 'The Interviewer and Locking' },
    { t: 'p', x: 'The **Interviewer** button opens a conversation that helps you sharpen one section at a time. It asks one probing question of at most forty words, and can offer three strongly contrasting options for you to react to. It checks new material against your Canon and Glossary. It needs a Claude API key; without one the Charter works perfectly well on its own.' },
    { t: 'p', x: 'When every section is complete, press **Lock Charter**. The Studio refuses and lists every item that needs attention if anything blocks it. A first lock sets the version to 1 and shows "Charter locked at version 1. The Codex is now open." If you leave the resolution empty, the lock fills in 256 by 224.' },
    { t: 'h3', x: 'Amending a locked Charter' },
    { t: 'p', x: 'A locked Charter is read only. To change it, press **Amend** and confirm. The Codex and Rules tabs close until you relock. When you press **Relock Charter**, you can add an **Amendment note** saying what changed and why. The version rises by one, and the Studio lists the downstream records that depend on what you changed so you can review them. If nothing changed, it simply relocks at the same version.' },
    { t: 'h3', x: 'The Codex tab' },
    { t: 'p', x: 'The Codex turns your locked ruleset into the list of record types you can build. It opens only after the Charter is locked. Press **Generate Codex** once. If you amend the Charter later, press **Regenerate**. You do not need to edit anything here, but it is worth reading once because it shows exactly what you will build:' },
    { t: 'ul', items: [
      '**Core types** (14): Character, Ability, Item, Equipment, Status, Formula, Enemy family, Enemy, Gambit set, Troop, Shop, Weather state, Limit break, and Expected Party State.',
      '**Progression module** (1): Materia, Job, or Class, depending on your ruleset.',
      '**Living World** (3, optional): Rumor, Side quest seed, and Boss strategy.',
      '**Charter records**: Chapters.',
      '**Forward slots by owing stage**: fields that a later stage will fill in, such as sprites that Art and Audio will make.',
      '**Prefix table**: the short code that begins every ID. See the Reference part.',
      '**Save schema**: how saved games are structured.'
    ] },
    { t: 'h3', x: 'The Rules tab' },
    { t: 'p', x: 'Rules is where you build the content of the game. The side menu groups it into the ruleset views and the record types. Every record has a required **Name**, and a permanent ID that never changes.' },
    { t: 'table', head: ['Group', 'Views'], rows: [
      ['Ruleset views', 'Stats, Elements, Relations, Taxonomy, Affinity'],
      ['Mechanics', 'Formulas, Statuses, Weather states'],
      ['Progression', 'Materia (or Jobs, or Classes)'],
      ['Core content', 'Ability, Character, Enemy family, Enemy, Equipment, Item, Shop, Troop, Limit break, Gambit set'],
      ['Pacing', 'Expected Party State, Economy'],
      ['Living World (optional)', 'Boss strategy, Rumor, Side quest seed']
    ] },
    { t: 'p', x: 'The ruleset views edit the same stats, elements, relations, and taxonomy you set in the Charter. **Affinity** is a computed table showing how each enemy type reacts to each element: its own element is resisted, and its opposite is its weakness.' },
    { t: 'p', x: 'Every record type has a list view with the same toolbar. **Search** filters the list. **New** asks for a name and opens an empty record to fill in. **Draft with Claude** and **Draft a Set** ask Claude to write one record or several for you to review and accept. The two Claude buttons need an API key. Without one, everything in Rules still works, but you type each record yourself.' },
    { t: 'callout', kind: 'note', title: 'Rules is the most hand work in the Studio', x: 'Art, the world, and most of the story are built for you by buttons. Rules content (characters, abilities, enemies, items, and so on) is the part you author or draft yourself. A Claude key makes it much faster, but you can always do it by hand, and a complete game needs less than you might fear. See the benchmark below.' },
    { t: 'h3', x: 'Benchmark: how much a complete game contains' },
    { t: 'p', x: 'Saga Studio\'s own test games are the smallest content sets that have been checked from the first stage to the last, and both play from the title screen to an ending. Use them to size your first game, not as a requirement. Your game may need more, and it can certainly be bigger.' },
    { t: 'table', head: ['Content', 'Short test game (2 chapters)', 'Full test game (6 chapters)'], rows: [
      ['Chapters and planned minutes', '2 chapters, 720 minutes', '6 chapters, 780 minutes'],
      ['Characters (party)', '3', '3'],
      ['Abilities', '6', '6'],
      ['Items', '4', '4'],
      ['Equipment', '3', '3'],
      ['Materia', '2', '2'],
      ['Statuses', '3', '3'],
      ['Weather states', '3', '3'],
      ['Enemy families', '6', '6'],
      ['Enemies', '7', '11'],
      ['Troops', '4', '13'],
      ['Shops', '1', '1'],
      ['Expected Party State rows', '2 (one per chapter)', '6 (one per chapter)'],
      ['Limit breaks', '1', '1'],
      ['Gambit sets', '1', '1'],
      ['Side quest seeds', '0', '2'],
      ['Ending concepts in the Charter', '2', '1']
    ] },
    { t: 'p', x: 'Notice the pattern. Chapters, troops, and Expected Party State rows grow with the length of the game. Everything else (abilities, items, equipment) can stay small and grow later. Add one Expected Party State row for every chapter, and enough troops that each chapter has regular fights and a boss.' },
    { t: 'h3', x: 'A sensible order for building content' },
    { t: 'ol', items: [
      '**Characters.** One for each member of your Charter party. With a Claude key, **Draft a Set** can create them from your party entries and keeps each name and past. Without a key, press **New** for each one and fill in the fields yourself.',
      '**Items and Equipment.** A few consumables first, then weapons, armor, and accessories.',
      '**Abilities.** Attacks, spells, heals, and skills, grouped by what they do.',
      '**Progression** (Materia, Jobs, or Classes) so characters can grow.',
      '**Enemy families, then Enemies.** Families set the type and affinity, enemies are the individual monsters.',
      '**Troops.** Groups of enemies that appear together in a battle.',
      '**Shops.** What each shop sells.',
      '**Statuses and Weather states.**',
      '**Expected Party State.** The target strength of the party at each chapter.',
      '**Limit breaks, Gambit sets, and the Living World records** if you want them.'
    ] },
    { t: 'h3', x: 'Character' },
    { t: 'table', head: ['Field', 'Required', 'Range', 'What to write'], rows: [
      ['Name', 'Yes', 'None', 'The character name.'],
      ['Weapon class', 'No', 'None', 'For example sword, staff, or claw. Equipment with the same class can be worn.'],
      ['Stat leanings', 'No', '0 to 5', 'Relative strengths. One is average, two is double.'],
      ['Base stats', 'Yes', '0 to 99999', 'Starting value of each stat.'],
      ['Growth per level', 'No', '0 to 9999', 'How much each stat rises per level.'],
      ['Limit tree', 'No', 'List', 'Limit breaks in unlock order.'],
      ['Relationship hooks', 'No', 'List', 'Each hook names another Character and a short Note about how they relate.'],
      ['B storyline', 'No', 'None', 'The personal subplot that runs under the main story. The Story stage can build a side story from it.'],
      ['Move', 'No', '1 to 12', 'Optional: tiles per turn for a future tactics mode.']
    ] },
    { t: 'h3', x: 'Ability' },
    { t: 'table', head: ['Field', 'Required', 'Range', 'What to write'], rows: [
      ['Name', 'Yes', 'None', 'The ability name.'],
      ['Kind', 'Yes', 'Fixed list', 'Attack (physical), Magic, Heal, Status, Summon, Command, Limit, Enemy skill, or Passive.'],
      ['Element', 'No', 'Your elements', 'Leave empty for non elemental.'],
      ['Power', 'No', '0 to 9999', 'How strong it is.'],
      ['Cost: MP, AP, Item consumed', 'No', '0 to 9999', 'What it costs to use.'],
      ['Targeting: Side', 'Yes', 'foe, ally, self, any', 'Who it can be aimed at.'],
      ['Targeting: Scope', 'Yes', 'single, all, row, random', 'How many it hits.'],
      ['Charge ticks', 'No', '0 to 65536', 'Wind up before the action lands. Zero is instant.'],
      ['Formula', 'No', 'A formula', 'Leave empty to use the ruleset formula set for this kind.'],
      ['Status effects', 'No', 'List', 'Each entry has a Status and a Chance from 0 to 1.'],
      ['Range and Area', 'No', '0 to 20 and 0 to 10', 'Optional, for a future tactics mode.']
    ] },
    { t: 'h3', x: 'Item and Equipment' },
    { t: 'table', head: ['Record', 'Field', 'Required', 'What to write'], rows: [
      ['Item', 'Kind', 'Yes', 'Consumable, key, or material.'],
      ['Item', 'Price', 'No', 'Cost in gil, 0 to 9,999,999.'],
      ['Item', 'Effect', 'No', 'The ability that fires when the item is used.'],
      ['Equipment', 'Slot', 'Yes', 'Weapon, armor, or accessory.'],
      ['Equipment', 'Weapon class', 'No', 'Weapons only. Matches a character weapon class.'],
      ['Equipment', 'Gear tier', 'No', '1 to 20. Compared with the Expected Party State gear tier.'],
      ['Equipment', 'Price', 'No', 'Cost in gil.'],
      ['Equipment', 'Stat bonuses', 'No', 'A table of stat changes, from minus 9999 to 9999.'],
      ['Equipment', 'Slot layout', 'No', 'Slots (0 to 8) and Links, pairs of slot numbers counted from zero such as 0 and 1.']
    ] },
    { t: 'h3', x: 'Status and Formula' },
    { t: 'table', head: ['Record', 'Field', 'What to write'], rows: [
      ['Status', 'Gauge effect (required)', 'Normal, freeze, or empty. Freeze stops the gauge. Empty resets it each tick.'],
      ['Status', 'Tick effect', 'Kind (none, damage, heal, mpDrain) and Percent of max (0 to 100) applied each tick.'],
      ['Status', 'Duration in turns', '0 to 99. Zero lasts until cured.'],
      ['Status', 'Cure', 'Ends with battle, Ends when hit, and Cured by (a list of items or abilities).'],
      ['Formula', 'Template', 'A built in template. Leave empty to write an expression.'],
      ['Formula', 'Expression', 'Used when no template is chosen. Variables: a.stat, a.level, t.stat, t.level, power, and p.name.'],
      ['Formula', 'Parameters', 'A table of numbers, read in expressions as p.name.']
    ] },
    { t: 'h3', x: 'Enemy family and Enemy' },
    { t: 'table', head: ['Record', 'Field', 'Required', 'What to write'], rows: [
      ['Enemy family', 'Type (your taxonomy label)', 'Yes', 'Which of your taxonomy values this family belongs to.'],
      ['Enemy family', 'Palette: Base and Accent', 'No', 'The two colors the art stage will use for this family.'],
      ['Enemy family', 'Absorbs its own type', 'No', 'Its own element heals it instead of being resisted.'],
      ['Enemy family', 'Default affinity', 'Computed', 'Shown for each element. Edit enemies, not this.'],
      ['Enemy family', 'Generate tiers', 'Button', 'Clones the family and its enemies into stronger tiers with scaled stats and a palette shift.'],
      ['Enemy', 'Family', 'Yes', 'The family it belongs to.'],
      ['Enemy', 'Tier and Level', 'No', 'Tier 1 to 9, level 1 to 99.'],
      ['Enemy', 'Stats', 'Yes', 'A value for every stat, 0 to 999,999.'],
      ['Enemy', 'Affinity overrides', 'No', 'Weak, normal, resist, immune, or absorb for any element, overriding the family.'],
      ['Enemy', 'Gambits', 'No', 'A gambit set that controls how it fights.'],
      ['Enemy', 'Drops and Steal', 'No', 'Each entry is an Item and a Chance from 0 to 1.'],
      ['Enemy', 'Gil, EXP, AP', 'No', 'Rewards for winning.'],
      ['Enemy', 'Boss', 'No', 'Marks the enemy as a boss.']
    ] },
    { t: 'h3', x: 'Troop, Shop, and Weather state' },
    { t: 'table', head: ['Record', 'Field', 'Required', 'What to write'], rows: [
      ['Troop', 'Members', 'Yes, 1 to 8', 'Each member is an Enemy and a Row (front or back).'],
      ['Troop', 'Chapter', 'No', 'Which chapter this troop belongs to. A boss troop in each chapter lets the world place the boss.'],
      ['Troop', 'No escape', 'No', 'Prevents fleeing from the battle.'],
      ['Troop', 'Preemptive chance', 'No', '0 to 1.'],
      ['Shop', 'Inventory', 'No', 'Each entry is an Item and an optional Price override.'],
      ['Shop', 'Available from chapter', 'No', 'The chapter from which the shop stocks these things.'],
      ['Weather state', 'Real world phenomenon', 'Yes (limit 80)', 'For example supercell thunderstorm or radiation fog.'],
      ['Weather state', 'Element multipliers', 'No', 'A multiplier from 0 to 5 for each element. One is normal.'],
      ['Weather state', 'Encounter modifiers', 'No', 'An Encounter rate (0 to 5, one is normal) and Family weights (0 to 10) that change which enemies appear.']
    ] },
    { t: 'h3', x: 'Progression: Materia, Jobs, or Classes' },
    { t: 'p', x: 'Which of these you see depends on the **Progression** choice in your Ruleset.' },
    { t: 'table', head: ['Record', 'Field', 'What to write'], rows: [
      ['Materia', 'Kind (required)', 'Magic, summon, command, support, or independent. Each kind grants certain kinds of ability.'],
      ['Materia', 'Element', 'The element of the materia.'],
      ['Materia', 'AP thresholds', 'AP needed to reach each level after the first.'],
      ['Materia', 'Grants per level', 'Each entry has a Level (1 to 9) and an Ability.'],
      ['Materia', 'Stat mods', 'Stat changes from minus 100 to 100.'],
      ['Materia', 'Support effect', 'Support materia only: All, Element, Added effect, Counter, HP absorb, or MP absorb. It modifies its linked neighbor.'],
      ['Materia', 'Price', 'Cost in gil.'],
      ['Job', 'Abilities by level', 'Each entry has a Job level (1 to 99), an Ability, and Stat mods.'],
      ['Class', 'Skill tree', 'Each entry has an Ability, a Level (1 to 99), and Stat mods.']
    ] },
    { t: 'h3', x: 'Expected Party State and Economy' },
    { t: 'p', x: 'Expected Party State is how you tell the Studio how strong the party should be at the start of each chapter. The Simulator and the Arena both read it, so this is what makes difficulty testable.' },
    { t: 'table', head: ['Field', 'Required', 'Range', 'What to write'], rows: [
      ['Chapter', 'Yes', 'A chapter', 'The chapter this row describes.'],
      ['Target level', 'No', '1 to 99', 'The level the party should have.'],
      ['Gear tier', 'No', '1 to 20', 'The equipment tier the party should have. Compared with Equipment gear tier.'],
      ['Materia, Job, or Class set', 'No', 'List', 'What the party has equipped.'],
      ['Gil on hand', 'No', '0 to 9,999,999', 'Money the party should carry.'],
      ['Abilities', 'No', 'List', 'Abilities the party should know.'],
      ['Target win rate', 'No', '0 to 100', 'A percentage. The Simulator draws it as a target line.']
    ] },
    { t: 'p', x: '**Fill from curves** sets the target levels for you from the EXP curve, spreading the experience needed for the last chapter across the chapters by their target minutes. It asks before replacing any level you set by hand. The **Economy** view shows how money flows through the game.' },
    { t: 'h3', x: 'Limit break, Gambit set, and the Living World' },
    { t: 'table', head: ['Record', 'Field', 'What to write'], rows: [
      ['Limit break', 'Limit level (required)', '1 to 4.'],
      ['Limit break', 'Unlock', 'After uses (of the previous limit) and After kills.'],
      ['Limit break', 'Action (required)', 'The ability the limit break performs.'],
      ['Gambit set', 'Rules (required)', 'Checked top to bottom. The first rule whose condition holds acts. Conditions include own HP below a fraction, a target having a status, every N turns, fewer foes than N, and random chance. Targets include self, random foe, foe with lowest HP, all foes, and ally choices.'],
      ['Gambit set', 'Counters', 'Triggers such as hit by a physical attack, hit by magic, an ally is KO, or falls below a quarter HP, each with an action.'],
      ['Rumor', 'Rumor (required), Chapter, Truthful, About', 'What townsfolk say, and whether it is true.'],
      ['Side quest seed', 'Quest seed (required), Chapter, Rewards, Involves', 'The idea of a side quest. The Story stage turns each seed into a quest.'],
      ['Boss strategy', 'Boss and Strategy (required), Rules, Counters', 'A plan in words plus the rules the engine runs. Same shape as a gambit set.']
    ] },
    { t: 'h3', x: 'The Arena tab' },
    { t: 'p', x: 'The Arena lets you fight a battle right now to see how your rules feel. It needs no other stage.' },
    { t: 'table', head: ['Control', 'What it does'], rows: [
      ['Troop', 'Choose which enemy group to fight, grouped by chapter.'],
      ['Weather', 'Choose clear, rain, snow, or another weather state, to see its effect.'],
      ['Level and gear', 'Use custom values or the expected state for any chapter.'],
      ['Seed', 'A number that makes the fight repeatable. **Random seed** picks a new one.'],
      ['Party and Rows', 'Pick who fights and which row each character stands in (Front or Back).'],
      ['Run speed', 'Choose Wait or Active mode, and speed 1x, 2x, or 4x.'],
      ['Start battle, New battle, Paste battle code', 'Start a fight, restart, or replay one from a shared code.']
    ] },
    { t: 'h3', x: 'The Simulator tab' },
    { t: 'p', x: 'The Simulator runs many battles automatically and reports how often the party wins, so you can tune difficulty with numbers instead of guessing.' },
    { t: 'table', head: ['Field', 'What it does'], rows: [
      ['Chapter', 'All chapters, or one.'],
      ['Battles per troop', 'How many fights to simulate for each troop.'],
      ['Base seed', 'Makes the simulation repeatable.'],
      ['Weather', 'The weather to simulate under.'],
      ['Party', 'Use the Expected Party State, or a custom party.'],
      ['Run simulation', 'Runs it and charts the win rate against the target win rate.']
    ] },
    { t: 'callout', kind: 'tip', title: 'How to read the Simulator', x: 'If a boss troop wins far less often than your target win rate, the fight is too hard for the level you expect. Lower the boss stats or raise the expected level or gear tier, and run it again.' },
    { t: 'h3', x: 'Finishing Stage 1' },
    { t: 'p', x: 'Open the **Unresolved** drawer and make sure there are no broken references. Then press **Mark stage Final**. It succeeds when the Charter is locked and nothing is broken. That can be true very early, but later stages read from your Rules, so before you move on make sure you have your full party, a set of enemies, troops for each chapter, an Expected Party State row for each chapter, and a boss troop for each chapter. If you skip a boss troop, the Story stage will ask you to choose one later, but it is easier to settle it now.' }
  ]
}
];
