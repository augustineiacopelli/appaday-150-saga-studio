'use strict';
// Part 4: Stage 5, test, build, share. Part 5: reference.
module.exports = [
{
  id: 'stage-5', title: 'Part 4: Stage 5, Test, Build, and Share',
  lead: 'The last stage turns everything into a game that someone else can play, and gives you a way to test it first.',
  blocks: [
    { t: 'h3', x: 'Before it opens' },
    { t: 'p', x: 'The Game stage opens when the Story stage is Final. To build the game, every stage must be Final, none may be marked Stale, and the **Unresolved** drawer must be clear. If the story check has not been run, building runs it for you.' },
    { t: 'h3', x: 'Test Play' },
    { t: 'p', x: 'You do not have to wait until the end to play. **Test Play** is on the Story and Game stages and opens a picker that asks where to start.' },
    { t: 'table', head: ['Start', 'What it does', 'Extra choices'], rows: [
      ['New game', 'Begins at the title screen like a real player.', 'None.'],
      ['Start of a chapter', 'Jumps to the opening of any chapter, with the party and items it should have by then.', 'Chapter.'],
      ['On a map', 'Drops you onto any map to test one place.', 'Map.'],
      ['A battle', 'Starts a single fight, which is the best way to tune a boss.', 'Troop.']
    ] },
    { t: 'p', x: 'Test saves are kept apart from real saves, so testing never overwrites a game you have been playing. When something feels wrong, play the same spot twice before changing a number. One unlucky fight is not a balance problem.' },
    { t: 'h3', x: 'Build the game' },
    { t: 'p', x: 'Press **Build game** and choose how you want to receive it.' },
    { t: 'table', head: ['Choice', 'What you get', 'Best for'], rows: [
      ['One HTML file', 'A single file that holds the whole game. Open it in a browser and play.', 'Sending to a friend, or putting on a web page.'],
      ['Folder as a .zip', 'The same game as a folder of files, zipped.', 'Hosting on a website where you want separate files.']
    ] },
    { t: 'h3', x: 'What the finished game plays like' },
    { t: 'p', x: 'The game runs in any modern browser, on a computer or a phone.' },
    { t: 'table', head: ['Control', 'Keyboard'], rows: [
      ['Move', 'Arrow keys or W, A, S, D'],
      ['A (confirm, talk)', 'Enter, Space, or Z'],
      ['B (cancel, back)', 'Escape, X, or Backspace'],
      ['Menu', 'M']
    ] },
    { t: 'p', x: 'On a phone, the touch controls from the Interface tab appear on screen. The menu has **Status**, **Equip and Materia**, **Items**, **Journal**, **Airship**, **Save**, and **Settings**. The game saves automatically and also offers three save slots. Up to four party members fight at once.' },
    { t: 'h3', x: 'Sharing your game' },
    { t: 'ol', items: [
      'Build the game as **One HTML file**.',
      'Give it a clear name, such as the title of your saga.',
      'To put it online for free, create a new repository on GitHub, upload the file (rename it index.html), open the repository settings, and turn on **Pages** from the main branch. In a minute or two your game has a web address anyone can open.',
      'Play it once on a phone and once on a computer before you share the link.',
      'Keep your project bundle. Use **Export** in the project bar to save it, because that file is what lets you change the game later.'
    ] }
  ]
},
{
  id: 'reference', title: 'Part 5: Reference',
  lead: 'Quick lookups for when you are in the middle of work.',
  blocks: [
    { t: 'h3', x: 'What the record IDs mean' },
    { t: 'p', x: 'Every record has an ID made of a short prefix and a number. When the Studio reports a problem, the prefix tells you what kind of thing it is.' },
    { t: 'table', head: ['Prefix', 'Kind of record', 'Stage'], rows: [
      ['chr', 'Character', 'Rules'],
      ['abl', 'Ability', 'Rules'],
      ['itm', 'Item', 'Rules'],
      ['eqp', 'Equipment', 'Rules'],
      ['sta', 'Status effect', 'Rules'],
      ['frm', 'Formula', 'Rules'],
      ['fam', 'Monster family', 'Rules'],
      ['enm', 'Enemy', 'Rules'],
      ['gmb', 'Gambit', 'Rules'],
      ['trp', 'Troop', 'Rules'],
      ['shp', 'Shop', 'Rules'],
      ['wth', 'Weather state', 'Rules'],
      ['lim', 'Limit', 'Rules'],
      ['eps', 'Expected Party State row', 'Rules'],
      ['mat, job, cls', 'Materia, job, class', 'Rules'],
      ['rmr, sdq, bst', 'Living world records', 'Rules'],
      ['chp', 'Chapter', 'Charter'],
      ['spr, por, anm, sfx, ico, mus', 'Sprite, portrait, animation, sound effect, icon, music', 'Art and Audio'],
      ['til, pal, bgd, uik, efx, wov, ins, prt', 'Tileset, palette, background, interface kit, effect, weather overlay, instrument, part', 'Art and Audio'],
      ['map, reg, npc, twn, dgn', 'Map, region, townsperson, town, dungeon', 'World'],
      ['flg, qst, dlg, evt, end', 'Flag, quest, dialogue, event, ending', 'Story']
    ] },
    { t: 'h3', x: 'Glossary' },
    { t: 'table', head: ['Term', 'Meaning'], rows: [
      ['Bundle', 'A file that holds the work of one or more stages. Export writes one and Import reads one.'],
      ['Charter', 'The founding document of your game: premise, world, party, systems, chapters, and rules of play.'],
      ['Codex', 'A generated reference of your Charter that opens the Rules stage.'],
      ['Final', 'A stage that is finished and checked. The next stage can open.'],
      ['Stale', 'A stage that was Final but whose inputs changed afterwards.'],
      ['Forward reference', 'A record that points at something a later stage owes.'],
      ['Broken reference', 'A record that points at something that does not exist.'],
      ['Gate', 'A point that blocks the way until the story allows it.'],
      ['Golden path', 'The shortest route through the main story from start to finish.'],
      ['Softlock', 'A state where the player cannot continue and cannot go back.'],
      ['Tileset', 'The set of square pieces used to draw one kind of terrain.'],
      ['Biome', 'A kind of terrain such as forest, desert, or snow.'],
      ['Seed', 'A number that decides how a world is generated.'],
      ['Troop', 'A group of enemies that appear in one battle.'],
      ['Materia', 'A socketable item that grants abilities, in the style of classic console RPGs.']
    ] },
    { t: 'h3', x: 'Troubleshooting' },
    { t: 'table', head: ['Problem', 'Likely cause', 'Fix'], rows: [
      ['A stage is Locked', 'The stage before it is not Final.', 'Go back and press Mark stage Final.'],
      ['Mark stage Final does nothing', 'There are errors or broken references.', 'Open the Unresolved drawer and use Jump on each item.'],
      ['A stage turned Stale', 'You changed something it depends on.', 'Open it, review, and mark it Final again.'],
      ['World will not open', 'No biome or interior tilesets in the art.', 'Run Quick Build in Art and Audio.'],
      ['Story will not open', 'The world is not Final or does not validate.', 'Fix World Validation.'],
      ['The 12 hour floor fails', 'Chapter target minutes add up to less than 720.', 'Raise chapter targets in the Charter, or add a chapter.'],
      ['A boss has no troop', 'An Empty boss slot in Events or Encounters.', 'Pick a troop for it.'],
      ['Claude buttons do nothing', 'No API key saved.', 'Open Settings, paste your key, and press Test Key.'],
      ['A save failed with a storage banner', 'The browser is full.', 'Press Export now, then clear space.'],
      ['Load the demo does nothing', 'The Studio ships no demo game.', 'Use Projects and Import instead.']
    ] },
    { t: 'h3', x: 'Final checklist' },
    { t: 'ol', items: [
      'The pitch fits in one sentence and I can say why a player would want it.',
      'The Charter is locked with all 13 sections complete.',
      'Rules has a full party, enemies, troops, a boss for every chapter, and an Expected Party State row for each chapter.',
      'Art coverage is complete and I have heard the music.',
      'The world validates and I have walked at least one chapter in Playtest.',
      'The Story passes every check, including the 12 hour floor.',
      'Every ending has a condition, and exactly one is the fallback.',
      'No stage is Stale and the Unresolved drawer is clear.',
      'I played from New game on a phone and on a computer.',
      'I exported my project bundle and saved it somewhere safe.'
    ] }
  ]
}
];
