import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, User, Bot, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import axios from 'axios';
import { cn } from '@/lib/utils';

// Access API URL from environment or default to localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const scrollRef = useRef(null);
    const [showLeadForm, setShowLeadForm] = useState(false);
    const [leadFormData, setLeadFormData] = useState({ name: '', email: '', phone: '' });

    // Initialize session and greeting
    useEffect(() => {
        const initChat = async () => {
            let storedSessionId = localStorage.getItem('chat_session_id');
            const hasLeadInfo = localStorage.getItem('chat_lead_info');

            if (!storedSessionId) {
                try {
                    // Create new session
                    const response = await axios.post(`${API_URL}/api/sessions`, {
                        userId: `user-${Math.random().toString(36).substr(2, 9)}`, // Simple random ID
                        metadata: { source: 'web_widget' }
                    });
                    storedSessionId = response.data.sessionId;
                    localStorage.setItem('chat_session_id', storedSessionId);
                } catch (error) {
                    console.error('Failed to create session:', error);
                    return;
                }
            }

            setSessionId(storedSessionId);

            // Check if we need to collect lead info
            if (!hasLeadInfo) {
                setShowLeadForm(true);
            }

            // Load history if exists
            try {
                const historyRes = await axios.get(`${API_URL}/api/chat/${storedSessionId}`);
                if (historyRes.data.messages && historyRes.data.messages.length > 0) {
                    setMessages(historyRes.data.messages.map(msg => ({
                        role: msg.role,
                        content: msg.content
                    })));
                    // If they have history, maybe don't force lead form, or check if we really need it
                    // For now, let's persist with asking if we don't have it locally
                } else {
                    // Add initial greeting if no history
                    setMessages([
                        {
                            role: 'assistant',
                            content: "Hello! I'm Ziggie, Ras Ali's AI assistant. I can help you with bass performance, sound engineering, videography, or full-stack development. Before we start, could you please tell me a bit about yourself?"
                        }
                    ]);
                }
            } catch (error) {
                // Fallback greeting
                setMessages([
                    {
                        role: 'assistant',
                        content: "Hello! I'm Ziggie, Ras Ali's AI assistant. How can I help you today?"
                    }
                ]);
            }
        };

        initChat();

        // Auto-open chat after 3 seconds for new visitors
        const hasSeenGreeting = sessionStorage.getItem('has_seen_greeting');
        if (!hasSeenGreeting) {
            const timer = setTimeout(() => {
                setIsOpen(true);
                sessionStorage.setItem('has_seen_greeting', 'true');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen, showLeadForm]);

    const handleLeadSubmit = async (e) => {
        e.preventDefault();
        if (!leadFormData.name || !leadFormData.email) return;

        setIsLoading(true);
        try {
            await axios.post(`${API_URL}/api/leads`, {
                sessionId,
                ...leadFormData
            });

            localStorage.setItem('chat_lead_info', JSON.stringify(leadFormData));
            setShowLeadForm(false);
            setMessages(prev => [...prev, { role: 'assistant', content: `Nice to meet you, ${leadFormData.name}! How can I help you today?` }]);
        } catch (error) {
            console.error('Failed to save lead info:', error);
            // Allow them to proceed anyway? Or show error?
            // Let's allow proceed to avoid blocking
            setShowLeadForm(false);
            setMessages(prev => [...prev, { role: 'assistant', content: "Thanks! How can I help you today?" }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputValue.trim() || !sessionId) return;

        const userMessage = inputValue.trim();
        setInputValue('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const response = await axios.post(`${API_URL}/api/chat`, {
                sessionId,
                message: userMessage
            });

            const assistantMessage = response.data.response;
            setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
        } catch (error) {
            console.error('Failed to send message:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting right now. Please try again later." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <Card className="w-[350px] sm:w-[400px] h-[550px] shadow-xl border-border animate-in slide-in-from-bottom-5 fade-in duration-300 flex flex-col mb-4 bg-background border-primary/20">
                    <CardHeader className="p-4 border-b bg-primary/10 flex flex-row items-center justify-between space-y-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-md">
                                <Bot className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">Ziggie</CardTitle>
                                <p className="text-xs text-muted-foreground">Ras Ali's AI Assistant</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/20" onClick={() => setIsOpen(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </CardHeader>

                    <CardContent className="flex-1 p-0 overflow-hidden relative">
                        <div ref={scrollRef} className="h-full overflow-y-auto p-4 space-y-4">
                            {messages.map((msg, index) => (
                                <div
                                    key={index}
                                    className={cn(
                                        "flex w-max max-w-[85%] flex-col gap-2 rounded-2xl px-4 py-3 text-sm shadow-sm",
                                        msg.role === 'user'
                                            ? "ml-auto bg-primary text-primary-foreground rounded-br-none"
                                            : "bg-muted/80 backdrop-blur-sm rounded-bl-none border border-border/50"
                                    )}
                                >
                                    {msg.content}
                                </div>
                            ))}

                            {/* Lead Form inside Chat */}
                            {showLeadForm && (
                                <div className="bg-muted/50 p-4 rounded-xl border border-primary/10 space-y-3 animate-in fade-in zoom-in-95 duration-300">
                                    <p className="text-sm font-medium text-foreground/80 mb-2">Please share your details to continue:</p>
                                    <form onSubmit={handleLeadSubmit} className="space-y-3">
                                        <Input
                                            placeholder="Your Name"
                                            value={leadFormData.name}
                                            onChange={e => setLeadFormData({ ...leadFormData, name: e.target.value })}
                                            required
                                            className="bg-background/80"
                                        />
                                        <Input
                                            placeholder="Email Address"
                                            type="email"
                                            value={leadFormData.email}
                                            onChange={e => setLeadFormData({ ...leadFormData, email: e.target.value })}
                                            required
                                            className="bg-background/80"
                                        />
                                        <Input
                                            placeholder="Phone Number (Optional)"
                                            type="tel"
                                            value={leadFormData.phone}
                                            onChange={e => setLeadFormData({ ...leadFormData, phone: e.target.value })}
                                            className="bg-background/80"
                                        />
                                        <Button type="submit" className="w-full" disabled={isLoading}>
                                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                            Start Chatting
                                        </Button>
                                    </form>
                                </div>
                            )}

                            {isLoading && !showLeadForm && (
                                <div className="flex w-max max-w-[80%] flex-col gap-2 rounded-lg px-3 py-2 text-sm bg-muted/50">
                                    <div className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                        <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                        <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce"></span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>

                    <CardFooter className="p-3 border-t bg-background/50 backdrop-blur-md">
                        <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
                            <Input
                                type="text"
                                placeholder={showLeadForm ? "Please fill the form above..." : "Type your message..."}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                disabled={isLoading || showLeadForm}
                                className="flex-1 bg-background/80 focus-visible:ring-primary/50"
                            />
                            <Button type="submit" size="icon" disabled={isLoading || !inputValue.trim() || showLeadForm} className="bg-primary hover:bg-primary/90 shadow-sm">
                                <Send className="h-4 w-4" />
                                <span className="sr-only">Send</span>
                            </Button>
                        </form>
                    </CardFooter>
                </Card>
            )}

            {/* Toggle Button */}
            {!isOpen && (
                <Button
                    onClick={() => setIsOpen(true)}
                    size="icon"
                    className="h-14 w-14 rounded-full shadow-lg hover:scale-105 transition-transform duration-200"
                >
                    <MessageSquare className="h-7 w-7" />
                    <span className="sr-only">Open Chat</span>
                </Button>
            )}
        </div>
    );
}
