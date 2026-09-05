'use client';

import React from 'react';
import {
  Sparkles,
  ArrowRight,
  ExternalLink,
  Film,
  Image as ImageIcon,
  CheckCircle2,
  Share2,
  TrendingUp,
  FileText,
  DollarSign,
  Zap,
} from 'lucide-react';

interface MariMarkdownMessageProps {
  text: string;
  isUser?: boolean;
}

/**
 * Cleanly unescapes raw markdown escape sequences (e.g., `\*\*` -> `**`).
 */
function unescapeMarkdown(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/\\(\*|_|#|\[|\]|\(|\)|`|~|\\)/g, '$1')
    .trim();
}

/**
 * Strips bracketed action tokens that are extracted and rendered as action buttons.
 * E.g., removes `[Create Reel] | [Create Visual] | [Open Growth Studio]`
 */
export function stripActionBracketsFromText(text: string): string {
  if (!text) return '';
  // Match bracketed button sequences at line starts, ends, or standalone
  return text
    .replace(/(?:^|\n)\s*\[[A-Za-z0-9 &—–-]+\](?:\s*\|\s*\[[A-Za-z0-9 &—–-]+\])*\s*(?:\n|$)/g, '\n')
    .replace(/\[(Create Reel|Create Visual|Open Growth Studio|Connect Facebook|Connect Facebook Page|Generate Creative|View CRM Pipeline|Sync Website|Add Business Knowledge|Review Sales Pipeline|View Tasks Queue|Open Billing & Finance|Draft Prospect Follow-Ups|Create Growth Campaign)\]/gi, '')
    .replace(/\|\s*\|/g, '|')
    .replace(/^\s*\|\s*|\s*\|\s*$/gm, '')
    .trim();
}

/**
 * Formats inline Markdown styling: bold, italic, inline code, and links.
 */
function renderInlineFormatted(text: string): React.ReactNode[] {
  if (!text) return [];

  // Match: images, videos, links, bold, italic, inline code
  // Tokenizer pattern
  const tokens: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  // Regex patterns
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/;
  const boldRegex = /\*\*([^*]+)\*\*/;
  const italicRegex = /(?:^|[^*])\*([^*]+)\*/;
  const codeRegex = /`([^`]+)`/;

  while (remaining.length > 0) {
    // Find the earliest match among the formatting patterns
    const matchLink = linkRegex.exec(remaining);
    const matchBold = boldRegex.exec(remaining);
    const matchItalic = italicRegex.exec(remaining);
    const matchCode = codeRegex.exec(remaining);

    type MatchCandidate = { type: 'link' | 'bold' | 'italic' | 'code'; match: RegExpExecArray; index: number };
    const candidates: MatchCandidate[] = [];

    if (matchLink) candidates.push({ type: 'link', match: matchLink, index: matchLink.index });
    if (matchBold) candidates.push({ type: 'bold', match: matchBold, index: matchBold.index });
    if (matchItalic) candidates.push({ type: 'italic', match: matchItalic, index: matchItalic.index });
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
          className="text-purple-400 hover:text-purple-300 font-semibold underline inline-flex items-center gap-0.5 transition-colors"
        >
          {label}
          <ExternalLink className="w-2.5 h-2.5 inline" />
        </a>
      );
      remaining = remaining.substring(first.index + first.match[0].length);
    } else if (first.type === 'bold') {
      tokens.push(
        <strong key={`bold-${keyIdx++}`} className="font-bold text-white">
          {first.match[1]}
        </strong>
      );
      remaining = remaining.substring(first.index + first.match[0].length);
    } else if (first.type === 'italic') {
      // Italic regex might match preceding character
      const fullMatch = first.match[0];
      const prefix = fullMatch.startsWith('*') ? '' : fullMatch[0];
      const content = first.match[1];
      if (prefix) {
        tokens.push(<span key={`it-pre-${keyIdx++}`}>{prefix}</span>);
      }
      tokens.push(
        <em key={`italic-${keyIdx++}`} className="italic text-zinc-300">
          {content}
        </em>
      );
      remaining = remaining.substring(first.index + fullMatch.length);
    } else if (first.type === 'code') {
      tokens.push(
        <code
          key={`code-${keyIdx++}`}
          className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-purple-300 font-mono text-[11px]"
        >
          {first.match[1]}
        </code>
      );
      remaining = remaining.substring(first.index + first.match[0].length);
    }
  }

  return tokens;
}

export const MariMarkdownMessage: React.FC<MariMarkdownMessageProps> = ({ text, isUser = false }) => {
  if (!text) return null;

  if (isUser) {
    return <p className="whitespace-pre-wrap">{text}</p>;
  }

  // 1. Unescape raw backslashes and strip trailing action brackets that have buttons
  const cleanRawText = unescapeMarkdown(text);
  const displayContent = stripActionBracketsFromText(cleanRawText);

  // 2. Check for image and video embeds
  const imgRegex = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;
  const vidRegex = /\[Watch Video(?: Reel)?\]\((https?:\/\/[^\s)]+)\)/gi;

  const hasImages = displayContent.includes('![');
  const hasVideos = /\[Watch Video/i.test(displayContent);

  // If rich media exists, process segments
  if (hasImages || hasVideos) {
    const blocks: React.ReactNode[] = [];
    let lastIndex = 0;
    let combinedRegex = /(!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)|\[Watch Video(?: Reel)?\]\((https?:\/\/[^\s)]+)\))/gi;
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
          <div key={`img-${match.index}`} className="my-3 overflow-hidden rounded-xl border border-purple-500/40 bg-zinc-950 shadow-2xl">
            <img
              src={url}
              alt={alt}
              className="w-full max-h-[380px] object-cover rounded-xl transition-transform hover:scale-[1.01]"
              loading="lazy"
            />
            <div className="p-2 flex items-center justify-between bg-zinc-900/90 text-[10px] text-zinc-400 border-t border-zinc-800">
              <span className="font-mono text-purple-300 flex items-center gap-1">
                <ImageIcon className="w-3 h-3 text-purple-400" /> FLUX.1 High-Resolution Asset
              </span>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="px-2 py-0.5 rounded bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 font-semibold flex items-center gap-1"
              >
                View Full Size ↗
              </a>
            </div>
          </div>
        );
      } else {
        const vidUrl = match[4];
        blocks.push(
          <div key={`vid-${match.index}`} className="my-3 overflow-hidden rounded-xl border border-purple-500/40 bg-zinc-950 shadow-2xl">
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
              <span className="font-mono text-indigo-300 flex items-center gap-1">
                <Film className="w-3 h-3 text-indigo-400" /> CogVideoX Animation Stream
              </span>
              <a
                href={vidUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2 py-0.5 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 font-semibold flex items-center gap-1"
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
  return <div className="space-y-2.5 text-xs leading-relaxed">{renderMarkdownParagraphs(displayContent)}</div>;
};

/**
 * Parses markdown lines into semantic elements (headings, list items, paragraphs).
 */
function renderMarkdownParagraphs(content: string): React.ReactNode[] {
  if (!content || !content.trim()) return [];

  const lines = content.split('\n');
  const nodes: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];
  let listType: 'bullet' | 'number' | null = null;
  let blockKey = 0;

  const flushList = () => {
    if (currentList.length > 0) {
      if (listType === 'number') {
        nodes.push(
          <ol key={`ol-${blockKey++}`} className="space-y-1.5 my-2 pl-1 list-decimal list-inside text-zinc-200">
            {currentList}
          </ol>
        );
      } else {
        nodes.push(
          <ul key={`ul-${blockKey++}`} className="space-y-1.5 my-2 pl-0.5 text-zinc-200">
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

    // Heading 3: ### Title
    if (line.startsWith('### ')) {
      flushList();
      const headingText = line.replace(/^###\s+/, '');
      nodes.push(
        <h3 key={`h3-${blockKey++}`} className="text-sm font-bold text-white mt-3.5 mb-1.5 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          {renderInlineFormatted(headingText)}
        </h3>
      );
      continue;
    }

    // Heading 2: ## Title
    if (line.startsWith('## ')) {
      flushList();
      const headingText = line.replace(/^##\s+/, '');
      nodes.push(
        <h2 key={`h2-${blockKey++}`} className="text-sm font-extrabold text-white mt-4 mb-2">
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
        <h1 key={`h1-${blockKey++}`} className="text-base font-black text-white mt-4 mb-2">
          {renderInlineFormatted(headingText)}
        </h1>
      );
      continue;
    }

    // Bullet list item: • or - or *
    if (/^[•\-*]\s+/.test(line)) {
      if (listType !== 'bullet') flushList();
      listType = 'bullet';
      const itemText = line.replace(/^[•\-*]\s+/, '');
      currentList.push(
        <li key={`li-${blockKey++}`} className="flex items-start gap-2 text-zinc-200">
          <span className="text-purple-400 font-bold shrink-0 mt-0.5">•</span>
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
        <li key={`nli-${blockKey++}`} className="flex items-start gap-2 text-zinc-200">
          <span className="flex-1">{renderInlineFormatted(itemText)}</span>
        </li>
      );
      continue;
    }

    // Standard paragraph
    flushList();
    nodes.push(
      <p key={`p-${blockKey++}`} className="my-1.5 text-zinc-200 leading-relaxed">
        {renderInlineFormatted(line)}
      </p>
    );
  }

  flushList();
  return nodes;
}
