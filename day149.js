// Finds a clone of Day 149, which also owns the five engine files vendored into engines/. It is never committed here:
// vendor.js cuts its fences into forge/149/ and checks each one byte for byte against it, and the tests boot its page.
// Looks for a folder named app149 at the repo root, then a sibling clone of appaday-149-story-forge.
'use strict';
const fs = require('fs');
const path = require('path');
const CANDIDATES = [
  path.join(__dirname, 'app149'),
  path.join(__dirname, '..', 'appaday-149-story-forge'),
  path.join(__dirname, '..', 'augustineiacopelli', 'appaday-149-story-forge')
];
const found = CANDIDATES.find((p) => ['index.html', 'engine-render.js', 'engine-audio.js', 'engine-world.js', 'engine-battle.js', 'engine-story.js'].every((f) => fs.existsSync(path.join(p, f))));
if (!found) throw new Error('Day 149 not found. Clone https://github.com/augustineiacopelli/appaday-149-story-forge next to this repo, or copy it here as app149/.');
module.exports = found;
