export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "hr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "del",
  "blockquote",
  "pre",
  "code",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "figure",
  "figcaption",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "div",
  "span",
]);

const VOID_TAGS = new Set(["br", "hr", "img"]);

const BLOCKED_CONTENT_TAGS = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "svg",
  "math",
  "noscript",
  "template",
]);

const GLOBAL_ALLOWED_ATTRS = new Set(["id", "class", "title", "dir", "lang"]);

const TAG_ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel"]),
  img: new Set(["src", "alt", "width", "height", "loading"]),
  th: new Set(["colspan", "rowspan", "scope"]),
  td: new Set(["colspan", "rowspan"]),
};

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : "";
    })
    .replace(/&#(\d+);?/g, (_, dec: string) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : "";
    })
    .replace(/&colon;/gi, ":")
    .replace(/&newline;/gi, "\n")
    .replace(/&tab;/gi, "\t")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function isSafeUrl(rawUrl: string): boolean {
  const decoded = decodeHtmlEntities(rawUrl)
    .replace(/[\u0000-\u0020\u007f]+/g, "")
    .trim();
  if (!decoded) return false;

  // Relative paths and in-page anchors are safe
  if (
    decoded.startsWith("/") && !decoded.startsWith("//") ||
    decoded.startsWith("#")
  ) {
    return true;
  }

  try {
    const parsed = new URL(decoded);
    return (
      parsed.protocol === "https:" ||
      parsed.protocol === "http:" ||
      parsed.protocol === "mailto:" ||
      parsed.protocol === "tel:"
    );
  } catch {
    return false;
  }
}

function escapeAttr(val: string): string {
  return val
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function sanitizeAttributes(tag: string, rawAttrs: string): string {
  const tagSpecific = TAG_ALLOWED_ATTRS[tag];
  const kept: string[] = [];
  let hasBlankTarget = false;
  let hasRel = false;

  const attrRegex =
    /([a-zA-Z0-9:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(rawAttrs)) !== null) {
    const name = match[1].toLowerCase();
    const rawValue = match[2] ?? match[3] ?? match[4] ?? "";

    // Explicitly block all inline event handlers and style/srcdoc injection vectors
    if (name.startsWith("on") || name === "style" || name === "srcdoc") {
      continue;
    }

    if (!GLOBAL_ALLOWED_ATTRS.has(name) && !tagSpecific?.has(name)) {
      continue;
    }

    if (name === "href" || name === "src") {
      if (!isSafeUrl(rawValue)) continue;
      kept.push(`${name}="${escapeAttr(rawValue.trim())}"`);
      continue;
    }

    if (tag === "a" && name === "target") {
      const targetVal = rawValue.trim().toLowerCase();
      if (targetVal === "_blank" || targetVal === "_self") {
        if (targetVal === "_blank") hasBlankTarget = true;
        kept.push(`target="${targetVal}"`);
      }
      continue;
    }

    if (tag === "a" && name === "rel") {
      hasRel = true;
      kept.push('rel="noopener noreferrer"');
      continue;
    }

    if (name === "id" && !/^[a-zA-Z0-9_-]{1,80}$/.test(rawValue.trim())) {
      continue;
    }

    kept.push(`${name}="${escapeAttr(rawValue.trim())}"`);
  }

  if (tag === "a" && hasBlankTarget && !hasRel) {
    kept.push('rel="noopener noreferrer"');
  }

  return kept.length > 0 ? ` ${kept.join(" ")}` : "";
}

/**
 * Allowlist-based HTML sanitizer for writer-authored articles.
 * Strips dangerous tags, inline event handlers, and unsafe URL schemes.
 */
export function sanitizeArticleHtml(raw: string): string {
  if (!raw) return "";

  // 1. Strip HTML comments
  let cleaned = raw.replace(/<!--[\s\S]*?-->/g, "");

  // 2. Remove dangerous block elements and their inner contents
  for (const tag of BLOCKED_CONTENT_TAGS) {
    const blockRegex = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi");
    cleaned = cleaned.replace(blockRegex, "");
    const selfClosingRegex = new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi");
    cleaned = cleaned.replace(selfClosingRegex, "");
  }

  // 3. Filter remaining HTML tags against strict allowlist
  return cleaned.replace(
    /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g,
    (_full, slash: string, rawTag: string, rawAttrs: string) => {
      const tag = rawTag.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) {
        return "";
      }
      if (slash) {
        return VOID_TAGS.has(tag) ? "" : `</${tag}>`;
      }
      const safeAttrs = sanitizeAttributes(tag, rawAttrs);
      return `<${tag}${safeAttrs}>`;
    },
  );
}

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

/**
 * Extracts h2/h3 headings for a Table of Contents and injects anchor IDs into the HTML.
 */
export function extractTocFromHtml(html: string): {
  htmlWithIds: string;
  toc: TocItem[];
} {
  const toc: TocItem[] = [];
  const usedIds = new Map<string, number>();

  const htmlWithIds = html.replace(
    /<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi,
    (_match, levelStr: string, attrs: string, inner: string) => {
      const level = Number(levelStr) as 2 | 3;
      const plainText = inner.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      if (!plainText) return `<h${level}${attrs}>${inner}</h${level}>`;

      const existingIdMatch = attrs.match(/\sid=["']([^"']+)["']/i);
      let id = existingIdMatch?.[1] || slugifyHeading(plainText) || "bagian";
      const count = usedIds.get(id) || 0;
      usedIds.set(id, count + 1);
      if (count > 0) id = `${id}-${count + 1}`;

      toc.push({ id, text: plainText, level });

      if (existingIdMatch) {
        return `<h${level}${attrs}>${inner}</h${level}>`;
      }
      return `<h${level}${attrs} id="${id}">${inner}</h${level}>`;
    },
  );

  return { htmlWithIds, toc };
}

/**
 * Splits article HTML roughly after the 2nd closing paragraph/heading so an in-article ad
 * can be placed without breaking markup.
 */
export function splitHtmlForInArticleAd(html: string): {
  beforeHtml: string;
  afterHtml: string;
} {
  const markerRegex = /<\/(?:p|h2|ul|ol)>/gi;
  const indices: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = markerRegex.exec(html)) !== null) {
    indices.push(match.index + match[0].length);
  }

  if (indices.length < 4) {
    return { beforeHtml: html, afterHtml: "" };
  }

  const splitAt = indices[Math.min(2, Math.floor(indices.length / 2) - 1)];
  return {
    beforeHtml: html.slice(0, splitAt),
    afterHtml: html.slice(splitAt),
  };
}
