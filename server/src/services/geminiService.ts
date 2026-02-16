import { VertexAI, GenerativeModel, HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { GeminiAPIError, GeminiSafetyError, TimeoutError, DatabaseError } from '../utils/errors.js';
import { ChatMessage, GeminiResponse } from '../types/index.js';
import { messageRepository } from '../repositories/messageRepository.js';
import fs from 'fs';
import path from 'path';

/**
 * Service for interacting with Google's Gemini AI via Vertex AI
 * Handles conversation history persistence via MessageRepository
 */
export class GeminiService {
    private vertexAI: VertexAI;
    private model: GenerativeModel;
    private portfolioData: any;

    constructor() {
        try {
            // Initialize Vertex AI client
            this.vertexAI = new VertexAI({
                project: config.gemini.projectId,
                location: config.gemini.location,
            });

            // Load Portfolio Data
            this.loadPortfolioData();

            // Get generative model with configuration AND system instruction
            this.model = this.vertexAI.getGenerativeModel({
                model: config.gemini.model,
                systemInstruction: {
                    role: 'system',
                    parts: [{ text: this.getSystemInstruction() }]
                },
                generationConfig: {
                    maxOutputTokens: config.gemini.maxOutputTokens,
                    temperature: config.gemini.temperature,
                    topP: config.gemini.topP,
                    topK: config.gemini.topK,
                },
                safetySettings: [
                    {
                        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                    },
                    {
                        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                    },
                    {
                        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                    },
                    {
                        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                    },
                ],
            });

            logger.info('Gemini service initialized', {
                project: config.gemini.projectId,
                location: config.gemini.location,
                model: config.gemini.model,
            });
        } catch (error) {
            logger.error('Failed to initialize Gemini service', { error });
            throw new GeminiAPIError('Failed to initialize Gemini service', error);
        }
    }

    private loadPortfolioData() {
        try {
            // Assuming portfolio.json is in src/data/
            // During runtime, it might be in dist/data/ or we need to resolve correctly
            // For now, let's try to find it relative to this file
            const dataPath = path.resolve(__dirname, '../data/portfolio.json');

            if (fs.existsSync(dataPath)) {
                const rawData = fs.readFileSync(dataPath, 'utf-8');
                this.portfolioData = JSON.parse(rawData);
                logger.info('Portfolio data loaded successfully');
            } else {
                logger.warn(`Portfolio data not found at ${dataPath}. Using default context.`);
                this.portfolioData = { projects: [] };
            }
        } catch (error) {
            logger.error('Failed to load portfolio data', { error });
            this.portfolioData = { projects: [] };
        }
    }

    private getSystemInstruction(): string {
        return `
Identity: You are "Ziggie", the Virtual Assistant for Ras Ali, a Gaborone-based Multi-Disciplinary Creative & Technologist.

Expertise:
- Bass Performance (Live/Studio): Professional bassist since 2003.
- Sound Engineering: Mixing and Mastering.
- Videography: Music Videos and Documentaries.
- Full-Stack Development: React, Docker, USSD Solutions, App Development.

Core Message: Your work is a blend of "Artistic Soul and Technical Logic." You bridge the gap between creative artistry and engineering precision.

Booking Logic:
- If a user asks about availability or hiring, guide them toward the specific services (Bassist, Sound Engineer, Developer) they need.
- Always mention that Ras Ali is based in Gaborone, Botswana.
- For tech projects, position Ras Ali as a technical consultant for building digital products in Botswana.

Tone: Professional, knowledgeable, creative, and strictly helpful. You represent a professional brand.
        `;
    }

    private getRelevantContext(message: string): string {
        if (!this.portfolioData || !this.portfolioData.projects) return '';

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
     * @param sessionId - The session ID
     * @param message - The user's message
     * @returns The generated response
     */
    async generateChatResponse(sessionId: string, message: string): Promise<GeminiResponse> {
        const startTime = Date.now();
        logger.info('Processing chat message', { sessionId, messageLength: message.length });

        try {
            // 1. Save User Message to Database
            await messageRepository.create(sessionId, 'user', message);

            // 2. Fetch Conversation History (limit to maxContextMessages)
            const history = await messageRepository.getConversationHistory(
                sessionId,
                config.session.maxContextMessages
            );

            // 3. Format history for Gemini API
            let chatHistoryForGemini: Array<{ role: string; parts: Array<{ text: string }> }> = [];
            if (history.length > 1) {
                const previousMessages = history.slice(0, -1);
                chatHistoryForGemini = this.formatChatHistory(previousMessages);
            }

            // 4. Inject Local Context
            const context = this.getRelevantContext(message);
            const prompt = message + context;

            // 5. Call Gemini API
            logger.debug('Calling Gemini API', {
                sessionId,
                historyLength: chatHistoryForGemini.length,
                hasContext: !!context
            });

            const chat = this.model.startChat({
                history: chatHistoryForGemini,
            });

            const result = await this.withTimeout(
                chat.sendMessage(prompt),
                30000, // 30s timeout
                'Gemini API request timed out'
            );

            const response = result.response;
            const candidates = response.candidates;

            // Check for safety blocks
            if (!candidates || candidates.length === 0) {
                const safetyRatings = response.promptFeedback?.safetyRatings;
                throw new GeminiSafetyError('Response blocked by safety filters', { safetyRatings });
            }

            const candidate = candidates[0];
            if (candidate?.finishReason === 'SAFETY') {
                throw new GeminiSafetyError('Content blocked by safety filters', {
                    safetyRatings: candidate.safetyRatings,
                });
            }

            const text = candidate?.content?.parts?.[0]?.text;
            if (!text) {
                throw new GeminiAPIError('No text content in response');
            }

            const tokensUsed = this.estimateTokens(prompt) + this.estimateTokens(text);

            // 6. Save Assistant Response to Database
            await messageRepository.create(sessionId, 'assistant', text, tokensUsed);

            const duration = Date.now() - startTime;
            logger.info('Chat response completed', {
                sessionId,
                tokensUsed,
                durationMs: duration,
            });

            return {
                text,
                tokensUsed,
                finishReason: candidate.finishReason,
                safetyRatings: candidate.safetyRatings?.map((rating) => ({
                    category: rating.category || 'UNKNOWN',
                    probability: rating.probability || 'UNKNOWN',
                })),
            };

        } catch (error) {
            // Log the error with context
            const duration = Date.now() - startTime;
            logger.error('Error processing chat', {
                sessionId,
                error: error instanceof Error ? error.message : String(error),
                durationMs: duration
            });

            // Re-throw appropriate errors
            if (error instanceof GeminiSafetyError || error instanceof TimeoutError || error instanceof DatabaseError) {
                throw error;
            }

            throw new GeminiAPIError(
                error instanceof Error ? error.message : 'Unknown error during chat processing',
                error
            );
        }
    }

    /**
     * Format chat history for Gemini API
     */
    private formatChatHistory(history: ChatMessage[]): Array<{ role: string; parts: Array<{ text: string }> }> {
        return history
            .filter((msg) => msg.role !== 'system')
            .map((msg) => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }],
            }));
    }

    /**
     * Estimate token count (rough approximation)
     */
    private estimateTokens(text: string): number {
        return Math.ceil(text.length / 4);
    }

    /**
     * Wrap a promise with a timeout
     */
    private async withTimeout<T>(
        promise: Promise<T>,
        timeoutMs: number,
        errorMessage: string
    ): Promise<T> {
        let timeoutHandle: NodeJS.Timeout;

        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutHandle = setTimeout(() => {
                reject(new TimeoutError(errorMessage));
            }, timeoutMs);
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

    /**
     * Generate embeddings (placeholder)
     */
    async generateEmbedding(_text: string): Promise<number[]> {
        // TODO: Implement using Vertex AI Text Embeddings API
        return [];
    }

    /**
     * Health check for Gemini service
     */
    async healthCheck(): Promise<boolean> {
        try {
            const result = await this.withTimeout(
                this.model.generateContent('Hello'),
                5000,
                'Health check timeout'
            );
            return !!result.response;
        } catch (error) {
            logger.error('Gemini health check failed', { error });
            return false;
        }
    }
}

// Export singleton instance
export const geminiService = new GeminiService();
