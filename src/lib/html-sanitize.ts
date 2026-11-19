export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

/**
 * Strips potentially dangerous HTML tags/attributes before rendering writer-authored HTML.
 */
export function sanitizeArticleHtml(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[\s\S]*?>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
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
