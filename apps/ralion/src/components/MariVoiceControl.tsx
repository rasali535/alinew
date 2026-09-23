'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Mic, MicOff, Volume2 } from 'lucide-react';
import { authFetch } from '@/lib/api-config';

type VoiceState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error';

interface MariVoiceControlProps {
  organizationId: string;
  workspaceId: string;
  disabled?: boolean;
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
  recentConversation = [],
  onUserTranscript,
  onMariTranscript,
}: MariVoiceControlProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const userTurnOpenRef = useRef(false);
  const inputTranscriptByItemRef = useRef<Map<string, string>>(new Map());
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
    sessionStartedAtRef.current = 0;
    setVoiceState('idle');
  }, [organizationId, workspaceId]);

  useEffect(() => stop, [stop]);

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
      dc.onmessage = (event) => {
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
              onMariTranscript?.(transcript);
            }
          } else if (data.type === 'response.done') {
            const usage = data.response?.usage || {};
            usageRef.current.inputTokens += Number(usage.input_tokens || 0);
            usageRef.current.outputTokens += Number(usage.output_tokens || 0);
            usageRef.current.inputAudioTokens += Number(usage.input_token_details?.audio_tokens || 0);
            usageRef.current.outputAudioTokens += Number(usage.output_token_details?.audio_tokens || 0);
            setVoiceState('listening');
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
    <div className="relative flex items-center">
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
