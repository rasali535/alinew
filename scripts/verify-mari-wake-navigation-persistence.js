const fs = require('fs');

const voice = fs.readFileSync('apps/ralion/src/components/MariVoiceControl.tsx', 'utf8');
const layout = fs.readFileSync('apps/ralion/src/app/(dashboard)/layout.tsx', 'utf8');
const wakeRoute = fs.readFileSync('apps/ralion/src/app/api/mari/voice/wake/route.ts', 'utf8');

const checks = [
  [voice, "authFetch('/api/mari/voice/wake'", 'voice control must use wake fallback endpoint'],
  [voice, 'recorder.start(3000)', 'wake fallback must stream short chunks'],
  [voice, 'pendingNavigationRef.current = { route, destination }', 'navigation must be queued'],
  [voice, "window.dispatchEvent(new CustomEvent('ralion:mari-navigate'", 'queued navigation must dispatch after response completion'],
  [layout, 'stableMariVoiceContext', 'dashboard layout must preserve stable Mari voice tenant context'],
  [wakeRoute, "gpt-4o-mini-transcribe", 'wake endpoint must use lightweight transcription model'],
  [wakeRoute, 'containsMariWakePhrase', 'wake endpoint must detect only approved wake phrases'],
  [wakeRoute, 'MAX_WAKE_AUDIO_BYTES', 'wake endpoint must bound upload size'],
];

for (const [source, needle, message] of checks) {
  if (!source.includes(needle)) throw new Error(message + ': ' + needle);
}

if (/setTimeout\(\(\) => \{\s*window\.dispatchEvent\(new CustomEvent\('ralion:mari-navigate'.*\}, 150\)/s.test(voice)) {
  throw new Error('Immediate 150ms navigation path must not return.');
}

console.log('Mari wake fallback and navigation persistence invariants verified.');
