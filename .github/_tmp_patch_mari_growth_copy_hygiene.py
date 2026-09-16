from pathlib import Path

# Patch shared Mari renderer/copy hygiene.
component = Path("apps/ralion/src/components/MariMarkdownMessage.tsx")
src = component.read_text()

old = """import {
  Sparkles,
  ExternalLink,
  Film,
  Image as ImageIcon,
} from 'lucide-react';"""
new = """import {
  ExternalLink,
  Film,
  Image as ImageIcon,
} from 'lucide-react';"""
if old not in src:
    raise SystemExit("component import anchor not found")
src = src.replace(old, new, 1)

anchor = """interface MariMarkdownMessageProps {
  text: string;
  isUser?: boolean;
}
"""
helper = """interface MariMarkdownMessageProps {
  text: string;
  isUser?: boolean;
}

function decodeMarkdownHtmlEntities(value: string): string {
  return value
    .replace(/&#(\\d+);/g, (match, decimal) => {
      const codePoint = Number(decimal);
      return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : match;
    })
    .replace(/&#x([0-9a-f]+);/gi, (match, hex) => {
      const codePoint = Number.parseInt(hex, 16);
      return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : match;
    })
    .replace(/&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}
"""
if anchor not in src:
    raise SystemExit("component interface anchor not found")
src = src.replace(anchor, helper, 1)

old = """  let text = raw;
  text = text.replace(/[\\u200B-\\u200D\\u2060\\uFEFF]/g, '');"""
new = """  let text = decodeMarkdownHtmlEntities(raw);
  text = text.replace(/[\\u200B-\\u200D\\u2060\\uFEFF]/g, '');"""
if old not in src:
    raise SystemExit("component normalize anchor not found")
src = src.replace(old, new, 1)

old = """      nodes.push(
        <h3 key={`h3-${blockKey++}`} className="text-sm font-bold text-white mt-3.5 mb-1.5 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span>{renderInlineFormatted(headingText)}</span>
        </h3>
      );"""
new = """      nodes.push(
        <h3 key={`h3-${blockKey++}`} className="text-sm font-bold text-white mt-3.5 mb-1.5">
          {renderInlineFormatted(headingText)}
        </h3>
      );"""
if old not in src:
    raise SystemExit("component h3 anchor not found")
src = src.replace(old, new, 1)

old = """          <ul key={`ul-${blockKey++}`} className="space-y-1.5 my-2 pl-0.5 text-zinc-200">
            {currentList}
          </ul>"""
new = """          <ul key={`ul-${blockKey++}`} className="space-y-1.5 my-2 ml-4 list-disc list-outside text-zinc-200 marker:text-purple-400">
            {currentList}
          </ul>"""
if old not in src:
    raise SystemExit("component ul anchor not found")
src = src.replace(old, new, 1)

old = """      currentList.push(
        <li key={`li-${blockKey++}`} className="flex items-start gap-2 text-zinc-200">
          <span className="text-purple-400 font-bold shrink-0 mt-0.5">•</span>
          <span className="flex-1">{renderInlineFormatted(itemText)}</span>
        </li>
      );"""
new = """      currentList.push(
        <li key={`li-${blockKey++}`} className="text-zinc-200 pl-1">
          {renderInlineFormatted(itemText)}
        </li>
      );"""
if old not in src:
    raise SystemExit("component bullet li anchor not found")
src = src.replace(old, new, 1)
component.write_text(src)

# Patch grounded fallback strategy quality and text hygiene.
route = Path("apps/ralion/src/app/api/social/facebook/pages/[pageId]/mari-growth/route.ts")
src = route.read_text()

anchor = """export const dynamic = 'force-dynamic';


function buildGroundedGrowthStrategyFallback(params: {"""
replacement = """export const dynamic = 'force-dynamic';

function cleanFallbackText(value: unknown): string {
  return String(value ?? '')
    .replace(/&#(\\d+);/g, (match, decimal) => {
      const codePoint = Number(decimal);
      return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : match;
    })
    .replace(/&#x([0-9a-f]+);/gi, (match, hex) => {
      const codePoint = Number.parseInt(hex, 16);
      return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : match;
    })
    .replace(/&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\\s+/g, ' ')
    .trim();
}

function stripTerminalPunctuation(value: unknown): string {
  return cleanFallbackText(value).replace(/[.!?]+\\s*$/, '').trim();
}

function buildGroundedGrowthStrategyFallback(params: {"""
if anchor not in src:
    raise SystemExit("route fallback helper anchor not found")
