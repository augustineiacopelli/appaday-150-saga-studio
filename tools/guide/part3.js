'use strict';
// Part 3: Stage 2 (Art and Audio), Stage 3 (World), Stage 4 (Story).
module.exports = [
{
  id: 'stage-2', title: 'Part 3: Stage 2, Art and Audio',
  lead: 'This stage gives your game its look and sound. The good news for a first project is that one button builds all of it, and everything after that is optional polish.',
  blocks: [
    { t: 'h3', x: 'What this stage does' },
    { t: 'p', x: 'Everything in your Rules and Charter is still just text: names, numbers, colors, and descriptions. This stage turns that text into pictures and sound. Every sprite is a recipe of parts (shadow, back gear, body, legs, torso, head, hair, front gear) dressed in a color palette, and every sound is a small set of synthesizer numbers. Nothing is a file you have to draw or record. Everything plays and previews right in the browser, and none of it needs a Claude key.' },
    { t: 'callout', kind: 'tip', title: 'The shortcut', x: 'Open the **Start** tab and press **Quick Build**. It fills in every missing art record, keeps any record you have already edited, and links the eight reserved forward fields that earlier stages left open. You can ship a game having used nothing else in this stage. Treat the rest of this chapter as a menu of things you can change after you have looked at the result.' },
    { t: 'h3', x: 'The tabs' },
    { t: 'table', head: ['Tab', 'What it holds', 'When you will visit'], rows: [
      ['Start', 'Quick Build, plus the coverage list that shows what exists and what is still owed.', 'First, and again to check coverage.'],
      ['Palette', 'The master palette and every palette fitted to it.', 'When the colors feel wrong.'],
      ['Sprites', 'Characters, villain and townspeople, monsters, portraits, and the part library.', 'When a character or monster does not look right.'],
      ['Motion', 'Poses, animations, ability effects, element effects, and weather.', 'When battles or weather feel flat.'],
      ['World Art', 'Terrain tilesets, interiors, stacking priority, tile animation, and battle backgrounds.', 'Before building the world, to confirm every biome has art.'],
      ['Interface', 'Icons, window frame, pixel font, cursor, touch controls, and title screen.', 'To make the menus and title screen yours.'],
      ['Sound', 'Instruments, sound effects, motifs, score by role, and a jukebox.', 'To choose or change the music.'],
      ['Playtest', 'A test room where you can walk the tiles, with the touch controls if you like.', 'To check that tiles are walkable and look right.'],
      ['Export', 'Writes the art bundle for the stage.', 'Last.']
    ] },
    { t: 'h3', x: 'The Start tab and coverage' },
    { t: 'p', x: 'Coverage is a checklist of everything the game will need to draw or play, grouped as **Palettes**, **Sprites**, **Portraits**, **Icons**, **Motion**, **World art**, **Interface**, **Sound**, and **Forward fields**. The **Coverage** chip in the project bar shows the total, for example 173/173. When the numbers match, nothing is missing. The Studio keeps this list honest by counting what your Charter and Rules ask for, so adding a character in Stage 1 raises the number you need here, and Quick Build fills the gap.' },
    { t: 'h3', x: 'Palette' },
    { t: 'p', x: 'The master palette is the single set of colors that everything in the game is drawn from. It is built from your Charter element colors, every monster family\'s colors, and skin, hair, terrain, and metal anchors, then filled in with smooth ramps. That is why the whole game feels like one picture instead of a pile of mismatched pieces.' },
    { t: 'table', head: ['Sub view', 'What you can do'], rows: [
      ['Master', 'See all 64 colors. Pick a new color for any entry or type a hex value. Editing one color recolors everything that uses it. An **Anchors** list shows the colors the palette was built to honor and how close it came to each.'],
      ['Colorways', 'Each character, the villain, and each townsperson type gets its own 16 slot mini palette: outline, skin, hair, two cloth colors, and metal. Party members are spread around the color wheel so they read as different people.'],
      ['Tier palettes', 'One palette for each monster family. Stronger versions of a monster use shifted colors so they are easy to tell apart.'],
      ['Element palettes', 'Four steps for each element (dark, base, light, hot) plus a flash and a tint. Each element also has a **Particle** choice (spark, flake, bubble, shard, ring, wisp, or bolt) and a **Screen** choice (none, wave, shake, or darken), so fire and ice stay distinct even in a small palette.']
    ] },
    { t: 'p', x: 'Two buttons here deserve a warning. **Regenerate** refits every palette to the current colors and can change things you have tweaked. **Rebuild from bundle** is for rebuilding from imported data. Use them only when you mean to.' },
    { t: 'h3', x: 'Sprites' },
    { t: 'p', x: 'A sprite is the little picture of a character or monster. The Studio builds each from its stats, weapon class, and name, so a fast thief and a heavy knight do not end up looking the same. Only frames you hand edit are stored as actual pixels; everything else is regenerated from the recipe, which keeps your project small.' },
    { t: 'table', head: ['Sub view', 'What it shows', 'What you can change'], rows: [
      ['Characters', 'Each party member with a field sprite (four directions, three walking frames) and a battle sprite.', 'Body build, outfit, hair, and weapon look. Duplicate or hand edit a frame.'],
      ['Villain and NPCs', 'Your villain and the townsperson types the World stage will place.', 'Duplicate one to add a new type. Delete types your world does not need.'],
      ['Bestiary', 'One battle sprite for each monster family.', 'The body type. Stronger tiers share the base look in their own colors.'],
      ['Portraits', 'A face for each character, three tiles square.', 'Face parts and colorway.'],
      ['Parts', 'The library of humanoid parts and monster bodies the generator uses.', 'Duplicate a part to vary it, or draw one by hand. The parts are genre neutral, so colorways and settings decide whether they read as medieval, steampunk, or science fiction.']
    ] },
    { t: 'h3', x: 'Motion' },
    { t: 'table', head: ['Sub view', 'What it covers'], rows: [
      ['Poses', 'The poses every sprite can strike, grouped by use: Field, Emotes, Battle party, Battle enemy. Required poses can be relabeled but not removed, because coverage counts them. Pick a **Preview on** character or **Enemy** to see a pose on a real sprite, and tick **Pause previews** to freeze the motion.'],
      ['Animations', 'Lists of poses with durations, offsets, and flashes, plus markers that tell the battle when a hit lands and the sound engine when to play.'],
      ['Ability animations', 'How a spell or skill looks: the caster strikes a pose, the effect travels, and the element bursts on the target. The look comes from the ability\'s kind, targeting, and element.'],
      ['Effects', 'The particle burst and screen movement for each element.'],
      ['Weather', 'An overlay for each weather state in your Rules (rain streaks, snow, ash, fog, blowing leaves, lightning). Clear weather is an overlay of type none, which still counts as covered. A description with no known keyword gets a plain generic overlay for you to edit.']
    ] },
    { t: 'h3', x: 'World Art' },
    { t: 'p', x: 'This is the terrain. Tiles are the square building blocks of every map, and the size comes from the Charter (16 pixels here), so previews always match the game.' },
    { t: 'table', head: ['Sub view', 'What it covers'], rows: [
      ['Tilesets', 'One tileset for each biome, each with climate keys (from frigid to hot, from arid to saturated, and water depth or shore) that the World stage reads when it decides where each biome goes.'],
      ['Interiors', 'Floors, walls, doors, stairs, counters, and furnishings for towns and dungeons. Walls, rugs, and channels join automatically like terrain. Flags decide what the party can walk on, and an **above** flag draws a tile over the party, like a beam over a doorway.'],
      ['Priority', 'Where two biomes meet, the higher one draws its rounded edge over the lower one. Moving a biome in this list renumbers the stacking order.'],
      ['Tile animations', 'How water, lava, and similar tiles move. Each type has a **Technique** (cycle, scroll, or phase) and a **Frame (ms)** slider.'],
      ['Backgrounds', 'The battle backdrop for each tileset, layered as sky, far, mid, near, and floor. Parallax and drift make clouds and waves move during a battle.'],
      ['Invent a biome', 'Adds a new terrain type of your own, with its own tileset, if the built in ones do not suit your world.']
    ] },
    { t: 'callout', kind: 'tip', title: 'Do biomes now, not later', x: 'The World stage will not open until the art has biome tilesets and interior tilesets. If you invent a biome here, remember that it also needs a place in the Charter\'s regions or the World stage will have no reason to use it.' },
    { t: 'h3', x: 'Interface' },
    { t: 'table', head: ['Sub view', 'Fields and choices'], rows: [
      ['Icons', 'One 16 by 16 icon for every item, equipment piece, ability, status, and materia, tinted by element or name. A **Draft icons** button is there for Claude generated icons and needs your API key.'],
      ['Window and font', 'The frame every menu uses: **Top of the gradient**, **Bottom of the gradient**, **Outer line**, **Border** colors, **Corner** (Square, Round, Notch), **Border** thickness (Thin, Medium, Thick), **Opacity**, and **Opening** style (Grow, Fade, None) with **Opening ms**. Below it is a hand drawn 5 by 7 pixel font where you can pick a character and toggle its pixels.'],
      ['Cursor', 'The pointer that marks the chosen menu entry. Choose **Fill**, **Highlight**, **Outline** colors, a **Shape** (Triangle, Hand, Diamond, Bar), and how much it bobs (**Bob pixels** and **Bob ms**).'],
      ['Touch skin', 'The on screen controls a phone player sees: **Controls** and **Ink** colors, a **Scheme** (follow the Charter, D pad and buttons, virtual stick and buttons, tap to move, or a hybrid), **Shape** (Round or Square), **Opacity**, **Size**, labels for the **A**, **B**, and **Menu** buttons, and a **Move sound**. Press the controls in the preview to try them.'],
      ['Title', 'The first screen a player sees: **Logo text**, **Prompt**, **Credit line**, **Logo style** (Outline, Shadow, Plain), **Layout** (Center, Upper, Lower), **Logo scale**, a **Background** from your battle backdrops, and logo and prompt colors. The logo text follows your Charter title unless you type your own.']
    ] },
    { t: 'h3', x: 'Sound' },
    { t: 'p', x: 'Music is four voice chiptune, the sound of classic console RPGs: two pulse waves, a triangle wave, and noise for drums. Sound effects are generated from small parameter sets. All of it plays through the browser\'s Web Audio, so a browser without it can still edit and export the records but cannot play them.' },
    { t: 'table', head: ['Sub view', 'What it covers'], rows: [
      ['Instruments', 'Each instrument is a set of tables stepped 60 times a second: duty (pulse width), volume with an optional loop point, arpeggio, and pitch, plus vibrato and release.'],
      ['Effects', 'Battle and menu cues, one spell sound for each element, and one for each ability. Choose **New sound from a preset** (Hit, Magic, UI, Ambient, Item, Special) and use **Mutate** to nudge a sound into a cousin of itself.'],
      ['Motifs', 'Short melodic themes, shown with their key, length, and tempo, which follow characters from the field into battle.'],
      ['Score by role', 'Every place the game plays music is a role. There are eight fixed ones (Title, Town, Dungeon, Battle, Boss, Victory, Defeat, Ending), one field role for each continent in your Charter, and one for each ending you write. Quick Build derives a track from a motif for each role. Use **Add a role** with a **Label** for anything extra. Battles call the battle (or boss), victory, and defeat roles on their own.'],
      ['Jukebox', 'Every track and cue in one place, with a mixer: **Music volume**, **Effects volume**, and **Mute**. Four meters show what each voice is playing.']
    ] },
    { t: 'h3', x: 'Playtest and Export' },
    { t: 'p', x: '**Playtest** drops you into a test room built from your tiles. Walk around, bump into walls, and check that doorways, water, and cliffs behave. Turn the touch skin on to try it with your thumbs. **Export** writes the art bundle. Mark the stage Final from the status row when coverage is complete and the Unresolved drawer has no errors or broken references. Final is blocked by errors, broken references, and forward fields that were never filled.' }
  ]
},
{
  id: 'stage-3', title: 'Part 3: Stage 3, World',
  lead: 'The World stage builds your maps from a seed number, places every town, dungeon, and gate, and proves that a player can walk the whole game from start to finish.',
  blocks: [
    { t: 'h3', x: 'What this stage does' },
    { t: 'p', x: 'You do not draw maps. You describe the shape of each continent, and the Studio grows a world from a **World seed**: a number that decides the layout. The same seed always makes the same world, and a different seed makes a different one. The Studio then places sites (towns, dungeons, and other landmarks), connects them with the gates that control progress, and checks that the whole thing can be completed in order.' },
    { t: 'callout', kind: 'note', title: 'Before it opens', x: 'World needs a locked Charter with chapters, plus art that has biome tilesets and interior tilesets. If it will not open, run **Quick Build** in Art and Audio and make sure the Charter has chapters.' },
    { t: 'table', head: ['Tab', 'What it holds'], rows: [
      ['Start', 'The **World seed**, a **Reroll** button for a new one, and **Lay out again** to rebuild with the current settings.'],
      ['World', 'The map itself and its controls.'],
      ['Sites', 'Every place on the map and a preview of each.'],
      ['Encounters', 'Where and how often battles happen.'],
      ['Validation', 'The proof that the world can be finished.'],
      ['Export', 'Writes the world bundle.']
    ] },
    { t: 'h3', x: 'The World tab' },
    { t: 'p', x: 'Each continent has three sliders that shape it. **Radius** sets how large it is. **Ruggedness** sets how broken up the coast and terrain are. **Mountain share** sets how much of the land is mountains. Press **Generate again** to rebuild with the same seed after changing a slider, or **New seed** for a different world entirely.' },
    { t: 'p', x: 'Two overlays can be switched on over the map: **Sites** and **Gates**. A set of layers shows how the world was made: **Tiles**, **Biome**, **Elevation**, **Temperature**, **Moisture**, **Regions**, and **Zones**. If a region looks wrong, look at Temperature and Moisture first, because those two decide most biome placement.' },
    { t: 'h3', x: 'Sites' },
    { t: 'p', x: 'Sites are the places a player can enter: towns, dungeons, and special locations. The Studio places one set for each chapter in your Charter, with starting towns, dungeons, bosses, and the gates between chapters. You can preview any site and look at its map. Gates are what keep the story in order. The gate keys are **chapter**, **seal**, **ship**, and **airship**, and each one blocks the way until the Story stage says it is open.' },
    { t: 'h3', x: 'Encounters' },
    { t: 'p', x: 'This tab lists four groups: **Overworld zones**, **floors** (dungeon levels), **Bosses and guardians**, and **Side quest givers**. Each zone links to a list of troops from your Rules, and each shows a weight and a rate. Press **Edit** on a zone to change the **weights and rates**. A higher weight makes a troop appear more often in that zone, and a higher rate makes battles happen more often as you walk. If a boss slot is empty, pick a troop for it here or return to the Rules stage.' },
    { t: 'h3', x: 'Validation' },
    { t: 'p', x: 'This is the part that makes the stage worth having. Validation walks your game chapter by chapter, from the first town to the final gate, and checks several things.' },
    { t: 'table', head: ['Check', 'What it proves'], rows: [
      ['Progression', 'Each chapter can be reached and left in order, with no gate that opens too early or never.'],
      ['References', 'Every site, troop, and record the world uses exists.'],
      ['Map flags', 'Maps are walkable where they should be and blocked where they should be.'],
      ['Encounter zones', 'Every zone has troops and rates that make sense.'],
      ['Generation', 'The world was built without problems.'],
      ['Records', 'The world records are well formed.']
    ] },
    { t: 'p', x: 'A red result tells you what is wrong and where. Most problems are an empty boss slot, a chapter with no site, or a continent too small to fit everything. Fix them, press **Generate again**, and check again.' },
    { t: 'h3', x: 'Export and finishing' },
    { t: 'p', x: 'Choose **Draft** or **Final** in the radio buttons. **Include engine-world.js** adds the engine file the bundle needs to run on its own, and **Bake maps** stores finished maps inside the bundle. Final requires a clean validation. Press **Mark stage Final** when it is.' }
  ]
},
{
  id: 'stage-4', title: 'Part 3: Stage 4, Story',
  lead: 'This stage writes the plot into the game: flags, quests, conversations, events, and endings. It is the stage where your planning pays off the most.',
  blocks: [
    { t: 'h3', x: 'What this stage does' },
    { t: 'p', x: 'The Story stage takes your Charter chapters and your finished world and builds the structure of the plot automatically: a flag for each gate, a quest for each chapter, dialogue for each quest, and events for each town, boss, and exit. You then read it, fix it, and add your own writing. Like the other stages, it does not need a Claude key, though the **Draft with Claude** buttons do.' },
    { t: 'callout', kind: 'note', title: 'Before it opens', x: 'Story needs the World stage to be Final and valid. It also checks that your main story is long enough: the sum of every chapter\'s target minutes must reach the **12 hour floor** (720 minutes) for the main story alone. Side quests do not count toward the floor.' },
    { t: 'h3', x: 'The words you need' },
    { t: 'table', head: ['Word', 'Meaning', 'Example from The Salt Lantern'], rows: [
      ['Flag', 'A named whole number the game remembers. Zero means no, one or more means yes or a count.', 'light_lit starts at 0 and becomes 1 when the lantern is lit.'],
      ['Quest', 'A goal that moves through stages like a state machine.', 'Find the lamp oil, bring it to the keeper, light the lantern.'],
      ['Dialogue', 'A conversation with nodes, lines, and choices.', 'The keeper explains what the lantern does.'],
      ['Event', 'A thing that happens on the map when a trigger fires, made of pages, conditions, and commands.', 'Stepping on the harbor steps starts a cutscene.'],
      ['Ending', 'One possible conclusion, chosen by priority and condition.', 'The lantern lit or left dark.']
    ] },
    { t: 'table', head: ['Tab', 'What it holds'], rows: [
      ['Start', 'Playtime for side quests, the endings list, and a shortcut to the finale.'],
      ['Flags', 'Every flag, with gate bindings.'],
      ['Quests', 'Every quest and its stages.'],
      ['Dialogue', 'Every conversation.'],
      ['Events', 'Every map event.'],
      ['Validation', 'The checks that decide whether the story is finishable.'],
      ['Export', 'Writes the story bundle.']
    ] },
    { t: 'h3', x: 'Start tab and endings' },
    { t: 'p', x: 'Set the **playtime in minutes** for side quests here. **Update endings** refreshes the list from your Charter, **Add ending** creates a new one, and **Open the finale** jumps to the final event. Every ending has the same fields.' },
    { t: 'table', head: ['Field', 'What it means'], rows: [
      ['Name', 'What the ending is called (limit 80 characters).'],
      ['Priority', 'When several endings are possible, the one with the highest priority that passes wins.'],
      ['Concept', 'A sentence about what happens and how it feels.'],
      ['Credits music', 'Which music role plays during the credits.'],
      ['Epilogue', 'The text that follows the final scene.'],
      ['Earned when', 'The condition that unlocks this ending, built from the condition options listed under Events.'],
      ['Make this the fallback', 'Marks the ending that plays when none of the others pass. Exactly one ending must be the fallback.']
    ] },
    { t: 'h3', x: 'Flags' },
    { t: 'p', x: 'Flags are the game\'s memory. The Studio creates the gate flags for you and binds them to the gates in the world, which you can see under **Gate bindings**. You can **Add flag** for anything of your own, **Change flag** to edit one, **Search flags** to find one, and **Regenerate bindings** to rebuild the gate links if you changed the world. Flags are whole numbers only, so a yes or no is 0 or 1, and a counter simply counts.' },
    { t: 'h3', x: 'Quests' },
    { t: 'p', x: 'A quest is a list of stages. The player is always in exactly one stage of each started quest, and conditions move them forward. Use the filters **All**, **Main**, **Side**, **B story**, and **Yours** to find what you want. **Update quests** brings the list up to date, and **Add quest** creates one. Two checkboxes control what is built automatically: a side quest for each seed, and a B story for each character.' },
    { t: 'table', head: ['Stage field or button', 'What it does'], rows: [
      ['Stage label', 'The name the player sees in the journal.'],
      ['Site', 'Where the stage takes place on the map.'],
      ['Note', 'A reminder for yourself or the player.'],
      ['Move on when', 'A condition. When it passes, the quest moves to the next stage.'],
      ['Add a flag change', 'Sets or changes a flag when the stage is reached.'],
      ['Save stage', 'Keeps your edits.'],
      ['Earlier and Later', 'Moves the stage up or down the list.'],
      ['Add stage after, Delete stage', 'Inserts or removes a stage.'],
      ['Add branch group', 'Lets a stage go several ways based on a choice.'],
      ['Add a failure rule', 'Defines when the quest is failed.'],
      ['Reset to generated', 'Throws your changes away and goes back to what the Studio built.']
    ] },
    { t: 'h3', x: 'Dialogue' },
    { t: 'p', x: 'A conversation is a graph of nodes. Each node has the **Lines** spoken, any **effects**, and **What comes next**. **Update dialogue** and **Add dialogue** manage the list, and **+ Node** and **Rename** edit one conversation. The **Dialogue speaker** field names who is talking, and **Draft with Claude** writes a first pass if you have a key. **Preview** shows how it reads, and **Run from the start** plays it through.' },
    { t: 'table', head: ['Effect', 'What it does'], rows: [
      ['Set a flag', 'Puts a value into a flag.'],
      ['Add to a flag', 'Raises or lowers a flag by an **Amount**.'],
      ['Give an item', 'Adds an item to the party.'],
      ['Take an item', 'Removes an item.'],
      ['Gil', 'Gives or takes money.'],
      ['Quest stage', 'Moves a quest to a stage.'],
      ['Party member', 'Adds or removes a character.']
    ] },
    { t: 'p', x: '**What comes next** has three choices: **Ends here**, **Goes to another node**, or **Offers choices**. A good conversation is rarely more than a few nodes. If you find yourself building a maze, split it into two conversations.' },
    { t: 'h3', x: 'Events' },
    { t: 'p', x: 'Events are the map\'s moments: a cutscene on entering town, an elder who speaks, a seal that breaks, a boss fight, an exit. The filters **Openers**, **Talk**, **Seals**, **Bosses**, **Exits**, **Finale**, and **Yours** sort them. Each event has **pages**, and the page on the right that passes its condition is the one that runs. Tick **Once** to make an event run a single time.' },
    { t: 'p', x: 'A condition can be **All**, **Any**, or **None** of a group of tests, or one of these: **A flag**, **An item**, **The chapter**, **A quest**, or **Always**. Comparisons are **at least**, **more than**, **exactly**, **not equal to**, **at most**, and **fewer than**. Quest tests are **is at stage**, **is complete**, **has failed**, **has reached stage**, and **has started**.' },
    { t: 'p', x: 'Each page is a list of commands. There are 21 kinds.' },
    { t: 'table', head: ['Group', 'Commands'], rows: [
      ['Talk and decide', 'Show text, Offer a choice, If a condition passes'],
      ['Story state', 'Move a quest, Run another event, End the game, Set a flag, Add to a flag'],
      ['Items and party', 'Give an item, Take an item, Give or take gil, Party member joins or leaves'],
      ['Battle and movement', 'Start a battle, Move someone, Turn someone, Wait'],
      ['Screen and sound', 'Fade the screen, Play music, Play a sound'],
      ['Travel', 'Change map, Board or leave a vehicle']
    ] },
    { t: 'p', x: 'The **Empty boss slots** list shows boss events that still have no troop. Choose one for each. The **Playtester** lets you run one event on its own by choosing the **Event to play**, the **Page**, the **Chapter to start in**, and a quest stage, with **Carry on** to continue after it ends. **Play** runs the event, and **Play the golden path** runs the main story from the beginning.' },
    { t: 'h3', x: 'Validation and Export' },
    { t: 'table', head: ['Check', 'What it proves'], rows: [
      ['Story smells', 'Warnings about things that look wrong but still work, such as a flag nobody reads.'],
      ['References', 'Every flag, item, quest, and troop that the story mentions exists.'],
      ['The walk', 'The golden path is followed from the start to the end.'],
      ['The proofs', 'Every gate can be opened and every quest can be completed.'],
      ['No softlock', 'There is no state where the player cannot continue.'],
      ['The 12 hour floor', 'The main story targets at least 720 minutes.']
    ] },
    { t: 'p', x: 'Choose **Draft** or **Final**. **Include engine-story.js** adds the engine, and **Final whole game kit** bundles everything the finished game needs. Mark the stage Final when every check passes.' }
  ]
}
];
