'use strict';
// Part 1: welcome and the planning section. Block types: p, h3, ul, ol, table, callout, steps, sheet, example.
// Inline: **bold**, `code`. Plain ASCII only. No dashes used as punctuation.
module.exports = [
{
  id: 'start-here', title: 'Start Here',
  lead: 'Saga Studio turns an idea into a classic role playing game that plays on its own. This guide takes you from a blank page to a finished game, one decision at a time.',
  blocks: [
    { t: 'h3', x: 'What you are making' },
    { t: 'p', x: 'The kind of game Saga Studio makes is the classic turn based role playing game: a hero and a party of companions, a world map you walk across, towns with shops and people to talk to, dungeons with treasure, random battles, bosses at the end of each chapter, and a story that builds to an ending. You fill in forms, press buttons that build large pieces for you, test as you go, and at the end press **Build game** to get one file that anyone can open in a web browser.' },
    { t: 'p', x: 'You do not need to write code. You do need to make decisions: who the hero is, what the world feels like, how the story ends. The Studio keeps track of the details, checks your work, and tells you plainly when something does not fit together yet. This guide is mostly about those decisions, because that is where first time creators get stuck.' },
    { t: 'h3', x: 'What you need' },
    { t: 'ul', items: [
      'A modern web browser. A laptop or desktop is much easier for long sessions. A phone works for reading, testing, and light edits.',
      'No account, no install, and no payment. Your projects are saved inside your browser.',
      'Optional: a Claude API key. It switches on a few helpers (the Charter Interviewer, drafting dialogue lines, and an art helper). Everything required to finish a game works without one.',
      'Paper or a notes app. Part 1 asks you to think before you type, and a Design Sheet is included for that.'
    ] },
    { t: 'h3', x: 'How long it takes' },
    { t: 'p', x: 'Plan on several sessions, not one. As a rough planning figure (an estimate, not a measurement): one or two hours of planning on paper, one or two hours for the Charter, a few hours for Rules, under an hour for Art and Audio if you let **Quick Build** do the heavy lifting, under an hour for the World, a few hours for the Story, and an hour of testing and building. A weekend or a handful of evenings is realistic for a first game.' },
    { t: 'callout', kind: 'tip', title: 'The one habit that matters most', x: 'Export your project regularly. Your work lives in your browser, and browsers can lose it if storage is cleared or full. The **Export** button in the project bar writes a bundle file you can keep anywhere. Do it at the end of every session.' },
    { t: 'h3', x: 'How this guide is organized' },
    { t: 'ol', items: [
      '**Part 1, Before You Touch the Keyboard.** A step by step way to think a game through on paper, ending with a Design Sheet you can fill in.',
      '**Part 2, A Tour of the Studio.** What every part of the screen does, how projects are saved, and how stages lock and unlock.',
      '**Part 3, Stage by Stage.** Every tab, form, and field in the five stages, in the order you meet them.',
      '**Part 4, Test, Build, and Share.** Playing your game, building the finished file, and putting it on the web.',
      '**Part 5, Reference.** ID prefixes, a glossary, troubleshooting, and a final checklist.'
    ] },
    { t: 'h3', x: 'Conventions used here' },
    { t: 'ul', items: [
      'Words in **bold** are labels exactly as they appear on screen, such as a button or a field name.',
      '**Required** means the Studio will not let you move on until the field is filled in.',
      '**Limit** is the maximum number of characters a field accepts.',
      'A running example appears in shaded boxes. It is an invented game called **The Salt Lantern** and it is only there to show what good answers look like. Use your own ideas.',
      'Words in `code style` are IDs and file names. You rarely type them, but you will see them.'
    ] },
    { t: 'h3', x: 'The five stages at a glance' },
    { t: 'p', x: 'Saga Studio is a pipeline of five stages that run in a fixed order. Each stage builds on the one before it, and a stage stays locked until the stage before it is marked **Final**.' },
    { t: 'table', head: ['Stage', 'You decide', 'The Studio builds for you', 'Opens when'], rows: [
      ['1. Charter and Rules', 'Premise, setting, hero, party, villain, chapters, endings, battle style, characters, enemies, abilities, items, equipment, shops', 'The Codex of record types, battle simulations, difficulty targets', 'Always open'],
      ['2. Art and Audio', 'Colors, character looks, interface style, music and sound choices', 'Sprites, portraits, tilesets, animations, icons, music, sound effects (Quick Build)', 'Charter and Rules is Final'],
      ['3. World', 'The seed, how big each continent is, where encounters happen', 'The world map, every town, dungeon, and cave interior, encounter zones', 'Art and Audio is Final'],
      ['4. Story', 'Quests, dialogue, events, endings, gates', 'A starting set of quests, dialogue, and events for every chapter, then checks that the whole story can be finished', 'World is Final'],
      ['5. Game', 'Where to start a test, how to package', 'Test Play, and the finished game as one file or a folder', 'Story is Final']
    ] }
  ]
},
{
  id: 'before-keyboard', title: 'Part 1: Before You Touch the Keyboard',
  lead: 'An hour of thinking on paper saves many hours of rebuilding. The Studio will happily let you start typing, but every later stage builds on what you decide in the Charter. This part walks you through those decisions in the order that makes them easiest.',
  blocks: [
    { t: 'callout', kind: 'note', title: 'Why planning matters here', x: 'You can change the Charter after you lock it, using **Amend**. But a changed Charter marks every later stage **Stale**, and you will need to review and rebuild what depended on the change. Small edits cost little. Changing the premise, the number of chapters, or the battle style in the middle of the project costs a great deal.' },
    { t: 'steps', items: [
      { title: 'Write the one sentence pitch', x: 'Complete this sentence: "A game about **[hero]** who must **[goal]** before **[consequence]**, in a world where **[what makes it special]**, feeling **[tone]**." If you cannot say it in one breath, the idea is not ready yet. Everything else in this guide grows out of that sentence, and it becomes the seed of your Premise.' },
      { title: 'Choose your scale honestly', x: 'Decide how big the game is before you decide what is in it. The Charter asks for the number of towns, dungeons, enemy families, bosses, and target play hours. The Studio also expects the main story to be planned at **twelve hours or more**: the Story checks add up each chapter\'s target minutes and require at least 720. Plan for that from day one. Six chapters of about two hours each reaches it. Trying to stretch a three chapter plan at the end is how people get stuck.' },
      { title: 'Pick a battle style', x: 'Choose one of the two presets, or build a custom one. Presets are far easier for a first game. See the comparison below. This choice shapes the Rules stage, so make it early.' },
      { title: 'Design the hero and the party', x: 'Write one paragraph for the hero and a short entry for each companion: name, a sentence of past, what they want, how they fight, and how they look. Fewer, vivid characters beat many thin ones. The Studio suggests eight starting party members but only warns if you have fewer.' },
      { title: 'Give the villain a reason', x: 'A villain needs a name, a command (what they control), and a motive. The best motives are almost sympathetic, and the Studio says so right in the field help. Decide who the boss is at the end of each chapter, because every chapter ends with one.' },
      { title: 'Outline the chapters', x: 'Chapters are the spine of the whole project. For each one write a name, a continent label, a two or three sentence summary, and a target in minutes. Chapters that share a continent label share a continent on the map. Decide what changes at the end of each chapter: a new place opens, a companion joins, a vehicle appears, the stakes rise.' },
      { title: 'Plan the endings', x: 'Decide at least one ending, and ideally two or three. Write each as a name and a concept. Later you will tie them to choices the player makes, so think now about which decisions matter. Keep it small for a first game.' },
      { title: 'Decide how magic and weather work', x: 'Write down where magic comes from, what it costs, and who can use it. Then decide how it ties to weather and the sky. Weather is a signature feature of the Studio: each weather state changes battles and how often enemies appear, and each one is named after a real world phenomenon such as fog or a thunderstorm.' },
      { title: 'Name your themes, canon, and vocabulary', x: 'Themes are short phrases the story keeps returning to. Canon is a list of facts that must never be contradicted. The glossary is every invented name with a one line definition. Writing these down now keeps your own story consistent six hours from now.' },
      { title: 'Choose the look and the sound', x: 'Decide the mood in a few words and the colors that go with it. Choose a tile size (sixteen pixels is the common default), a screen resolution (256 by 224 is the default), and a control scheme for phones. Pick a musical theme for the hero and another for the villain, because the Studio builds all the music from motifs.' },
      { title: 'Sketch the world on paper', x: 'Draw each continent as a blob. In each one mark where the first town is, where the key dungeon and the boss dungeon are, and where the sea is. You are not designing the geography, because the Studio generates it from a seed. You are deciding the journey: the order a player visits places and what blocks the way until they are ready.' },
      { title: 'Plan the extras', x: 'Side quests and each character\'s personal story are optional but make a world feel alive. Jot down two or three side quest ideas with a giver and a reward, and a personal arc for any companion who has one.' },
      { title: 'Define done', x: 'Write down what "finished" means before you start: playable from the title screen to an ending, every Studio check passing, and a built file that opens on a phone. When you are tempted to add one more thing, check it against that sentence.' }
    ] },
    { t: 'h3', x: 'Choosing a battle style' },
    { t: 'p', x: 'The **Ruleset** section of the Charter offers three starting points. Pick a preset unless you have a very specific reason not to.' },
    { t: 'table', head: ['', 'Saga Preset', 'Classic Preset', 'Custom'], rows: [
      ['Battle engine', 'Active Time Battle: each fighter has a gauge that fills with speed, and acts when it is full', 'Round based turns: everyone chooses, then everyone acts in order', 'You choose'],
      ['Progression', 'Materia: slotted magic orbs that grow as you earn ability points', 'Classes', 'You choose (materia, jobs, or classes)'],
      ['Elements', 'Six: fire, water, earth, air, holy, unholy, in three opposed pairs', 'Four: fire, ice, lightning, earth, no opposed pairs', 'You declare them'],
      ['Saving', 'The Charter records a save policy, but the finished game always offers autosave plus three slots', 'Same as Saga', 'Same as Saga'],
      ['Wait mode', 'On: gauges pause while a menu is open', 'Off', 'You choose'],
      ['Good for', 'A first game that feels like a classic of the genre', 'A simpler, more traditional battle system', 'People who already know what they want']
    ] },
    { t: 'h3', x: 'What a chapter becomes' },
    { t: 'p', x: 'It helps to know what the Studio does with each chapter, so you can plan content that fits. For every chapter the Studio creates a region on the map, a starting town, a key dungeon, and a boss dungeon. The main quest for each chapter follows the same five stages: arrive in the starting town, clear the key dungeon, defeat the boss, take the road to the next region, and complete the chapter. The last chapter ends with a castle and the finale instead. Chapters are linked by gates that open when the story says so, and vehicles such as a ship and later an airship appear as the story moves on.' },
    { t: 'callout', kind: 'tip', title: 'Think in sets of three', x: 'Each chapter needs a place to arrive, a puzzle to solve, and a boss to beat. If you can describe those three things in a sentence each, the chapter is ready to be typed in.' },
    { t: 'h3', x: 'A classic story shape for the chapters' },
    { t: 'p', x: 'If you are not sure how to pace six chapters, this common shape works well and is easy to adapt. It is a suggestion, not a rule.' },
    { t: 'table', head: ['Chapter', 'Job in the story', 'What the player should feel'], rows: [
      ['1', 'Introduce the hero, the world, and the first threat. Teach battles gently.', 'Curiosity and a small win'],
      ['2', 'Widen the world and add a companion or two. Show the villain\'s reach.', 'Momentum'],
      ['3', 'Cross a threshold to somewhere unfamiliar. Reveal a secret about the hero or the villain.', 'Surprise'],
      ['4', 'Raise the stakes. Give the player a new way to travel or fight.', 'Power and danger together'],
      ['5', 'The lowest point. A loss, a betrayal, or a hard choice.', 'Doubt'],
      ['6', 'The finale. The villain, the hard choice paid off, and the ending.', 'Release']
    ] },
    { t: 'example', title: 'Running example: The Salt Lantern', x: '**Pitch.** A game about a lighthouse keeper\'s apprentice who must relight the sea lamp before the fog swallows every harbor on the coast, in a world where weather is a kind of magic, feeling hopeful and a little lonely.\n**Scale.** Six chapters of about two hours each. Three towns on the first two continents, six dungeons in all, six bosses.\n**Battle style.** Saga Preset, because the weather magic fits six elements in three opposed pairs.\n**Party.** The apprentice, a retired smuggler, a weather scholar, a harbor guard, and a ferry captain\'s child.\n**Villain.** The Hollow One, a drowned lighthouse keeper who believes darkness is kinder than a light that fails.' },
    { t: 'h3', x: 'The Design Sheet' },
    { t: 'p', x: 'Copy this sheet onto paper or into a notes app and answer every line before you open the Charter. The order matches the Charter, so when you start typing you are only copying your answers across. Where the Studio has a limit, it is shown.' },
    { t: 'sheet', title: 'The Pitch', items: [
      'My one sentence pitch (hero, goal, consequence, what makes the world special, tone)',
      'Saga title (limit 80 characters)'
    ] },
    { t: 'sheet', title: 'Premise and World', items: [
      'Premise: two or three sentences, who, where, and what is at stake',
      'Setting: the world, its regions, and its era',
      'Tone, in a short phrase (limit 160 characters), for example hopeful, melancholy, or wry',
      'Technology level, in a short phrase (limit 160 characters), for example medieval, steam age, or ruined machines'
    ] },
    { t: 'sheet', title: 'Magic', items: [
      'Where magic comes from, what it costs, and who can use it',
      'How magic ties to weather, sky, or seasons (optional but recommended)'
    ] },
    { t: 'sheet', title: 'Cast', items: [
      'Protagonist: who they are, what they want, and what stands in the way',
      'Each party member: name (limit 60) and a one sentence past (limit 300), plus how they fight and what they want',
      'Villain: who they are and what they command',
      'Villain motive: why they do it, ideally almost sympathetic'
    ] },
    { t: 'sheet', title: 'Structure', items: [
      'Number of chapters, and the target minutes for each (the total should reach 720 or more)',
      'For each chapter: name, continent label (limit 60), a short summary, and what changes at its end',
      'The boss at the end of each chapter',
      'Endings: a name (limit 80) and a concept for each',
      'Themes: a few short phrases, for example "grief and memory" or "borrowed time"'
    ] },
    { t: 'sheet', title: 'Consistency', items: [
      'Canon: facts that must never be contradicted, one statement each (limit 400)',
      'Glossary: each invented term (limit 80), its category, and a definition (limit 500)'
    ] },
    { t: 'sheet', title: 'Rules and Scale', items: [
      'Battle style: Saga, Classic, or Custom',
      'Quotas: towns, dungeons, enemy families, bosses, and target play hours',
      'Weather states I want, each tied to a real phenomenon',
      'Two or three side quest ideas, each with a giver, a chapter, and a reward'
    ] },
    { t: 'sheet', title: 'Look and Sound', items: [
      'Mood in three words, and the main colors',
      'Tile size (8 to 64 pixels, 16 is common), and screen size (default 256 by 224)',
      'Control scheme for phones: D pad and buttons, virtual stick and buttons, tap to move, or hybrid',
      'A musical idea for the hero and a different one for the villain'
    ] },
    { t: 'h3', x: 'Mistakes first time creators make' },
    { t: 'ul', items: [
      '**Planning too small a story.** The twelve hour floor is real. Decide your chapter count early.',
      '**Too many characters.** Every party member needs stats, a look, a portrait, and a place in the story. Five vivid characters are better than eight blurry ones.',
      '**A villain without a reason.** Players forgive a simple plot. They do not forgive a villain who just wants to be evil.',
      '**No ending plan.** Decide where the story is going before you decide how it starts.',
      '**Skipping difficulty.** Battles that are too easy or too hard ruin pacing. The Rules stage has a Simulator for exactly this. Use it.',
      '**Editing the Charter late.** Amending is allowed, but every change marks later stages as stale.',
      '**Never exporting.** One cleared browser can erase days of work. Export at the end of every session.'
    ] },
    { t: 'h3', x: 'Are you ready to start typing?' },
    { t: 'p', x: 'If you can answer yes to all of these, open the Studio.' },
    { t: 'sheet', title: 'Readiness check', items: [
      'I can say my game in one sentence.',
      'I know how many chapters it has and roughly how long each lasts.',
      'I know who the hero, the party, and the villain are, and why the villain acts.',
      'I have written at least one ending.',
      'I have chosen Saga, Classic, or Custom for the battle style.',
      'I have a canon list and a glossary, even if short.',
      'I know what "done" means for this game.'
    ] }
  ]
}
];
