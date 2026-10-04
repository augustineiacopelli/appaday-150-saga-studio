// Finds Day 146's index.html (Saga Forge). It is never committed here: vendor.js cuts KIT:CORE and the Day 146 workspace
// fences from it byte for byte, and the tests boot it as the reference.
// Looks for app146.html at the repo root, then a sibling clone of appaday-146-saga-forge.
'use strict';
const fs = require('fs');
const path = require('path');
const CANDIDATES = [
  path.join(__dirname, 'app146.html'),
  path.join(__dirname, '..', 'appaday-146-saga-forge', 'index.html'),
  path.join(__dirname, '..', 'augustineiacopelli', 'appaday-146-saga-forge', 'index.html')
];
const found = CANDIDATES.find((p) => fs.existsSync(p));
if (!found) throw new Error('Day 146 index.html not found. Clone https://github.com/augustineiacopelli/appaday-146-saga-forge next to this repo, or copy its index.html here as app146.html.');
module.exports = found;