src = src.replace(anchor, replacement, 1)

old = """  evidence.push(`- **Publishing baseline:** ${Number(performance.posts30d || 0)} posts in 30 days (about ${Number(performance.postingFrequencyPerWeek || 0).toFixed(2)} per week).`);
  const interactions = Number(performance.totalReactions30d || 0) + Number(performance.totalComments30d || 0) + Number(performance.totalShares30d || 0);
  evidence.push(`- **Visible interactions:** ${interactions} total (${Number(performance.totalReactions30d || 0)} reactions, ${Number(performance.totalComments30d || 0)} comments, ${Number(performance.totalShares30d || 0)} shares).`);"""
new = """  const posts30d = Number(performance.posts30d || 0);
  const postingFrequencyPerWeek = Number(performance.postingFrequencyPerWeek || 0);
  const interactions = Number(performance.totalReactions30d || 0) + Number(performance.totalComments30d || 0) + Number(performance.totalShares30d || 0);
  evidence.push(`- **Publishing baseline:** ${posts30d} posts in 30 days (about ${postingFrequencyPerWeek.toFixed(2)} per week).`);
  evidence.push(`- **Visible interactions:** ${interactions} total (${Number(performance.totalReactions30d || 0)} reactions, ${Number(performance.totalComments30d || 0)} comments, ${Number(performance.totalShares30d || 0)} shares).`);"""
if old not in src:
    raise SystemExit("route publishing evidence anchor not found")
src = src.replace(old, new, 1)

old = """    if (briefing?.summary) competitorLines.push(`- **Latest market briefing:** ${briefing.summary}`);
    if (Array.isArray(briefing?.marketMoves) && briefing.marketMoves.length) {
      competitorLines.push(`- **Observed market moves:** ${briefing.marketMoves.slice(0, 3).join(' | ')}`);
    }
    if (Array.isArray(briefing?.marketGaps) && briefing.marketGaps.length) {
      competitorLines.push(`- **Potential gaps to test:** ${briefing.marketGaps.slice(0, 3).join(' | ')}`);
    }"""
new = """    if (briefing?.summary) competitorLines.push(`- **Latest market briefing:** ${cleanFallbackText(briefing.summary)}`);
    if (Array.isArray(briefing?.marketMoves) && briefing.marketMoves.length) {
      competitorLines.push(`- **Observed market moves:** ${briefing.marketMoves.slice(0, 3).map((item: unknown) => cleanFallbackText(item)).join(' | ')}`);
    }
    if (Array.isArray(briefing?.marketGaps) && briefing.marketGaps.length) {
      competitorLines.push(`- **Potential gaps to test:** ${briefing.marketGaps.slice(0, 3).map((item: unknown) => cleanFallbackText(item)).join(' | ')}`);
    }"""
if old not in src:
    raise SystemExit("route competitor text anchor not found")
src = src.replace(old, new, 1)

old = """  const marketGap = Array.isArray(briefing?.marketGaps) && briefing.marketGaps.length ? String(briefing.marketGaps[0]) : '';
  const observedFormat = performance.topContentType || 'text';
  const verifiedOffer = String(
    profile.valueProposition ||
    (Array.isArray(profile.productsAndServices) && profile.productsAndServices.length
      ? profile.productsAndServices.slice(0, 2).join(' + ')
      : `${company}'s verified offer`)
  );

  const tests = [
    `1. **Positioning test:** Test an outcome-led message built around \"${verifiedOffer}\"${marketGap ? `, informed by this public-market gap: ${marketGap}` : ''}. Compare it with a simpler single-offer message; treat the result as a hypothesis until measured.`,
    `2. **Format test:** Use the observed ${observedFormat} signal as one variant, then test it against a different format with the same message and CTA. Hold the offer constant so the format comparison is interpretable.`,
    `3. **CTA test:** Compare a low-friction conversation CTA (for example, asking people to comment a keyword) with the current direct-contact path. Measure qualified replies or enquiries rather than raw reactions alone.`,
  ];

  const contentFormat = observedFormat === 'video' ? 'Short video/reel with a concise text caption' : observedFormat === 'image' ? 'Single visual with a concise proof-led caption' : 'Text-first milestone / behind-the-scenes post';
  const contentIdea = [
    `**Objective:** Test whether a clearer outcome-led expression of the verified offer earns meaningful enquiries.`,
    `**Format:** ${contentFormat}.`,
    `**Draft copy:**`,
    '',
    `What would change if the right people understood exactly what ${company} can help them achieve?`,
    '',
    `Our current focus is simple: ${verifiedOffer}.`,
    '',
    `We are testing this message against real audience response rather than calling it proven before the data says so.`,
    '',
    `Want to see how it works in practice? Comment **BUILD** and let's start the conversation.`,
  ].join('\\n');"""
