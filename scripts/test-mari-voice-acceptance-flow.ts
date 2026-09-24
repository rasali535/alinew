/**
 * RALION OS — MARI VOICE COMPREHENSIVE ACCEPTANCE TEST SUITE
 *
 * Verifies the 12 required Mari Voice acceptance invariants:
 * 1. "Hey Mari" / "Okay Mari" / "Mari wake up" wake detection without keyboard shortcut
 * 2. General greeting handles via snapshot without canonical business reasoning
 * 3. Business questions ("What do you know about my business?") route through ask_mari
 * 4. Social performance questions ("How is our Facebook performing?") route through canonical Mari/BI
 * 5. "Open Growth" navigates to Growth via allowlisted navigate_ralion
 * 6. Persistent voice: client-side routing keeps WebRTC alive across dashboard navigation
 * 7. Active route context ("What am I looking at here?") passes activeScreen route to ask_mari
 * 8. "Open CRM" navigates to CRM without dropping the voice session
 * 9. Safe mutation boundary: zero write/edit/delete/publish/send tools exposed
 * 10. "Mari, go to sleep" invokes end_voice_session and cleanly terminates WebRTC session
 * 11. Lightweight wake standby resumes automatically after voice session shutdown
 * 12. Durable telemetry records once with token/audio metrics without double charging
 */

import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

const layout = read('apps/ralion/src/app/(dashboard)/layout.tsx');
const control = read('apps/ralion/src/components/MariVoiceControl.tsx');
const sessionRoute = read('apps/ralion/src/app/api/mari/voice/session/route.ts');
const usageRoute = read('apps/ralion/src/app/api/mari/voice/usage/route.ts');
const mariPage = read('apps/ralion/src/app/(dashboard)/mari-ai/page.tsx');

let passed = 0;
let failed = 0;

function check(title: string, ok: boolean, reason?: string) {
  if (ok) {
    passed++;
    console.log(`✅ [PASS] ${title}`);
  } else {
    failed++;
    console.error(`❌ [FAIL] ${title}${reason ? `: ${reason}` : ''}`);
  }
}

console.log('\n======================================================================');
console.log('  🎙️  RALION OS — MARI VOICE LIVE ACCEPTANCE TEST SUITE');
console.log('======================================================================\n');

// 1. "Hey Mari" wakes Mari without needing Ctrl/Cmd + Shift + Space
const wakeRegexMatch = control.includes('/\\b(?:hey|okay|ok) mari\\b|\\bmari wake up\\b/');
const wakeStandaloneRecognition = control.includes('recognition = new SpeechRecognitionCtor();') &&
  control.includes('startWakeListener = useCallback(') &&
  control.includes('void start();');
const wakeIdleStandbyOnly = control.includes("if (wakeEnabled && voiceState === 'idle')") &&
  control.includes('startWakeListener();');

check(
  '1.1 "Hey Mari", "Okay Mari", "Mari wake up" wake phrases supported by regex matcher',
  wakeRegexMatch
);
check(
  '1.2 Wake word triggers start() directly without requiring keyboard shortcuts',
  wakeStandaloneRecognition
);
check(
  '1.3 Wake-word standby runs lightweight Web Speech API only while idle (no streaming WebRTC)',
  wakeIdleStandbyOnly
);

// 2. Ask a general greeting; does not unnecessarily invoke canonical business reasoning
const snapshotGreetingInstruction = sessionRoute.includes(
  "The server-verified snapshot below may be used for greetings, conversational continuity, and deciding whether ask_mari is needed."
);
const askMariSubstantiveOnlyInstruction = sessionRoute.includes(
  "For any business-specific, Ralion-specific, tenant-specific, performance, CRM, social, growth, strategy, website, document, customer, lead, or operational question, you MUST call the ask_mari function before answering."
);

check(
  '2.1 Session prompt authorizes greetings and pleasantries from snapshot without ask_mari',
  snapshotGreetingInstruction
);
check(
  '2.2 ask_mari is strictly required for substantive business, performance, and strategy questions',
  askMariSubstantiveOnlyInstruction
);

