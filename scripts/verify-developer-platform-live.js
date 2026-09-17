const fs = require('fs');
const path = require('path');

const sidebar = fs.readFileSync(path.resolve(__dirname, '../packages/ui/src/Sidebar.tsx'), 'utf8');

const developerLine = sidebar.split('\n').find((line) => line.includes("id: 'developer'"));
if (!developerLine) {
  throw new Error('[Developer nav] Developer Platform sidebar entry is missing.');
}
if (developerLine.includes('Coming Soon') || developerLine.includes('isLocked: true')) {
  throw new Error('[Developer nav] Developer Platform is still presented as Coming Soon/locked.');
}
if (!developerLine.includes("badge: 'Live'")) {
  throw new Error('[Developer nav] Developer Platform should advertise its live status.');
}

console.log('Developer Platform navigation contract: PASS');
