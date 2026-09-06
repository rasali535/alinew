import React from 'react';
import {
  Sparkles,
  ExternalLink,
  Film,
  Image as ImageIcon,
} from 'lucide-react';

/**
 * Normalizes raw Markdown text from any Mari backend/engine before parsing:
 * 1. Unescapes escaped Markdown characters (\**, \*, \_, \#, \[, \], etc.)
 * 2. Strips raw HTML <svg> tags and artifact strings (e.g. svgSend to Studio, <svg...>)
 * 3. Fixes malformed bold markers (e.g. `Word**:**`, `**Word**:**`, `**Word:**`, `**Word** :`)
 * 4. Normalizes duplicated bullet patterns (e.g. `- **•**`, `- •`, `• •`, `* •`, `- -`, `**•**`)
 * 5. Cleans up extra whitespace and empty bracket tokens
 */
export function normalizeMarkdownText(raw) {
  if (!raw) return '';

  let text = raw;

  // 1. Unescape escaped markdown backslashes (\**, \*, \_, \#, \[, \], \(, \), \`, \~)
  text = text.replace(/\\([*_#\[\]()\`~\\-])/g, '$1');

  // 2. Strip raw SVG markup and artifact button tags
  text = text
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<svg[^>]*>[\s\S]*/gi, '')
    .replace(/<\/?path[^>]*>/gi, '')
    .replace(/<\/?rect[^>]*>/gi, '')
    .replace(/<\/?circle[^>]*>/gi, '')
    .replace(/svgSend to Studio/gi, '')
    .replace(/svg[A-Za-z0-9 ]*Send to Studio/gi, '')
    .replace(/\bsvg[A-Z][a-zA-Z0-9 ]*/g, '');

  // 3. Fix malformed bold markers:
  // Normalize "**:**" -> "**:"
  text = text.replace(/\*\*:\*\*/g, '**:');
  // Normalize "**Key:**" -> "**Key**:"
  text = text.replace(/\*\*([^*:]+):\*\*/g, '**$1**:');
  // Normalize "**Key** :" -> "**Key**:"
  text = text.replace(/\*\*([^*:]+)\*\*\s+:/g, '**$1**:');
  // Normalize "**Key**:**" -> "**Key**:"
  text = text.replace(/\*\*([^*:]+)\*\*\s*:\s*\*\*/g, '**$1**: ');

  // 4. Normalize duplicated/malformed bullets on lines:
  const lines = text.split('\n');
  const cleanedLines = lines.map(line => {
    let l = line.trimEnd();

    // Matches: "- **•**", "- •", "* •", "• •", "- *", "- -", "• -", "• **•**", etc.
    if (/^\s*(?:[-*•]\s*)*(?:\*\*[•\-*]\*\*\s*)+/i.test(l)) {
      l = l.replace(/^\s*(?:[-*•]\s*)*(?:\*\*[•\-*]\*\*\s*)+/i, '• ');
    } else if (/^\s*(?:[•\-*]\s*){2,}/.test(l)) {
      l = l.replace(/^\s*(?:[•\-*]\s*){2,}/, '• ');
    } else if (/^\s*[-*]\s+/.test(l)) {
      l = l.replace(/^\s*[-*]\s+/, '• ');
    }

    // Clean up single unclosed bold at line start like "• Key**: Value" -> "• **Key**: Value"
    if (/^(\s*•\s*)([A-Za-z0-9 /_&–-]+)\*\*:\s*/.test(l)) {
      l = l.replace(/^(\s*•\s*)([A-Za-z0-9 /_&–-]+)\*\*:\s*/, '$1**$2**: ');
    } else if (/^([A-Za-z0-9 /_&–-]+)\*\*:\s*/.test(l)) {
      l = l.replace(/^([A-Za-z0-9 /_&–-]+)\*\*:\s*/, '**$1**: ');
    }

    // Clean up any lingering bullet inside bold right at the start of bullet item:
    // e.g. "• **• Post title**" -> "• **Post title**"
    // e.g. "• **• [8/30/2026]**" -> "• **[8/30/2026]**"
    l = l.replace(/^•\s*\*\*[•\-*]\s*/, '• **');

    // Clean date formatting like *[8/30/2026]* -> **[8/30/2026]**
    l = l.replace(/^•\s*\*(\[\d{1,2}\/\d{1,2}\/\d{2,4}\])\*/, '• **$1**');
    l = l.replace(/^•\s*(\[\d{1,2}\/\d{1,2}\/\d{2,4}\])\*/, '• **$1**');

    return l;
  });

  text = cleanedLines.join('\n');

  // 5. Clean trailing action brackets if any
  text = stripActionBracketsFromText(text);

  return text.trim();
}

/**
 * Strips bracketed action tokens that are extracted and rendered as action buttons.
 */
export function stripActionBracketsFromText(text) {
  if (!text) return '';
  return text
    .replace(/(?:^|\n)\s*\[[A-Za-z0-9 &—–-]+\](?:\s*\|\s*\[[A-Za-z0-9 &—–-]+\])*\s*(?:\n|$)/g, '\n')
    .replace(/\[(Create Reel|Create Visual|Open Growth Studio|Connect Facebook|Connect Facebook Page|Generate Creative|View CRM Pipeline|Sync Website|Add Business Knowledge|Review Sales Pipeline|View Tasks Queue|Open Billing & Finance|Draft Prospect Follow-Ups|Create Growth Campaign)\]/gi, '')
    .replace(/\|\s*\|/g, '|')
    .replace(/^\s*\|\s*|\s*\|\s*$/gm, '')
    .replace(/\n\s*\*\*(Recommended Next Moves|Recommended Actions|Next Steps)\*\*:\s*(?=\n|$)/gi, '')
    .trim();
}

/**
 * Formats inline Markdown styling: bold, italic, bold-italic, inline code, and links.
 */
function renderInlineFormatted(text) {
  if (!text) return [];

  const tokens = [];
  let remaining = text;
  let keyIdx = 0;

  // Regex patterns
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/;
  const boldItalicRegex = /\*\*\*([^*]+)\*\*\*/;
  const boldRegex = /\*\*([^*]+)\*\*/;
  const italicRegex = /(?:^|[^*])\*([^*\n]+)\*(?!\*)|(?:^|[^_])_([^_\n]+)_(?!_)/;
  const codeRegex = /`([^`]+)`/;

  while (remaining.length > 0) {
    const candidates = [];

    const matchLink = linkRegex.exec(remaining);
    if (matchLink) candidates.push({ type: 'link', match: matchLink, index: matchLink.index });

    const matchBoldItalic = boldItalicRegex.exec(remaining);
    if (matchBoldItalic) candidates.push({ type: 'boldItalic', match: matchBoldItalic, index: matchBoldItalic.index });

    const matchBold = boldRegex.exec(remaining);
    if (matchBold) candidates.push({ type: 'bold', match: matchBold, index: matchBold.index });

    const matchItalic = italicRegex.exec(remaining);
    if (matchItalic) candidates.push({ type: 'italic', match: matchItalic, index: matchItalic.index });

    const matchCode = codeRegex.exec(remaining);
    if (matchCode) candidates.push({ type: 'code', match: matchCode, index: matchCode.index });

    if (candidates.length === 0) {
      tokens.push(<span key={`text-${keyIdx++}`}>{remaining}</span>);
      break;
    }

    // Sort by earliest match index
    candidates.sort((a, b) => a.index - b.index);
    const first = candidates[0];

    // Push preceding plain text
    if (first.index > 0) {
      tokens.push(<span key={`plain-${keyIdx++}`}>{remaining.substring(0, first.index)}</span>);
    }

    if (first.type === 'link') {
      const label = first.match[1];
      const url = first.match[2];
      tokens.push(
        <a
          key={`link-${keyIdx++}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-400 hover:text-green-300 font-semibold underline inline-flex items-center gap-0.5 transition-colors"
        >
          {label}
          <ExternalLink className="w-2.5 h-2.5 inline" />
        </a>
      );
      remaining = remaining.substring(first.index + first.match[0].length);
    } else if (first.type === 'boldItalic') {
      tokens.push(
        <strong key={`bi-${keyIdx++}`} className="font-bold text-foreground">
          <em className="italic text-muted-foreground">{first.match[1]}</em>
        </strong>
      );
      remaining = remaining.substring(first.index + first.match[0].length);
    } else if (first.type === 'bold') {
      tokens.push(
        <strong key={`bold-${keyIdx++}`} className="font-bold text-foreground">
          {first.match[1]}
        </strong>
      );
      remaining = remaining.substring(first.index + first.match[0].length);
    } else if (first.type === 'italic') {
      const fullMatch = first.match[0];
      const content = first.match[1] || first.match[2];
      const prefix = fullMatch.startsWith('*') || fullMatch.startsWith('_') ? '' : fullMatch[0];
      if (prefix) {
        tokens.push(<span key={`it-pre-${keyIdx++}`}>{prefix}</span>);
      }
      tokens.push(
        <em key={`italic-${keyIdx++}`} className="italic text-muted-foreground">
          {content}
        </em>
      );
      remaining = remaining.substring(first.index + fullMatch.length);
    } else if (first.type === 'code') {
      tokens.push(
        <code
          key={`code-${keyIdx++}`}
          className="px-1.5 py-0.5 rounded bg-muted border border-border text-green-400 font-mono text-[11px]"
        >
          {first.match[1]}
        </code>
      );
      remaining = remaining.substring(first.index + first.match[0].length);
    }
  }

  return tokens;
}

