// Finds a clone of Day 147 (Art and Audio Forge, appaday-147-art-and-audio-forge). It is never committed here: vendor.js copies its source files
// byte for byte and checks them against it, and the tests boot its index.html as the reference.
// Looks for a folder named app147 at the repo root, then a sibling clone.
'use strict';
const fs = require('fs');
const path = require('path');
const CANDIDATES = [
  path.join(__dirname, 'app147'),
  path.join(__dirname, '..', 'appaday-147-art-and-audio-forge'),
  path.join(__dirname, '..', 'augustineiacopelli', 'appaday-147-art-and-audio-forge')
];
const found = CANDIDATES.find((p) => fs.existsSync(path.join(p, 'index.html')));
if (!found) throw new Error('Day 147 clone not found. Clone https://github.com/augustineiacopelli/appaday-147-art-and-audio-forge next to this repo, or put a copy in a folder named app147.');
module.exports = found;
