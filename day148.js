// Finds a clone of Day 148. It is never committed here: vendor.js cuts its fences into forge/148/ and checks each one byte for byte
// against it, and the tests boot its page for the round trip.
// Looks for a folder named app148 at the repo root, then a sibling clone of appaday-148-world-forge.
'use strict';
const fs = require('fs');
const path = require('path');
const CANDIDATES = [
  path.join(__dirname, 'app148'),
  path.join(__dirname, '..', 'appaday-148-world-forge'),
  path.join(__dirname, '..', 'augustineiacopelli', 'appaday-148-world-forge')
];
const found = CANDIDATES.find((p) => fs.existsSync(path.join(p, 'index.html')) && fs.existsSync(path.join(p, 'engine-world.js')));
if (!found) throw new Error('Day 148 not found. Clone https://github.com/augustineiacopelli/appaday-148-world-forge next to this repo, or copy it here as app148/.');
module.exports = found;
