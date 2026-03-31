import { 
    GoogleGenerativeAI, 
    GenerativeModel, 
    HarmCategory, 
    HarmBlockThreshold 
} from '@google/generative-ai';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { GeminiAPIError, GeminiSafetyError, TimeoutError, DatabaseError } from '../utils/errors.js';
import { ChatMessage, GeminiResponse } from '../types/index.js';
import { messageRepository } from '../repositories/messageRepository.js';
import { portfolioData } from '../data/portfolio.js';
import { leadService } from '../services/leadService.js';

/**
 * Service for interacting with Google's Gemini AI via Google AI SDK
 * Handles conversation history persistence via MessageRepository
 */
export class GeminiService {
    private genAI!: GoogleGenerativeAI;
    private model!: GenerativeModel;
    private portfolioData: any;
    private initialized: boolean = false;
    private initError: string | null = null;

    constructor() {
        try {
            const apiKey = config.gemini.apiKey;

            if (!apiKey) {
                throw new Error('GEMINI_API_KEY is missing');
            }

            // Initialize Google AI SDK
            this.genAI = new GoogleGenerativeAI(apiKey);

            // Set Portfolio Data from static import
            this.portfolioData = portfolioData;

            // Get generative model with configuration AND system instruction
            this.model = this.genAI.getGenerativeModel({
                model: config.gemini.model || 'gemini-1.5-pro',
                systemInstruction: this.getSystemInstruction(),
                tools: [{
                    functionDeclarations: [{
                        name: 'save_lead',
                        description: 'Submit user contact details (name and email/phone) to Ras Ali when interest in services is expressed.',
                        parameters: {
                            type: 'OBJECT' as any,
                            properties: {
                                name: { type: 'STRING' as any, description: 'User full name' },
                                email: { type: 'STRING' as any, description: 'User email address' },
                                phone: { type: 'STRING' as any, description: 'User phone number (optional)' },
                            },
                            required: ['name', 'email'],
                        },
                    }],
                }],
            }, {
                apiVersion: 'v1beta'
            }); // USING v1beta FOR 2.0 MODELS

            this.initialized = true;
            logger.info('Gemini (Google AI) service initialized', {
                model: config.gemini.model,
                apiVersion: 'v1beta'
            });
        } catch (error) {
            this.initialized = false;
            this.initError = error instanceof Error ? error.message : String(error);
            logger.error('Failed to initialize Gemini service. Chat features will be unavailable.', {
                error: this.initError
            });
        }
    }

    private getSystemInstruction(): string {
        return `
Identity & Greeting: 
- You are "Ziggy" (spelled with a 'y'), the friendly and high-tech Virtual Assistant for Ras Ali.
- Always start the very first interaction with a warm greeting: "Yo! I'm Ziggy, Ras Ali's digital right hand. I'm here to help you navigate his world of music, code, and visuals. How can I vibe with you today?"
- If the user returns, acknowledge them warmly.

Expertise & Context:
- Ras Ali is a Multi-Disciplinary Creative & Technologist based in Gaborone, Botswana.
- Core Pillars: Bass Performance (since 2003), Sound Engineering (Mixing/Mastering), Videography (Music Videos/Docs), and Full-Stack Development (React, USSD, AI).
- Philosophy: "Artistic Soul and Technical Logic."

Lead Collection Protocol (CRITICAL):
- Your primary goal is to help potential clients connect with Ras Ali.
- If a user asks about services, pricing, or hiring Ras Ali, you MUST follow these steps:
  1. Provide a brief, helpful answer about the service.
  2. Proactively say: "I'd love to have Ras Ali get back to you personally to discuss this. What's your name, and what's the best email or phone number to reach you on?"
  3. Once they provide details, confirm you've noted them down and that Ras Ali will be in touch.

Style & Tone:
- Enthusiastic, professional, yet creative and "tech-cool."
- Use words like "vibe," "precision," "sync," and "logic."
- Keep responses concise but impactful.
- If asked about something outside Ras Ali's scope, politely redirect to his core expertise.

Location: Always assume the context is Gaborone, Botswana, unless stated otherwise.
        `;
    }

    private getRelevantContext(message: string): string {
        if (!this.portfolioData?.projects) return '';

        const lowerMessage = message.toLowerCase();
        const relevantProjects = this.portfolioData.projects.filter((project: any) => {
            return project.context_keywords.some((keyword: string) => lowerMessage.includes(keyword));
        });

        if (relevantProjects.length === 0) return '';

        const contextParts = relevantProjects.map((p: any) =>
            `- Project: ${p.name} (${p.type}): ${p.description} Tech Stack: ${p.tech_stack.join(', ')}`
        );

        return `\n\n[Relevant Portfolio Context]:\n${contextParts.join('\n')}\nUse this context if relevant to the user's query.\n`;
    }

