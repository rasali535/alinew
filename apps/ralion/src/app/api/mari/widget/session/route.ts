import { NextRequest, NextResponse } from 'next/server';
import { MariWidgetService } from '../../../../../lib/services/mari/mariWidget.service';

export const dynamic = 'force-dynamic';

function requestOrigin(request: NextRequest): string {
  const origin = String(request.headers.get('origin') || '').trim();
  if (origin) return origin;
  const referer = String(request.headers.get('referer') || '').trim();
  if (!referer) return '';
  try {
    return new URL(referer).origin;
  } catch {
    return '';
  }
}

function corsHeaders(origin: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '600',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  };
  if (/^https?:\/\//i.test(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

export async function OPTIONS(request: NextRequest) {
  const origin = requestOrigin(request);
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: NextRequest) {
  const origin = requestOrigin(request);
  const headers = corsHeaders(origin);

  if (!origin) {
    return NextResponse.json({ success: false, code: 'MARI_WIDGET_ORIGIN_REQUIRED', error: 'Website origin is required.' }, { status: 400, headers });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const publicToken = String(body.widget || body.publicToken || '').trim();
    if (!publicToken) {
      return NextResponse.json({ success: false, code: 'MARI_WIDGET_ID_REQUIRED', error: 'Widget identifier is required.' }, { status: 400, headers });
    }

    const session = await MariWidgetService.createSession(publicToken, origin);
    return NextResponse.json({
      success: true,
      sessionToken: session.sessionToken,
      expiresAt: session.expiresAt,
      widget: {
        publicToken: session.widget.publicToken,
        assistantName: session.widget.assistantName,
        welcomeMessage: session.widget.welcomeMessage,
        accentColor: session.widget.accentColor,
        position: session.widget.position,
      },
    }, { status: 201, headers });
  } catch (error: any) {
    const code = error?.code || 'MARI_WIDGET_SESSION_FAILED';
    const status = code === 'MARI_WIDGET_DOMAIN_DENIED' ? 403 : code === 'MARI_WIDGET_INVALID' ? 404 : 500;
    return NextResponse.json({ success: false, code, error: error.message || 'Unable to start Mari widget session.' }, { status, headers });
  }
}
