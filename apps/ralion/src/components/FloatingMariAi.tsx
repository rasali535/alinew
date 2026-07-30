'use client';

import React, { useState } from 'react';
import { Sparkles, X, Send, Bot, User, ChevronUp } from 'lucide-react';
import { processMariQuery } from '@ralion/ai';

export const FloatingMariAi: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: 'USER' | 'MARI'; text: string }>>([
    { sender: 'MARI', text: 'Hello! I am Mari, your AI business assistant. How can I help your business today?' }
  ]);
  const [input, setInput] = useState('');

  const quickPrompts = [
    'Show my business performance',
    'Show customer growth',
    'Find overdue tasks',
    'Summarize activity'
  ];

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    setMessages(prev => [...prev, { sender: 'USER', text }]);
    setInput('');

    const fetchResponse = async () => {
      try {
        const { callMariAiApi, processMariQuery } = await import('@ralion/ai');
        
        // Let's try the real API first
        const apiResponse = await callMariAiApi(text);
        
        if (apiResponse) {
          setMessages(prev => [...prev, { sender: 'MARI', text: apiResponse }]);
        } else {
          // Fallback to local rules or quick answers
          if (text.toLowerCase().includes('business performance') || text.toLowerCase().includes('performance')) {
            const perfSummary = `Business Performance Summary\n\nCustomers:\n+18%\n\nTasks completed:\n92%\n\nRevenue:\n+12%\n\nRecommendation:\nFocus on following up with 5 inactive customers.`;
            setMessages(prev => [...prev, { sender: 'MARI', text: perfSummary }]);
          } else {
            const res = processMariQuery(text);
            setMessages(prev => [...prev, { sender: 'MARI', text: res.answer }]);
          }
        }
      } catch (err) {
        setMessages(prev => [...prev, { sender: 'MARI', text: "I'm having trouble connecting to my neural core right now." }]);
      }
    };
    
    fetchResponse();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white font-bold text-xs shadow-2xl shadow-purple-500/30 hover:scale-105 transition-all group border border-purple-400/40"
        >
          <Sparkles className="w-4 h-4 animate-pulse text-amber-300" />
          <span>Mari AI</span>
        </button>
      ) : (
        <div className="w-80 sm:w-96 h-[440px] bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl flex flex-col justify-between overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="p-3.5 border-b border-zinc-800 bg-gradient-to-r from-blue-950/60 to-purple-950/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Mari AI Assistant</h4>
                <span className="text-[10px] text-purple-300">Empowered to Prosper</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1 rounded text-zinc-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2.5 text-xs">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.sender === 'USER' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`p-3 rounded-xl max-w-[85%] leading-relaxed ${
                    m.sender === 'USER' ? 'bg-blue-600 text-white font-medium' : 'bg-zinc-800 border border-zinc-700/60 text-zinc-100'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-[11px]">{m.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Prompts & Input */}
          <div className="p-3 border-t border-zinc-800 bg-zinc-950/80 flex flex-col gap-2">
            <div className="flex gap-1 overflow-x-auto pb-1">
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(qp)}
                  className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-400 hover:text-white whitespace-nowrap"
                >
                  {qp}
                </button>
              ))}
            </div>

            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
                placeholder="Ask Mari anything..."
                className="w-full pl-3 pr-10 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => handleSend(input)}
                disabled={!input.trim()}
                className="absolute right-1.5 top-1.5 p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-colors"
              >
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