/**
 * Parses markdown lines into semantic elements (headings, list items, paragraphs, hr).
 */
function renderMarkdownParagraphs(content) {
  if (!content || !content.trim()) return [];

  const lines = content.split('\n');
  const nodes = [];
  let currentList = [];
  let listType = null;
  let blockKey = 0;

  const flushList = () => {
    if (currentList.length > 0) {
      if (listType === 'number') {
        nodes.push(
          <ol key={`ol-${blockKey++}`} className="space-y-1.5 my-2 pl-1 list-decimal list-inside text-foreground/90">
            {currentList}
          </ol>
        );
      } else {
        nodes.push(
          <ul key={`ul-${blockKey++}`} className="space-y-1.5 my-2 pl-0.5 text-foreground/90">
            {currentList}
          </ul>
        );
      }
      currentList = [];
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      flushList();
      continue;
    }

    // Horizontal Rule: --- or *** or ___
    if (line === '---' || line === '***' || line === '___') {
      flushList();
      nodes.push(<hr key={`hr-${blockKey++}`} className="my-3 border-border" />);
      continue;
    }

    // Heading 3: ### Title
    if (line.startsWith('### ')) {
      flushList();
      const headingText = line.replace(/^###\s+/, '');
      nodes.push(
        <h3 key={`h3-${blockKey++}`} className="text-sm font-bold text-foreground mt-3.5 mb-1.5 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-green-400 shrink-0" />
          <span>{renderInlineFormatted(headingText)}</span>
        </h3>
      );
      continue;
    }

    // Heading 2: ## Title
    if (line.startsWith('## ')) {
      flushList();
      const headingText = line.replace(/^##\s+/, '');
      nodes.push(
        <h2 key={`h2-${blockKey++}`} className="text-sm font-extrabold text-foreground mt-4 mb-2">
          {renderInlineFormatted(headingText)}
        </h2>
      );
      continue;
    }

    // Heading 1: # Title
    if (line.startsWith('# ')) {
      flushList();
      const headingText = line.replace(/^#\s+/, '');
      nodes.push(
        <h1 key={`h1-${blockKey++}`} className="text-base font-black text-foreground mt-4 mb-2">
          {renderInlineFormatted(headingText)}
        </h1>
      );
      continue;
    }

    // Blockquote: > Quote
    if (line.startsWith('> ')) {
      flushList();
      nodes.push(
        <blockquote key={`bq-${blockKey++}`} className="pl-3 border-l-2 border-green-500/60 my-2 text-muted-foreground italic">
          {renderInlineFormatted(line.replace(/^>\s*/, ''))}
        </blockquote>
      );
      continue;
    }

    // Bullet list item: • or - or *
    if (/^(?:[•\-*]\s*)+/.test(line)) {
      if (listType !== 'bullet') flushList();
      listType = 'bullet';
      const itemText = line.replace(/^(?:[•\-*]\s*)+/, '').trim();
      currentList.push(
        <li key={`li-${blockKey++}`} className="flex items-start gap-2 text-foreground/90">
          <span className="text-green-400 font-bold shrink-0 mt-0.5">•</span>
          <span className="flex-1">{renderInlineFormatted(itemText)}</span>
        </li>
      );
      continue;
    }

    // Numbered list item: 1. or 2.
    if (/^\d+\.\s+/.test(line)) {
      if (listType !== 'number') flushList();
      listType = 'number';
      const itemText = line.replace(/^\d+\.\s+/, '');
      currentList.push(
        <li key={`nli-${blockKey++}`} className="flex items-start gap-2 text-foreground/90">
          <span className="flex-1">{renderInlineFormatted(itemText)}</span>
        </li>
      );
      continue;
    }

    // Standard paragraph or key-value pair
    flushList();
    nodes.push(
      <p key={`p-${blockKey++}`} className="my-1.5 text-foreground/90 leading-relaxed">
        {renderInlineFormatted(line)}
      </p>
    );
  }

  flushList();
  return nodes;
}

export const MariMarkdownMessage = ({ text, isUser = false }) => {
  if (!text) return null;

  if (isUser) {
    return <p className="whitespace-pre-wrap">{text}</p>;
  }

  // 1. Normalize Markdown text
  const displayContent = normalizeMarkdownText(text);

  // 2. Check for image and video embeds
  const hasImages = displayContent.includes('![');
  const hasVideos = /\[Watch Video/i.test(displayContent);

  // If rich media exists, process segments
  if (hasImages || hasVideos) {
    const blocks = [];
    let lastIndex = 0;
    const combinedRegex = /(!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)|\[Watch Video(?: Reel)?\]\((https?:\/\/[^\s)]+)\))/gi;
    let match;

    while ((match = combinedRegex.exec(displayContent)) !== null) {
      if (match.index > lastIndex) {
        const textSegment = displayContent.substring(lastIndex, match.index);
        blocks.push(
          <div key={`seg-${lastIndex}`} className="space-y-2">
            {renderMarkdownParagraphs(textSegment)}
          </div>
        );
      }

      const isImg = match[0].startsWith('![');
      if (isImg) {
        const alt = match[2] || 'Generated Creative';
        const url = match[3];
        blocks.push(
          <div key={`img-${match.index}`} className="my-3 overflow-hidden rounded-xl border border-green-500/40 bg-zinc-950 shadow-2xl">
            <img
              src={url}
              alt={alt}
              className="w-full max-h-[380px] object-cover rounded-xl transition-transform hover:scale-[1.01]"
              loading="lazy"
            />
            <div className="p-2 flex items-center justify-between bg-zinc-900/90 text-[10px] text-zinc-400 border-t border-zinc-800">
              <span className="font-mono text-green-300 flex items-center gap-1">
                <ImageIcon className="w-3 h-3 text-green-400" /> FLUX.1 High-Resolution Asset
              </span>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="px-2 py-0.5 rounded bg-green-600/30 hover:bg-green-600/50 text-green-200 font-semibold flex items-center gap-1"
              >
                View Full Size ↗
              </a>
            </div>
          </div>
        );
      } else {
        const vidUrl = match[4];
        blocks.push(
          <div key={`vid-${match.index}`} className="my-3 overflow-hidden rounded-xl border border-green-500/40 bg-zinc-950 shadow-2xl">
            <video
              controls
              autoPlay
              loop
              muted
              playsInline
              src={vidUrl}
              className="w-full max-h-[340px] object-cover rounded-xl"
            />
            <div className="p-2 flex items-center justify-between bg-zinc-900/90 text-[10px] text-zinc-400 border-t border-zinc-800">
              <span className="font-mono text-emerald-300 flex items-center gap-1">
                <Film className="w-3 h-3 text-emerald-400" /> CogVideoX Animation Stream
              </span>
              <a
                href={vidUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2 py-0.5 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 font-semibold flex items-center gap-1"
              >
                Open Player ↗
              </a>
            </div>
          </div>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < displayContent.length) {
      blocks.push(
        <div key={`seg-end-${lastIndex}`} className="space-y-2">
          {renderMarkdownParagraphs(displayContent.substring(lastIndex))}
        </div>
      );
    }

    return <div className="space-y-2">{blocks}</div>;
  }

  // Pure text Markdown structure
  return <div className="space-y-2 text-xs leading-relaxed">{renderMarkdownParagraphs(displayContent)}</div>;
};

export default MariMarkdownMessage;
