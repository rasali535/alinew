'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, Bot, Loader2, Sparkles, X } from 'lucide-react';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type WidgetConfig = {
  sessionToken: string;
  assistantName: string;
  welcomeMessage: string;
  accentColor: string;
};

function safeAccent(value: string): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : '#7c3aed';
}

export default function MariWidgetPage() {
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const sessionToken = params.get('session') || '';
    const assistantName = (params.get('name') || 'Mari').slice(0, 40);
    const welcomeMessage = (params.get('welcome') || 'Hi! I’m Mari. How can I help?').slice(0, 240);
    const accentColor = safeAccent(params.get('accent') || '#7c3aed');

    if (!sessionToken.startsWith('mws_live_')) {
      setError('This Mari session is unavailable. Refresh the website to reconnect.');
      return;
    }

    setConfig({ sessionToken, assistantName, welcomeMessage, accentColor });
    setMessages([{ id: 'welcome', role: 'assistant', content: welcomeMessage }]);
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const accent = config?.accentColor || '#7c3aed';
  const assistantName = config?.assistantName || 'Mari';
  const canSend = useMemo(() => Boolean(config && input.trim() && !sending), [config, input, sending]);

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!canSend || !config) return;

    const text = input.trim().slice(0, 4000);
    const userMessage: ChatMessage = { id: `user_${Date.now()}`, role: 'user', content: text };
    const history = messages
      .filter((message) => message.id !== 'welcome')
      .slice(-8)
      .map(({ role, content }) => ({ role, content }));

    setMessages((current) => [...current, userMessage]);
    setInput('');
    setSending(true);
    setError(null);

    try {
      const basePath = window.location.pathname.startsWith('/ralion/') ? '/ralion' : '';
      const requestId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(36).slice(2)}`;

      const response = await fetch(`${basePath}/api/mari/widget/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.sessionToken}`,
          'X-Request-ID': requestId,
        },
        body: JSON.stringify({ message: text, history, requestId }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Mari could not answer that message.');

      setMessages((current) => [
        ...current,
        {
          id: payload.requestId || `assistant_${Date.now()}`,
          role: 'assistant',
          content: String(payload.answer || 'I’m sorry, I do not have an answer for that yet.'),
        },
      ]);
    } catch (sendError: any) {
      setError(sendError?.message || 'Mari is temporarily unavailable. Please try again.');
    } finally {
      setSending(false);
    }
  }

  function closeWidget() {
    window.parent.postMessage({ type: 'ralion:mari-widget:close' }, '*');
  }

  return (
    <main className="flex h-screen min-h-[420px] w-full flex-col overflow-hidden bg-[#08111f] text-white">
      <header className="flex items-center justify-between border-b border-white/10 bg-[#0c1627] px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-lg"
            style={{ background: `linear-gradient(135deg, ${accent}, #2563eb)` }}
          >
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold">{assistantName}</div>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Powered by Mari AI
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={closeWidget}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
          aria-label="Close assistant"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[88%] items-start gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {message.role === 'assistant' && (
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-purple-300">
                  <Bot className="h-3.5 w-3.5" />
                </div>
              )}
              <div
                className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px] leading-5 ${
                  message.role === 'user'
                    ? 'rounded-br-md text-white'
                    : 'rounded-bl-md border border-white/10 bg-white/[0.045] text-slate-200'
                }`}
                style={message.role === 'user' ? { background: accent } : undefined}
              >
                {message.content}
              </div>
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex items-start gap-2">
            <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-purple-300"><Bot className="h-3.5 w-3.5" /></div>
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.045] px-3.5 py-3 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
            </div>
          </div>
        )}

        {error && (
          <div className="mx-auto max-w-[92%] rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-center text-[11px] leading-4 text-amber-200">
            {error}
          </div>
        )}
      </div>

      <div className="border-t border-white/10 bg-[#0c1627] p-3">
        <form onSubmit={sendMessage} className="flex items-end gap-2 rounded-2xl border border-white/10 bg-black/20 p-2 focus-within:border-purple-400/40">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                if (canSend) void sendMessage(event as unknown as React.FormEvent);
              }
            }}
            placeholder={`Ask ${assistantName}…`}
            rows={1}
            maxLength={4000}
            className="max-h-28 min-h-[38px] flex-1 resize-none bg-transparent px-2 py-2 text-[13px] leading-5 text-white outline-none placeholder:text-slate-600"
          />
          <button
            type="submit"
            disabled={!canSend}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white transition disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: accent }}
            aria-label="Send message"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </form>
        <div className="mt-2 text-center text-[9px] text-slate-600">Mari can make mistakes. Verify important information with the business.</div>
      </div>
    </main>
  );
}