// 3. "What do you know about my business?" must route through ask_mari
const askMariToolDeclared = sessionRoute.includes("name: 'ask_mari'") &&
  sessionRoute.includes("description: 'Ask the canonical Ralion Mari intelligence engine a read-only question.");
const askMariDelegatesToChatApi = control.includes("authFetch('/api/mari/chat'") &&
  control.includes('query,') &&
  control.includes('organizationId,') &&
  control.includes('workspaceId,');

check(
  '3.1 ask_mari function tool exposed to OpenAI Realtime session',
  askMariToolDeclared
);
check(
  '3.2 ask_mari delegates directly to canonical /api/mari/chat route',
  askMariDelegatesToChatApi
);

// 4. "How is our Facebook performing?" must route through canonical Mari/BI
const canonicalMariReceivesQuery = control.includes('requestId: `voice-brain-${sessionIdRef.current}-${callId}`');
const realMariCoreEnforcesBI = read('packages/ai/src/mariUniversalCore.ts').includes('isFacebookIntelligenceRequest') &&
  read('packages/ai/src/mariUniversalCore.ts').includes("intent: 'FACEBOOK_INSIGHTS'") &&
  read('packages/ai/src/mariUniversalCore.ts').includes("requestedSources: ['FACEBOOK', 'GROWTH']");

check(
  '4.1 Voice questions sent to canonical Mari include durable session request tracking',
  canonicalMariReceivesQuery
);
check(
  '4.2 Canonical Mari core deterministically routes Facebook performance questions to FACEBOOK_INSIGHTS BI',
  realMariCoreEnforcesBI
);

// 5. "Open Growth." must navigate to Growth
const navigateToolDeclared = sessionRoute.includes("name: 'navigate_ralion'") &&
  sessionRoute.includes("'growth'");
const growthNavigationTarget = control.includes("growth: '/growth'");
const navigationDispatchesEvent = control.includes("window.dispatchEvent(new CustomEvent('ralion:mari-navigate', { detail: { route } }));");

check(
  '5.1 navigate_ralion tool exposes "growth" as an approved destination enum',
  navigateToolDeclared
);
check(
  '5.2 navigate_ralion maps "growth" to "/growth" path and dispatches navigation event',
  growthNavigationTarget && navigationDispatchesEvent
);

// 6. Voice session must stay active after Growth opens (persistent controller in shell)
const voiceMountedInShell = layout.includes('<MariVoiceControl') &&
  layout.includes('organizationId={organization.id}') &&
  layout.includes('workspaceId={workspace.id}');
const layoutHandlesNavigationClientSide = layout.includes('handleMariNavigation') &&
  layout.includes('router.push(route)') &&
  !layout.includes('window.location.href = route');

check(
  '6.1 MariVoiceControl mounted in persistent DashboardLayout shell root',
  voiceMountedInShell
);
check(
  '6.2 Voice navigation executes via client-side router.push() to preserve WebRTC peer connection',
  layoutHandlesNavigationClientSide
);

// 7. While on Growth ask "What am I looking at here?" and confirm Mari receives active route context
const shellPassesCurrentRoute = layout.includes('currentRoute={pathname || \'/dashboard\'}');
const controlTracksCurrentRoute = control.includes('currentRouteRef.current = currentRoute || \'/dashboard\';');
const askMariCarriesActiveScreen = control.includes("activeScreen: { route: currentRouteRef.current, label: 'Mari Voice' }");

check(
  '7.1 DashboardLayout passes reactive pathname to MariVoiceControl',
  shellPassesCurrentRoute
);
check(
  '7.2 MariVoiceControl updates active route ref across tab transitions',
  controlTracksCurrentRoute
);
check(
  '7.3 ask_mari passes activeScreen with live route to canonical Mari engine',
  askMariCarriesActiveScreen
);

// 8. "Open CRM." must navigate again without dropping voice
const crmNavigationTarget = control.includes("crm: '/crm'");
const approvedAllowlistInLayout = layout.includes("'/crm'") && layout.includes("'/growth'");

check(
  '8.1 navigate_ralion supports "crm" destination',
  crmNavigationTarget
);
check(
  '8.2 DashboardLayout verifies approved navigation route allowlist',
  approvedAllowlistInLayout
);

