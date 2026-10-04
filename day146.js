// Finds Day 146's index.html. It is never committed here: vendor.js cuts its fences into core/ and forge/146/ and checks each one byte for byte
// against it, and the tests boot its page for the round trip.
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
if (!found) throw new Error('Day 146 not found. Clone https://github.com/augustineiacopelli/appaday-146-saga-forge next to this repo, or copy its index.html here as app146.html.');
module.exports = found;