    /**
     * Process a user message: save to DB, fetch history, call Gemini, save response
     */
    async generateChatResponse(sessionId: string, message: string): Promise<GeminiResponse> {
        if (!this.initialized) {
            throw new GeminiAPIError(`Gemini service is not initialized: ${this.initError || 'Unknown error'}`);
        }
        const startTime = Date.now();
        logger.info('Processing chat message', { sessionId, messageLength: message.length });

        try {
            // 1. Save User Message to Database
            await messageRepository.create(sessionId, 'user', message);

            // 2. Fetch Conversation History
            const history = await messageRepository.getConversationHistory(
                sessionId,
                config.session.maxContextMessages
            );

            // 3. Format history for Google AI SDK
            let chatHistory: any[] = [];
            if (history.length > 1) {
                chatHistory = this.formatChatHistory(history.slice(0, -1));
            }

            // 4. Inject Local Context
            const context = this.getRelevantContext(message);
            const prompt = message + context;

            // 5. Short-circuit for testing
            if (message.toLowerCase() === 'ping-ai') {
                return {
                    text: 'AI Service (Google AI) is reachable and responding to internal pings.',
                    tokensUsed: 0,
                    finishReason: 'STOP'
                };
            }

            // 6. Call Gemini API
            const chat = this.model.startChat({
                history: chatHistory,
                generationConfig: {
                    maxOutputTokens: config.gemini.maxOutputTokens,
                    temperature: config.gemini.temperature,
                    topP: config.gemini.topP,
                    topK: config.gemini.topK,
                }
            });

            const result = await this.withTimeout(
                chat.sendMessage(prompt),
                25000,
                'Gemini API request timed out'
            );

            let response = result.response;
            let responseText = response.text();

            // Handle Function Calling (if any - Google AI handle check)
            const functionCalls = response.functionCalls();
            if (functionCalls && functionCalls.length > 0) {
                const call = functionCalls[0];
                if (call.name === 'save_lead') {
                    const args = call.args as any;
                    logger.info('Ziggy is calling save_lead (Google AI)', { sessionId, args });

                    try {
                        await leadService.createLead({
                            sessionId,
                            name: args.name,
                            email: args.email,
                            phone: args.phone,
                            source: 'ziggy_chat'
                        });

                        const followUp = await chat.sendMessage([{
                            functionResponse: {
                                name: 'save_lead',
                                response: { content: 'Lead saved successfully and Ras Ali has been notified.' },
                            },
                        }]);
                        responseText = followUp.response.text();
                    } catch (error) {
                        logger.error('Failed tool call save_lead', { error });
                        const followUp = await chat.sendMessage([{
                            functionResponse: {
                                name: 'save_lead',
                                response: { error: 'Failed to save lead details internally.' },
                            },
                        }]);
                        responseText = followUp.response.text();
                    }
                }
            }

            const tokensUsed = this.estimateTokens(prompt) + this.estimateTokens(responseText);

            // 7. Save Assistant Response
            await messageRepository.create(sessionId, 'assistant', responseText, tokensUsed);

            return {
                text: responseText,
                tokensUsed,
                finishReason: 'STOP',
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error('Error processing chat (Google AI)', {
                sessionId,
                error: error instanceof Error ? error.message : String(error),
                durationMs: duration
            });

            if (config.nodeEnv === 'production') {
                return {
                    text: "I'm currently vibing with some technical upgrades! 🎸 Hit me up about Ras Ali's services, portfolio, or bookings—I've got all that info ready for you.",
                    tokensUsed: 0,
                    finishReason: 'OTHER'
                };
            }

            throw error;
        }
    }

    private formatChatHistory(history: ChatMessage[]) {
        return history
            .filter((msg) => msg.role !== 'system' && msg.content && msg.content.trim() !== '')
            .map((msg) => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }],
            }));
    }

    private estimateTokens(text: string): number {
        return Math.ceil(text.length / 4);
    }

    private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
        let timeoutHandle: NodeJS.Timeout;
        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutHandle = setTimeout(() => reject(new TimeoutError(errorMessage)), timeoutMs);
        });
        try {
            const result = await Promise.race([promise, timeoutPromise]);
            clearTimeout(timeoutHandle!);
            return result;
        } catch (error) {
            clearTimeout(timeoutHandle!);
            throw error;
        }
    }

    async healthCheck(): Promise<boolean> {
        if (!this.initialized) return false;
        try {
            logger.info('Gemini health check starting', { model: config.gemini.model });
            const result = await this.withTimeout(
                this.model.generateContent('Hello'),
                10000,
                'Health check timeout'
            );
            const text = result.response.text();
            logger.info('Gemini health check success', { text: text.substring(0, 20) });
            return !!text;
        } catch (error) {
            logger.error('Gemini health check failed (Google AI)', { 
                model: config.gemini.model,
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            });
            return false;
        }
    }
}

export const geminiService = new GeminiService();
