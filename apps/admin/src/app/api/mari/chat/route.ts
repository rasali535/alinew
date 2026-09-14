import { NextRequest, NextResponse } from 'next/server';
import { processMariQuery } from '@ralion/ai/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, organizationId = 'admin', query } = body;
    const textPrompt = prompt || query || '';

    if (!textPrompt.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const result = await processMariQuery({
      prompt: textPrompt,
      organizationId,
    });

    return NextResponse.json({
      answer: result.answer,
      actions: result.suggestedActions || [],
    });
  } catch (error: any) {
    console.error('[ADMIN_MARI_CHAT_API_ERROR]', error);
    return NextResponse.json({
      answer: 'I am ready to assist your business operations. How can I help?',
      actions: [],
    }, { status: 500 });
  }
}