new = """  const marketGap = Array.isArray(briefing?.marketGaps) && briefing.marketGaps.length
    ? stripTerminalPunctuation(briefing.marketGaps[0])
    : '';
  const observedFormat = performance.topContentType || 'text';
  const verifiedOffer = stripTerminalPunctuation(
    profile.valueProposition ||
    (Array.isArray(profile.productsAndServices) && profile.productsAndServices.length
      ? profile.productsAndServices.slice(0, 2).join(' + ')
      : `${company}'s verified offer`)
  );
  const topObservedTopic = topPost
    ? stripTerminalPunctuation(
        cleanFallbackText(topPost.excerpt || '')
          .replace(/\\s+#\\S+/g, '')
          .slice(0, 220)
      )
    : '';

  const strategicDirection: string[] = [];
  if (posts30d > 0 && interactions < posts30d) {
    strategicDirection.push(
      `- **Shift from volume to proof-led posts:** ${posts30d} posts produced ${interactions} visible interactions in this 30-day sample. That does not prove posting frequency caused the result, but it is enough to test fewer, stronger posts with clearer proof and a single outcome per post before increasing volume.`
    );
  } else {
    strategicDirection.push(
      '- **Prioritize proof over generic promotion:** keep each post focused on one customer outcome, one proof point and one action.'
    );
  }
  if (topObservedTopic) {
    strategicDirection.push(
      `- **Build on the strongest observed topic:** the best-performing post in the sample centered on \"${topObservedTopic}\". Create a follow-up that explains the problem, what changed and why the result matters instead of simply repeating the announcement.`
    );
  }
  if (marketGap) {
    strategicDirection.push(
      `- **Differentiate with concrete outcomes:** public competitor evidence suggests this testable gap: ${marketGap}. Use customer proof, demonstrations and before/after explanations rather than mirroring crowded market language.`
    );
  }
  strategicDirection.push(
    '- **Build the learning loop:** every next post should have one hypothesis, one primary CTA and a captured outcome so Mari can move from baseline observations to evidence-backed learnings.'
  );

  const tests = [
    `1. **Message test:** Compare one outcome-led message built around \"${verifiedOffer}\" with a narrower single-offer message. Keep the format and CTA the same so the positioning difference is interpretable.`,
    `2. **Proof-format test:** Use the observed ${observedFormat} format as one variant${topObservedTopic ? ` around the \"${topObservedTopic}\" topic` : ''}, then test a second format with the same message and CTA. Do not treat the current format signal as proven until the sample grows.`,
    `3. **CTA test:** Compare a low-friction conversation CTA, such as asking people to comment a keyword, with the current direct-contact path. Measure qualified replies or enquiries rather than raw reactions alone.`,
  ];

  const contentFormat = observedFormat === 'video'
    ? 'Short video/reel with a concise proof-led caption'
    : observedFormat === 'image'
      ? 'Single visual with a concise proof-led caption'
      : 'Text-first proof / behind-the-build post';
  const contentIdea = [
    `**Objective:** Test whether a concrete proof-led post earns more meaningful response than a broad company-positioning post.`,
    `**Format:** ${contentFormat}.`,
    `**Draft copy:**`,
    '',
    `Most businesses do not need another broad promise. They need something concrete.`,
    '',
    topObservedTopic
      ? `One thing we recently put into the market: ${topObservedTopic}.`
      : `One thing we can show clearly: ${verifiedOffer}.`,
    '',
    `The useful question is not just what we built — it is what problem it solves, what changes for the customer, and how we can prove it.`,
    '',
    `Want the breakdown? Comment **BUILD** and we'll show the thinking behind it.`,
  ].join('\\n');"""
if old not in src:
    raise SystemExit("route strategy/content anchor not found")
src = src.replace(old, new, 1)

old = """    '### 3. What We Should Test Next',
    ...tests,
    '',
    '### 4. Facebook Content Idea',
    contentIdea,"""
new = """    '### 3. Strategic Direction',
    ...strategicDirection,
    '',
    '### 4. What We Should Test Next',
    ...tests,
    '',
    '### 5. Facebook Content Idea',
    contentIdea,"""
if old not in src:
    raise SystemExit("route section ordering anchor not found")
src = src.replace(old, new, 1)

route.write_text(src)
