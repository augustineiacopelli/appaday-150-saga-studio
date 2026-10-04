// Finds a clone of Day 148 (World Forge, appaday-148-world-forge). It is never committed here: vendor.js copies its source files
// byte for byte and checks them against it, and the tests boot its index.html as the reference.
// Looks for a folder named app148 at the repo root, then a sibling clone.
'use strict';
const fs = require('fs');
const path = require('path');
const CANDIDATES = [
  path.join(__dirname, 'app148'),
  path.join(__dirname, '..', 'appaday-148-world-forge'),
  path.join(__dirname, '..', 'augustineiacopelli', 'appaday-148-world-forge')
];
const found = CANDIDATES.find((p) => fs.existsSync(path.join(p, 'index.html')));
if (!found) throw new Error('Day 148 clone not found. Clone https://github.com/augustineiacopelli/appaday-148-world-forge next to this repo, or put a copy in a folder named app148.');
module.exports = found;
