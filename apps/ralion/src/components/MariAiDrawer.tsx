'use client';

import React, { useState } from 'react';
import { X, Send, Sparkles, Bot, FileText, Zap, CornerDownLeft } from 'lucide-react';
import { processMariQuery, generateMarketingCampaign } from '@ralion/ai';
import { Button, Badge } from '@ralion/ui';

export interface MariAiDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (route: string) => void;
}

export const MariAiDrawer: React.FC<MariAiDrawerProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const [messages, setMessages] = useState<Array<{ sender: 'USER' | 'MARI'; text: string; actions?: any[]; tokens?: { totalTokens?: number } }>>([
    {
      sender: 'MARI',
      text: "Hello! I am Mari AI, your enterprise business assistant by Ras Ali Labs. Ask me anything about your revenue, tasks, active deals, or tell me to generate marketing content!"
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleSend = () => {
    if (!inputQuery.trim()) return;

    const userText = inputQuery;
    setMessages(prev => [...prev, { sender: 'USER', text: userText }]);
    setInputQuery('');
    setIsProcessing(true);

    const fetchResponse = async () => {
      try {
        const { callMariAiApi, processMariQuery, BusinessContextService } = await import('@ralion/ai');
        let context = null;
        try {
          context = await BusinessContextService.assembleContext();
        } catch {}

        // Let's try the real API first
        const apiResponse = await callMariAiApi(userText, undefined, context || undefined);
        
        if (apiResponse) {
          const respText = typeof apiResponse === 'string' ? apiResponse : apiResponse.text;
          const tokens = (typeof apiResponse === 'object' && apiResponse.tokens) ? apiResponse.tokens : undefined;
          setMessages(prev => [
            ...prev,
            {
              sender: 'MARI',
              text: respText,
              actions: [],
              tokens,
            }
          ]);
        } else {
          // Fallback to local rules
          const response = processMariQuery(userText);
          setMessages(prev => [
            ...prev,
            {
              sender: 'MARI',
              text: response.answer,
              actions: response.suggestedActions
            }
          ]);
        }
      } catch (err) {
        setMessages(prev => [...prev, { sender: 'MARI', text: "I'm having trouble connecting to my neural core right now." }]);
      } finally {
        setIsProcessing(false);
      }
    };
    
    fetchResponse();
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[450px] bg-zinc-950/95 backdrop-blur-2xl border-l border-zinc-800/90 shadow-2xl z-50 flex flex-col justify-between animate-in slide-in-from-right duration-300">
      {/* Drawer Header */}
      <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/60">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/20">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              Mari AI Assistant
              <Badge variant="purple" className="text-[10px] font-mono">Ras Ali AI</Badge>
            </h2>
            <p className="text-[10px] text-zinc-400">Enterprise Intelligence & RAG Core</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex flex-col gap-2 ${msg.sender === 'USER' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                msg.sender === 'USER'
                  ? 'bg-blue-600 text-white font-medium rounded-tr-none shadow-md'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-none shadow-lg'
              }`}
            >
              {msg.sender === 'MARI' && (
                <div className="flex items-center justify-between gap-1.5 mb-1 text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1"><Bot className="w-3 h-3" /> Mari AI</span>
                  {msg.tokens?.totalTokens && (
                    <span className="text-[9px] text-zinc-500 font-mono font-normal normal-case">
                      {msg.tokens.totalTokens} tokens
                    </span>
                  )}
                </div>
              )}
              {(() => {
                const text = msg.text;
                const imgRegex = /!\[([^\]]*)\]\((.*?)\)/g;
                if (!text.includes('![')) {
                  return <p className="whitespace-pre-wrap">{text}</p>;
                }
                const parts = [];
                let lastIndex = 0;
                let match;
                while ((match = imgRegex.exec(text)) !== null) {
                  if (match.index > lastIndex) {
                    parts.push(<span key={lastIndex} className="whitespace-pre-wrap">{text.substring(lastIndex, match.index)}</span>);
                  }
                  parts.push(<img key={match.index} src={match[2]} alt={match[1]} className="w-full h-auto rounded-lg my-3 shadow-md border border-zinc-700" loading="lazy" />);
                  lastIndex = match.index + match[0].length;
                }
                if (lastIndex < text.length) {
                  parts.push(<span key={lastIndex} className="whitespace-pre-wrap">{text.substring(lastIndex)}</span>);
                }
                return <div>{parts}</div>;
              })()}
            </div>

            {/* Mari Creative Collaboration Action */}
            {msg.sender === 'MARI' && (
              <div className="flex flex-wrap gap-1.5 mt-1 max-w-[85%]">
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      const cleanPrompt = msg.text.replace(/!\[.*?\]\(.*?\)/g, '').substring(0, 300).trim();
                      localStorage.setItem('ralion_creative_prompt', cleanPrompt);
                    }
                    if (onNavigate) {
                      onNavigate('/growth?tab=creatives');
                    }
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-950/40 border border-purple-500/40 text-[11px] font-bold text-purple-300 hover:bg-purple-600/20 hover:border-purple-400 transition-all shadow-sm"
                >
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  Send Prompt to Creative Studio
                </button>
              </div>
            )}

            {/* Suggested Actions */}
            {msg.actions && msg.actions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1 max-w-[85%]">
                {msg.actions.map((act, aIdx) => (
                  <button
                    key={aIdx}
                    onClick={() => {
                      if (act.type === 'NAVIGATE' && onNavigate) {
                        onNavigate(act.payload.route);
                      }
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-blue-500/30 text-[11px] font-semibold text-blue-400 hover:bg-blue-600/10 hover:border-blue-400 transition-all shadow-sm"
                  >
                    <Zap className="w-3 h-3 text-blue-400" />
                    {act.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {isProcessing && (
          <div className="flex items-center gap-2 text-xs text-zinc-400 italic">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            Mari AI is calculating insights &amp; creative concepts...
          </div>
        )}
      </div>

      {/* Input Form & Quick Collaboration Pills */}
      <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/40 flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => {
              setInputQuery('Brainstorm 3 viral social media marketing poster concepts for our business');
            }}
            className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-300 hover:text-white shrink-0 transition-colors flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-purple-400" /> Creative Prompts
          </button>
          <button
            type="button"
            onClick={() => {
              setInputQuery('Draft a high-converting Facebook post with caption, image concept, and hashtags');
            }}
            className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-300 hover:text-white shrink-0 transition-colors flex items-center gap-1"
          >
            <Zap className="w-3 h-3 text-blue-400" /> Draft Social Post
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask Mari: 'Generate 3 poster concepts' or 'Draft ad'..."
            className="w-full pl-4 pr-12 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
          />
          <button
            onClick={handleSend}
            disabled={!inputQuery.trim()}
            className="absolute right-2 top-2 p-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
