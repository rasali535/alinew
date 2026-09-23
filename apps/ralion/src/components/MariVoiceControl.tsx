'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Mic, MicOff, Volume2 } from 'lucide-react';
import { authFetch } from '@/lib/api-config';

type VoiceState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error';

interface MariVoiceControlProps {
  organizationId: string;
  workspaceId: string;
  disabled?: boolean;
  onUserTurn?: () => void;
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
  onUserTurn,
  onMariTranscript,
}: MariVoiceControlProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const userTurnOpenRef = useRef(false);

  const stop = useCallback(() => {
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
    setVoiceState('idle');
  }, []);

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

      dc.onopen = () => setVoiceState('listening');
      dc.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'input_audio_buffer.speech_started') {
            if (!userTurnOpenRef.current) {
              userTurnOpenRef.current = true;
              onUserTurn?.();
            }
            setVoiceState('listening');
          } else if (data.type === 'input_audio_buffer.speech_stopped') {
            userTurnOpenRef.current = false;
            setVoiceState('thinking');
          } else if (data.type === 'response.created') {
            setVoiceState('thinking');
          } else if (
            data.type === 'response.output_audio.delta' ||
            data.type === 'response.output_audio_transcript.delta'
          ) {
            setVoiceState('speaking');
          } else if (data.type === 'response.output_audio_transcript.done') {
            const transcript = String(data.transcript || '').trim();
            if (transcript) onMariTranscript?.(transcript);
          } else if (data.type === 'response.done') {
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
          'Content-Type': 'application/sdp',
          'x-organization-id': organizationId,
          'x-workspace-id': workspaceId,
        },
        body: localSdp,
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
  }, [disabled, onMariTranscript, onUserTurn, organizationId, stop, workspaceId]);

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
