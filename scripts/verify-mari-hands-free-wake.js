const fs = require('fs');

const voice = fs.readFileSync('apps/ralion/src/components/MariVoiceControl.tsx', 'utf8');
const desktop = fs.readFileSync('apps/desktop/src/main.ts', 'utf8');

const requiredVoice = [
  'wakePermissionReady',
  'setWakePermissionReady(true)',
  "wakeEnabled && wakePermissionReady && voiceState === 'idle'",
  'do not start SpeechRecognition until microphone permission has',
  'pendingNavigationRef',
  'Let Mari finish the acknowledgement generated',
  "window.dispatchEvent(new CustomEvent('ralion:mari-navigate'",
];

if (voice.includes("window.setTimeout(() => {\n              window.dispatchEvent(new CustomEvent('ralion:mari-navigate', { detail: { route } }));\n            }, 150);")) {
  throw new Error('Navigation must not fire immediately from the navigate_ralion tool handler.');
}

const requiredDesktop = [
  'setPermissionCheckHandler',
  'setPermissionRequestHandler',
  "permission !== 'media'",
  "parsed.protocol === 'app:' && parsed.hostname === 'localhost'",
];

for (const needle of requiredVoice) {
  if (!voice.includes(needle)) throw new Error('Missing Mari wake invariant: ' + needle);
}
for (const needle of requiredDesktop) {
  if (!desktop.includes(needle)) throw new Error('Missing desktop microphone permission invariant: ' + needle);
}

console.log('Mari hands-free wake permission invariants verified.');
