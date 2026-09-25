'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Mic, MicOff, Volume2 } from 'lucide-react';
import { authFetch } from '@/lib/api-config';

type VoiceState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error';

interface MariVoiceControlProps {
  organizationId: string;
  workspaceId: string;
  disabled?: boolean;
  activationSignal?: number;
  currentRoute?: string;
  recentConversation?: Array<{ sender: 'USER' | 'MARI'; text: string }>;
  onUserTranscript?: (transcript: string) => void;
  onMariTranscript?: (transcript: string) => void;
}

async function waitForIceGatheringComplete(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') return;
  await new Promise<void>((resolve) => {
    const onStateChange = () => {
      if (pc.iceGatheringState === 'complete') {
        pc.removeEventListener('icegatheringstatechange', onStateChange);
        resolve();
      }
    };
    pc.addEventListener('icegatheringstatechange', onStateChange);
    setTimeout(() => {
      pc.removeEventListener('icegatheringstatechange', onStateChange);
      resolve();
    }, 3000);
  });
}

export function MariVoiceControl({
  organizationId,
  workspaceId,
  disabled = false,
  activationSignal = 0,
  currentRoute = '/mari-ai',
  recentConversation = [],
  onUserTranscript,
  onMariTranscript,
}: MariVoiceControlProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [wakeEnabled, setWakeEnabled] = useState(true);
  const [wakeSupported, setWakeSupported] = useState(true);
  const [wakePermissionReady, setWakePermissionReady] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const userTurnOpenRef = useRef(false);
  const inputTranscriptByItemRef = useRef<Map<string, string>>(new Map());
  const sessionConversationRef = useRef<Array<{ sender: 'USER' | 'MARI'; text: string }>>([]);
  const currentRouteRef = useRef(currentRoute);
  const voiceStateRef = useRef<VoiceState>('idle');
  const wakeEnabledRef = useRef(true);
  const wakeRecognitionRef = useRef<any>(null);
  const wakeRestartTimerRef = useRef<number | null>(null);
  const wakeFallbackRecorderRef = useRef<MediaRecorder | null>(null);
  const wakeFallbackStreamRef = useRef<MediaStream | null>(null);
  const wakeFallbackActiveRef = useRef(false);
  const wakeFallbackRequestInFlightRef = useRef(false);
  const shutdownAfterResponseRef = useRef(false);
  const pendingNavigationRef = useRef<{ route: string; destination: string } | null>(null);
  const sessionIdRef = useRef('');
  const sessionStartedAtRef = useRef(0);
  const sessionReportedRef = useRef(false);
  const usageRef = useRef({
    userTurns: 0,
    assistantTurns: 0,
    inputTokens: 0,
    outputTokens: 0,
    inputAudioTokens: 0,
    outputAudioTokens: 0,
  });

  const stop = useCallback(() => {
    const endedAtMs = Date.now();
    if (sessionStartedAtRef.current > 0 && sessionIdRef.current && !sessionReportedRef.current) {
      sessionReportedRef.current = true;
      const usage = usageRef.current;
      void authFetch('/api/mari/voice/usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organizationId,
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          startedAtMs: sessionStartedAtRef.current,
          endedAtMs,
          durationMs: Math.max(0, endedAtMs - sessionStartedAtRef.current),
          ...usage,
          model: 'gpt-realtime-2.1',
        }),
      }).catch(() => {
        // Usage telemetry is best-effort and must never block voice shutdown.
      });
    }

    dataChannelRef.current?.close();
    dataChannelRef.current = null;
    pcRef.current?.getSenders().forEach((sender) => {
      try { sender.track?.stop(); } catch {}
    });
    pcRef.current?.close();
    pcRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }
    userTurnOpenRef.current = false;
    inputTranscriptByItemRef.current.clear();
    sessionConversationRef.current = [];
    sessionStartedAtRef.current = 0;
    shutdownAfterResponseRef.current = false;
    pendingNavigationRef.current = null;
    setVoiceState('idle');
  }, [organizationId, workspaceId]);

  useEffect(() => stop, [stop]);

  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  useEffect(() => {
    wakeEnabledRef.current = wakeEnabled;
  }, [wakeEnabled]);

  useEffect(() => {
    currentRouteRef.current = currentRoute || '/dashboard';
  }, [currentRoute]);

  const start = useCallback(async () => {
    if (disabled || !organizationId || !workspaceId) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === 'undefined') {
      setErrorMessage('Voice requires a modern browser with microphone and WebRTC support.');
      setVoiceState('error');
      return;
    }

    setErrorMessage('');
    setVoiceState('connecting');
    sessionIdRef.current =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `mari-voice-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionReportedRef.current = false;
    sessionConversationRef.current = [];
    usageRef.current = {
      userTurns: 0,
      assistantTurns: 0,
      inputTokens: 0,
      outputTokens: 0,
      inputAudioTokens: 0,
      outputAudioTokens: 0,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const remoteAudio = document.createElement('audio');
      remoteAudio.autoplay = true;
      remoteAudio.setAttribute('playsinline', 'true');
      audioRef.current = remoteAudio;

      pc.ontrack = (event) => {
        remoteAudio.srcObject = event.streams[0];
        remoteAudio.play().catch(() => {});
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setErrorMessage('Mari Voice connection was interrupted.');
          setVoiceState('error');
        }
        if (pc.connectionState === 'closed') setVoiceState('idle');
      };

      stream.getAudioTracks().forEach((track) => pc.addTrack(track, stream));

      const dc = pc.createDataChannel('oai-events');
      dataChannelRef.current = dc;

      dc.onopen = () => {
        sessionStartedAtRef.current = Date.now();
        setVoiceState('listening');
      };
      const approvedNavigationRoutes: Record<string, string> = {
        dashboard: '/dashboard',
        crm: '/crm',
        customers: '/customers',
        leads: '/leads',
        growth: '/growth',
        creatives: '/creatives',
        calendar: '/calendar',
        tasks: '/tasks',
        documents: '/documents',
        workflows: '/workflows',
        reports: '/reports',
        billing: '/billing',
        marketplace: '/marketplace',
        settings: '/settings',
        workspace: '/workspace',
        'mari-ai': '/mari-ai',
      };

      const runVoiceTool = async (functionCall: any): Promise<'navigation' | 'reasoning' | 'shutdown' | 'ignored'> => {
        const callId = String(functionCall?.call_id || '').trim();
        const toolName = String(functionCall?.name || '').trim();
        if (!callId) return 'ignored';

        if (toolName === 'end_voice_session') {
          shutdownAfterResponseRef.current = true;
          dc.send(JSON.stringify({
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: callId,
              output: JSON.stringify({
                success: true,
                message: 'Voice session will end after a brief acknowledgement.',
              }),
            },
          }));
          return 'shutdown';
        }

        if (toolName === 'navigate_ralion') {
          let destination = '';
          try {
            const args = JSON.parse(String(functionCall?.arguments || '{}'));
            destination = String(args?.destination || '').trim().toLowerCase();
          } catch {}

          const route = approvedNavigationRoutes[destination];
          const output = route
            ? { success: true, destination, route, message: `Opening ${destination} in Ralion OS.` }
            : { success: false, error: 'That destination is not an approved Ralion navigation target.' };

          dc.send(JSON.stringify({
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: callId,
              output: JSON.stringify(output),
            },
          }));

          if (route) {
            // Queue navigation and let Mari finish the spoken acknowledgement
            // first. The persistent dashboard layout keeps the WebRTC session
            // mounted while router.push changes the child route.
            pendingNavigationRef.current = { route, destination };
          }
          return 'navigation';
        }

        if (toolName !== 'ask_mari') return 'ignored';

        let query = '';
        try {
          const args = JSON.parse(String(functionCall?.arguments || '{}'));
          query = String(args?.query || '').trim();
        } catch {}

        if (!query) {
          dc.send(JSON.stringify({
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: callId,
              output: JSON.stringify({ success: false, error: 'Mari did not receive a usable question.' }),
            },
          }));
          return 'reasoning';
        }

        setVoiceState('thinking');

        try {
          const history = [
            ...recentConversation,
            ...sessionConversationRef.current,
          ].slice(-12);

          const mariResponse = await authFetch('/api/mari/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-organization-id': organizationId,
              'x-workspace-id': workspaceId,
            },
            body: JSON.stringify({
              query,
              organizationId,
              workspaceId,
              messages: history,
              activeScreen: { route: currentRouteRef.current, label: 'Mari Voice' },
              requestId: `voice-brain-${sessionIdRef.current}-${callId}`,
            }),
          });

          const payload = await mariResponse.json().catch(() => null);
          const answer = String(payload?.answer || '').trim();

          dc.send(JSON.stringify({
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: callId,
              output: JSON.stringify(
                mariResponse.ok && answer
                  ? { success: true, answer }
                  : {
                      success: false,
                      error: payload?.error || payload?.message || 'Canonical Mari could not complete that request.',
                    }
              ),
            },
          }));
        } catch (toolError: any) {
          dc.send(JSON.stringify({
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: callId,
              output: JSON.stringify({
                success: false,
                error: toolError?.message || 'Canonical Mari is temporarily unavailable.',
              }),
            },
          }));
        }
        return 'reasoning';
      };

      dc.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'input_audio_buffer.speech_started') {
            userTurnOpenRef.current = true;
            setVoiceState('listening');
          } else if (data.type === 'input_audio_buffer.speech_stopped') {
            userTurnOpenRef.current = false;
            setVoiceState('thinking');
          } else if (
            data.type === 'conversation.item.input_audio_transcription.delta' ||
            data.type === 'session.input_transcript.delta'
          ) {
            const itemId = String(data.item_id || 'live-turn');
            const current = inputTranscriptByItemRef.current.get(itemId) || '';
            inputTranscriptByItemRef.current.set(itemId, current + String(data.delta || ''));
          } else if (data.type === 'conversation.item.input_audio_transcription.completed') {
            const itemId = String(data.item_id || 'live-turn');
            const transcript = String(
              data.transcript || inputTranscriptByItemRef.current.get(itemId) || ''
            ).trim();
            inputTranscriptByItemRef.current.delete(itemId);
            if (transcript) {
              usageRef.current.userTurns += 1;
              sessionConversationRef.current.push({ sender: 'USER', text: transcript });
              onUserTranscript?.(transcript);
            }
          } else if (data.type === 'response.created') {
            setVoiceState('thinking');
          } else if (
            data.type === 'response.output_audio.delta' ||
            data.type === 'response.output_audio_transcript.delta'
          ) {
            setVoiceState('speaking');
          } else if (data.type === 'response.output_audio_transcript.done') {
            const transcript = String(data.transcript || '').trim();
            if (transcript) {
              usageRef.current.assistantTurns += 1;
              sessionConversationRef.current.push({ sender: 'MARI', text: transcript });
              onMariTranscript?.(transcript);
            }
          } else if (data.type === 'response.done') {
            const usage = data.response?.usage || {};
            usageRef.current.inputTokens += Number(usage.input_tokens || 0);
            usageRef.current.outputTokens += Number(usage.output_tokens || 0);
            usageRef.current.inputAudioTokens += Number(usage.input_token_details?.audio_tokens || 0);
            usageRef.current.outputAudioTokens += Number(usage.output_token_details?.audio_tokens || 0);

            const functionCalls = Array.isArray(data.response?.output)
              ? data.response.output.filter((item: any) => item?.type === 'function_call')
              : [];

            if (functionCalls.length > 0) {
              setVoiceState('thinking');
              let shouldContinueResponse = false;
              for (const functionCall of functionCalls) {
                const outcome = await runVoiceTool(functionCall);
                if (outcome === 'reasoning' || outcome === 'navigation' || outcome === 'shutdown') shouldContinueResponse = true;
              }
              if (shouldContinueResponse) {
                dc.send(JSON.stringify({ type: 'response.create' }));
              }
            } else if (shutdownAfterResponseRef.current) {
              shutdownAfterResponseRef.current = false;
              pendingNavigationRef.current = null;
              window.setTimeout(() => stop(), 250);
            } else if (pendingNavigationRef.current) {
              const pendingNavigation = pendingNavigationRef.current;
              pendingNavigationRef.current = null;
              setVoiceState('listening');

              // response.done means the acknowledgement has finished. Give the
              // audio track a short drain window, then navigate inside the same
              // persistent dashboard layout without ending this WebRTC session.
              window.setTimeout(() => {
                window.dispatchEvent(new CustomEvent('ralion:mari-navigate', {
                  detail: {
                    route: pendingNavigation.route,
                    destination: pendingNavigation.destination,
                  },
                }));
              }, 450);
            } else {
              setVoiceState('listening');
            }
          } else if (data.type === 'error') {
            setErrorMessage(data.error?.message || 'Mari Voice encountered an error.');
            setVoiceState('error');
          }
        } catch {
          // Ignore non-JSON channel messages.
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIceGatheringComplete(pc);

      const localSdp = pc.localDescription?.sdp;
      if (!localSdp) throw new Error('Unable to create a WebRTC offer.');

      const response = await authFetch('/api/mari/voice/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organizationId,
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({
          sdp: localSdp,
          recentConversation: recentConversation.slice(-12),
        }),
      });

      if (!response.ok) {
        let message = 'Unable to start Mari Voice.';
        try {
          const payload = await response.json();
          message = payload?.error || payload?.message || message;
        } catch {}
        throw new Error(message);
      }

      const answerSdp = await response.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
      setVoiceState('listening');
    } catch (error: any) {
      stop();
      setErrorMessage(error?.message || 'Unable to start Mari Voice.');
      setVoiceState('error');
    }
  }, [disabled, onMariTranscript, onUserTranscript, organizationId, recentConversation, stop, workspaceId]);

  useEffect(() => {
    let enabled = true;
    let cancelled = false;

    try {
      const stored = localStorage.getItem('ralion:mari:wake-enabled');
      enabled = stored === null ? true : stored === 'true';
      if (stored === null) {
        localStorage.setItem('ralion:mari:wake-enabled', 'true');
      }
    } catch {}

    wakeEnabledRef.current = enabled;
    setWakeEnabled(enabled);

    if (!enabled) {
      setWakePermissionReady(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setWakeSupported(false);
      setWakePermissionReady(false);
      return;
    }

    // IMPORTANT: do not start SpeechRecognition until microphone permission has
    // actually resolved. Starting recognition in parallel with getUserMedia can
    // produce a permanent "not-allowed" race on Chromium/Electron until the user
    // clicks the mic button. The temporary stream is released immediately.
    void navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        stream.getTracks().forEach((track) => track.stop());
        if (!cancelled) {
          setWakeSupported(true);
          setWakePermissionReady(true);
        }
      })
      .catch((error: any) => {
        if (!cancelled) {
          setWakePermissionReady(false);
          if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
            setErrorMessage('Microphone permission is required for hands-free "Hey Mari".');
          }
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const stopWakeListener = useCallback(() => {
    if (wakeRestartTimerRef.current) {
      window.clearTimeout(wakeRestartTimerRef.current);
      wakeRestartTimerRef.current = null;
    }
    const recognition = wakeRecognitionRef.current;
    wakeRecognitionRef.current = null;
    if (recognition) {
      try {
        recognition.onend = null;
        recognition.onerror = null;
        recognition.onresult = null;
        recognition.stop();
      } catch {}
    }

    wakeFallbackActiveRef.current = false;
    const recorder = wakeFallbackRecorderRef.current;
    wakeFallbackRecorderRef.current = null;
    if (recorder && recorder.state !== 'inactive') {
      try { recorder.stop(); } catch {}
    }
    wakeFallbackStreamRef.current?.getTracks().forEach((track) => {
      try { track.stop(); } catch {}
    });
    wakeFallbackStreamRef.current = null;
  }, []);

  const startServerWakeFallback = useCallback(async () => {
    if (
      !wakeEnabledRef.current ||
      disabled ||
      voiceStateRef.current !== 'idle' ||
      wakeFallbackActiveRef.current ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (!wakeEnabledRef.current || voiceStateRef.current !== 'idle') {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      wakeFallbackStreamRef.current = stream;
      wakeFallbackActiveRef.current = true;

      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
      ];
      const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      wakeFallbackRecorderRef.current = recorder;

      recorder.ondataavailable = async (event: BlobEvent) => {
        if (
          !wakeFallbackActiveRef.current ||
          !wakeEnabledRef.current ||
          voiceStateRef.current !== 'idle' ||
          wakeFallbackRequestInFlightRef.current ||
          !event.data ||
          event.data.size < 256
        ) return;

        wakeFallbackRequestInFlightRef.current = true;
        try {
          const form = new FormData();
          const extension = recorder.mimeType.includes('ogg') ? 'ogg' : 'webm';
          form.append('audio', event.data, `wake.${extension}`);

          const response = await authFetch('/api/mari/voice/wake', {
            method: 'POST',
            headers: {
              'x-organization-id': organizationId,
              'x-workspace-id': workspaceId,
            },
            body: form,
          });

          const payload = await response.json().catch(() => ({}));
          if (response.ok && payload?.wake === true && voiceStateRef.current === 'idle') {
            stopWakeListener();
            void start();
          }
        } catch (error) {
          console.warn('[Mari Wake] Server wake fallback notice:', error);
        } finally {
          wakeFallbackRequestInFlightRef.current = false;
        }
      };

      recorder.onerror = () => {
        wakeFallbackActiveRef.current = false;
      };

      recorder.onstop = () => {
        wakeFallbackActiveRef.current = false;
      };

      // Small, continuous chunks keep standby cheap and responsive while
      // avoiding a full OpenAI Realtime session before the wake phrase.
      recorder.start(3000);
    } catch (error) {
      console.warn('[Mari Wake] Unable to start server wake fallback:', error);
    }
  }, [disabled, organizationId, start, stopWakeListener, workspaceId]);

  const startWakeListener = useCallback(() => {
    if (!wakeEnabledRef.current || disabled || voiceStateRef.current !== 'idle') return;
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setWakeSupported(true);
      void startServerWakeFallback();
      return;
    }

    setWakeSupported(true);
    stopWakeListener();

    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let heard = '';
        for (let i = event.resultIndex || 0; i < event.results.length; i += 1) {
          heard += ' ' + String(event.results[i]?.[0]?.transcript || '');
        }
        const normalized = heard.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
        if (/\b(?:hey|okay|ok) mari\b|\bmari wake up\b/.test(normalized)) {
          try { recognition.stop(); } catch {}
          wakeRecognitionRef.current = null;
          void start();
        }
      };

      recognition.onerror = (event: any) => {
        const code = String(event?.error || '');
        if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'network') {
          // Chromium/Electron Web Speech may be unavailable even when microphone
          // access is granted. Fall back to lightweight server transcription
          // instead of requiring the user to click the mic button.
          try { recognition.stop(); } catch {}
          wakeRecognitionRef.current = null;
          void startServerWakeFallback();
          return;
        }

        // Transient recognition failures should not permanently disable wake mode.
        // onend will re-arm the listener while wake mode remains enabled.
        if (code && code !== 'no-speech' && code !== 'aborted') {
          console.warn('[Mari Wake] Speech recognition notice:', code);
        }
      };

      recognition.onend = () => {
        wakeRecognitionRef.current = null;
        if (wakeEnabledRef.current && voiceStateRef.current === 'idle') {
          wakeRestartTimerRef.current = window.setTimeout(() => startWakeListener(), 900);
        }
      };

      wakeRecognitionRef.current = recognition;
      recognition.start();
    } catch {
      setWakeSupported(false);
    }
  }, [disabled, start, startServerWakeFallback, stopWakeListener]);

  useEffect(() => {
    if (wakeEnabled && wakePermissionReady && voiceState === 'idle') {
      startWakeListener();
    } else {
      stopWakeListener();
    }
    return () => stopWakeListener();
  }, [startWakeListener, stopWakeListener, voiceState, wakeEnabled, wakePermissionReady]);

  const toggleWakeMode = () => {
    const next = !wakeEnabled;
    setWakeEnabled(next);
    wakeEnabledRef.current = next;
    try {
      localStorage.setItem('ralion:mari:wake-enabled', String(next));
    } catch {}
    if (!next) {
      setWakePermissionReady(false);
      stopWakeListener();
      return;
    }

    if (navigator.mediaDevices?.getUserMedia) {
      void navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          stream.getTracks().forEach((track) => track.stop());
          setWakeSupported(true);
          setWakePermissionReady(true);
        })
        .catch(() => setWakePermissionReady(false));
    }
  };

  const lastActivationSignalRef = useRef(activationSignal);
  useEffect(() => {
    if (!activationSignal || activationSignal === lastActivationSignalRef.current) return;
    lastActivationSignalRef.current = activationSignal;
    if (voiceState !== 'idle' && voiceState !== 'error') {
      stop();
    } else {
      void start();
    }
  }, [activationSignal, start, stop, voiceState]);

  const active = voiceState !== 'idle' && voiceState !== 'error';
  const label =
    voiceState === 'connecting' ? 'Connecting Mari Voice' :
    voiceState === 'listening' ? 'Mari is listening' :
    voiceState === 'thinking' ? 'Mari is thinking' :
    voiceState === 'speaking' ? 'Mari is speaking' :
    voiceState === 'error' ? (errorMessage || 'Mari Voice error') :
    'Talk to Mari';

  let buttonClass = 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white hover:border-purple-500';
  if (voiceState === 'speaking') buttonClass = 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300';
  else if (voiceState === 'listening') buttonClass = 'bg-purple-600/20 border-purple-500/50 text-purple-300';
  else if (voiceState === 'thinking' || voiceState === 'connecting') buttonClass = 'bg-blue-600/20 border-blue-500/50 text-blue-300';
  else if (voiceState === 'error') buttonClass = 'bg-red-600/20 border-red-500/50 text-red-300';

  return (
    <div className="relative flex items-center gap-1">
      <button
        type="button"
        onClick={toggleWakeMode}
        disabled={disabled}
        title={
          wakeEnabled
            ? 'Disable "Hey Mari" wake mode'
            : wakeSupported
              ? 'Enable "Hey Mari" wake mode'
              : 'Wake phrase is unavailable in this runtime'
        }
        aria-pressed={wakeEnabled}
        className={
          'px-2 py-1.5 rounded-lg border text-[10px] font-semibold transition-all disabled:opacity-40 ' +
          (wakeEnabled
            ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
            : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white hover:border-purple-500')
        }
      >
        {wakeEnabled ? 'Hey Mari ✓' : 'Hey Mari'}
      </button>
      <button
        type="button"
        onClick={active ? stop : start}
        disabled={disabled || voiceState === 'connecting'}
        title={label}
        aria-label={active ? 'Stop Mari Voice' : 'Talk to Mari'}
        className={'p-2 rounded-lg border transition-all disabled:opacity-40 ' + buttonClass}
      >
        {voiceState === 'connecting' || voiceState === 'thinking' ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : voiceState === 'speaking' ? (
          <Volume2 className="w-3.5 h-3.5" />
        ) : active ? (
          <MicOff className="w-3.5 h-3.5" />
        ) : (
          <Mic className="w-3.5 h-3.5" />
        )}
      </button>
      {voiceState === 'error' && errorMessage ? (
        <div className="absolute bottom-full right-0 mb-2 w-64 rounded-lg border border-red-500/30 bg-zinc-950 px-3 py-2 text-[10px] text-red-300 shadow-xl">
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
}