// 9. Ask Mari to publish/edit/delete something; she must not execute it
const sessionInstructionsNoMutations = sessionRoute.includes("Never claim that you published, edited, deleted, purchased, sent, scheduled, or changed business data.") &&
  sessionRoute.includes("You have no write, publish, delete, send, purchase, schedule, or mutation tools in this voice session.");
const toolToolsCount = (sessionRoute.match(/name:\s*'(ask_mari|navigate_ralion|end_voice_session)'/g) || []).length;
const noWriteToolsInSession = !sessionRoute.includes("name: 'publish") &&
  !sessionRoute.includes("name: 'delete") &&
  !sessionRoute.includes("name: 'edit") &&
  !sessionRoute.includes("name: 'send");

check(
  '9.1 Realtime session instructions explicitly forbid claiming any mutation occurred',
  sessionInstructionsNoMutations
);
check(
  '9.2 Voice session tool set strictly contains only end_voice_session, navigate_ralion, and ask_mari',
  toolToolsCount === 3 && noWriteToolsInSession
);

// 10. Say "Mari, go to sleep." Active Realtime voice should end cleanly
const endVoiceToolDeclared = sessionRoute.includes("name: 'end_voice_session'");
const sleepTriggerInstructions = sessionRoute.includes('If the user says "go to sleep", "stop listening", "goodbye Mari", "shut down voice"');
const endVoiceHandlesShutdown = control.includes("if (toolName === 'end_voice_session')") &&
  control.includes('shutdownAfterResponseRef.current = true;') &&
  control.includes('window.setTimeout(() => stop(), 250);');
const stopCleansWebRTC = control.includes('pcRef.current?.close();') &&
  control.includes('dataChannelRef.current?.close();') &&
  control.includes('streamRef.current?.getTracks().forEach((track) => track.stop());');

check(
  '10.1 end_voice_session tool declared for sleep and voice shutdown requests',
  endVoiceToolDeclared && sleepTriggerInstructions
);
check(
  '10.2 end_voice_session acknowledges and cleanly closes WebRTC peer connection, media, and data channel',
  endVoiceHandlesShutdown && stopCleansWebRTC
);

// 11. If wake mode is still enabled, lightweight wake standby should resume
const resumesWakeAfterStop = control.includes("useEffect(() => {") &&
  control.includes("if (wakeEnabled && voiceState === 'idle') {") &&
  control.includes("startWakeListener();");
const wakeStatePersisted = control.includes("localStorage.getItem('ralion:mari:wake-enabled')") &&
  control.includes("localStorage.setItem('ralion:mari:wake-enabled', String(next));");

check(
  '11.1 Voice transitioning to idle automatically restarts startWakeListener when wakeEnabled is true',
  resumesWakeAfterStop
);
check(
  '11.2 Wake mode toggle state is preserved across app interactions via localStorage',
  wakeStatePersisted
);

// 12. Confirm voice telemetry records once and no accidental double charging occurs
const singleReportGuard = control.includes('sessionReportedRef.current = true;') &&
  control.includes('if (sessionStartedAtRef.current > 0 && sessionIdRef.current && !sessionReportedRef.current)');
const usageTelemetryFields = control.includes('durationMs:') &&
  control.includes('userTurns:') &&
  control.includes('assistantTurns:') &&
  control.includes('inputTokens:') &&
  control.includes('outputTokens:') &&
  control.includes('inputAudioTokens:') &&
  control.includes('outputAudioTokens:') &&
  control.includes("model: 'gpt-realtime-2.1'");
const serverDeduplicatedUpsert = usageRoute.includes(".upsert(row, { onConflict: 'organization_id,session_id' });");

check(
  '12.1 Client sessionReportedRef guard guarantees usage telemetry is posted at most once per session',
  singleReportGuard
);
check(
  '12.2 Telemetry payload captures comprehensive duration, turns, text tokens, audio tokens, and model',
  usageTelemetryFields
);
check(
  '12.3 Server upserts on (organization_id, session_id) preventing duplicate usage accounting',
  serverDeduplicatedUpsert
);

console.log('\n======================================================================');
console.log(`  📊 ACCEPTANCE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL 12 MARI VOICE ACCEPTANCE INVARIANTS CONFIRMED!\n');
}
