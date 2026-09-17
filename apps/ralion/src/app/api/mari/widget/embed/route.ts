import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const script = String.raw`(() => {
  const scriptEl = document.currentScript;
  if (!scriptEl) return;

  const widgetId = (scriptEl.getAttribute('data-widget') || '').trim();
  if (!widgetId || !widgetId.startsWith('mw_public_')) {
    console.warn('[Mari Widget] Missing or invalid data-widget identifier.');
    return;
  }

  const uniqueId = 'ralion-mari-widget-' + widgetId.replace(/[^a-zA-Z0-9_-]/g, '');
  if (document.getElementById(uniqueId)) return;

  const scriptUrl = new URL(scriptEl.src, window.location.href);
  const basePath = scriptUrl.pathname.includes('/ralion/') ? '/ralion' : '';
  const ralionOrigin = scriptUrl.origin;
  const sessionUrl = ralionOrigin + basePath + '/api/mari/widget/session';
  const frameUrl = ralionOrigin + basePath + '/mari-widget';

  fetch(sessionUrl, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ widget: widgetId }),
  })
    .then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.sessionToken) {
        throw new Error(payload.error || 'Widget session could not be started.');
      }
      return payload;
    })
    .then((payload) => {
      const config = payload.widget || {};
      const position = config.position === 'bottom-left' ? 'left' : 'right';
      const accent = /^#[0-9a-f]{6}$/i.test(config.accentColor || '') ? config.accentColor : '#7c3aed';

      const host = document.createElement('div');
      host.id = uniqueId;
      host.style.position = 'fixed';
      host.style.zIndex = '2147483000';
      host.style.bottom = '20px';
      host.style[position] = '20px';
      host.style.width = 'auto';
      host.style.height = 'auto';
      host.style.pointerEvents = 'none';
      document.body.appendChild(host);

      const shadow = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
      const wrapper = document.createElement('div');
      wrapper.style.pointerEvents = 'auto';
      wrapper.style.fontFamily = 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

      const iframe = document.createElement('iframe');
      const hash = new URLSearchParams({
        session: payload.sessionToken,
        name: config.assistantName || 'Mari',
        welcome: config.welcomeMessage || 'Hi! I’m Mari. How can I help?',
        accent,
      });
      iframe.src = frameUrl + '#' + hash.toString();
      iframe.title = (config.assistantName || 'Mari') + ' AI assistant';
      iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin');
      iframe.referrerPolicy = 'no-referrer';
      iframe.style.position = 'absolute';
      iframe.style.bottom = '72px';
      iframe.style[position] = '0';
      iframe.style.width = 'min(380px, calc(100vw - 32px))';
      iframe.style.height = 'min(620px, calc(100vh - 120px))';
      iframe.style.border = '0';
      iframe.style.borderRadius = '22px';
      iframe.style.boxShadow = '0 24px 80px rgba(2, 6, 23, .36)';
      iframe.style.background = '#08111f';
      iframe.style.display = 'none';
      iframe.style.overflow = 'hidden';

      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', 'Open ' + (config.assistantName || 'Mari') + ' assistant');
      button.style.width = '58px';
      button.style.height = '58px';
      button.style.border = '0';
      button.style.borderRadius = '999px';
      button.style.cursor = 'pointer';
      button.style.display = 'grid';
      button.style.placeItems = 'center';
      button.style.background = 'linear-gradient(135deg, ' + accent + ', #2563eb)';
      button.style.color = '#fff';
      button.style.boxShadow = '0 14px 38px rgba(37, 99, 235, .35)';
      button.style.transition = 'transform .18s ease, box-shadow .18s ease';
      button.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 5.8A3.8 3.8 0 0 1 8.8 2h6.4A3.8 3.8 0 0 1 19 5.8v6.4a3.8 3.8 0 0 1-3.8 3.8H11l-4.7 4v-4.2A3.8 3.8 0 0 1 5 12.2V5.8Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 8.5h6M9 11.5h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

      let open = false;
      const setOpen = (next) => {
        open = next;
        iframe.style.display = open ? 'block' : 'none';
        button.setAttribute('aria-label', (open ? 'Close ' : 'Open ') + (config.assistantName || 'Mari') + ' assistant');
        button.style.transform = open ? 'rotate(2deg) scale(.96)' : 'none';
      };

      button.addEventListener('mouseenter', () => { button.style.transform = 'translateY(-2px)'; });
      button.addEventListener('mouseleave', () => { button.style.transform = open ? 'rotate(2deg) scale(.96)' : 'none'; });
      button.addEventListener('click', () => setOpen(!open));
      window.addEventListener('message', (event) => {
        if (event.origin === ralionOrigin && event.data && event.data.type === 'ralion:mari-widget:close') {
          setOpen(false);
        }
      });

      wrapper.appendChild(iframe);
      wrapper.appendChild(button);
      shadow.appendChild(wrapper);
    })
    .catch((error) => {
      console.warn('[Mari Widget] ' + (error && error.message ? error.message : 'Unable to load widget.'));
    });
})();`;

  return new NextResponse(script, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
