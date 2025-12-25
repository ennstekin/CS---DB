import DOMPurify from "dompurify";

/**
 * HTML içeriğini XSS saldırılarına karşı temizler
 * Güvenli taglar ve attributeler dışındaki her şeyi kaldırır
 */
export function sanitizeHtml(dirty: string): string {
  if (typeof window === "undefined") {
    // Server-side: basit temizlik
    return dirty
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/on\w+\s*=/gi, "data-removed=")
      .replace(/javascript:/gi, "");
  }

  // Client-side: DOMPurify ile tam temizlik
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "b", "em", "i", "u", "s", "strike",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li",
      "a", "img",
      "table", "thead", "tbody", "tr", "th", "td",
      "blockquote", "pre", "code",
      "div", "span",
      "hr",
    ],
    ALLOWED_ATTR: [
      "href", "src", "alt", "title", "width", "height",
      "class", "style", "target", "rel",
      "colspan", "rowspan",
    ],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ["target"],
    FORBID_TAGS: ["script", "style", "iframe", "form", "input", "button", "object", "embed"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
  });
}

/**
 * Metin içeriğini güvenli hale getirir (HTML encoding)
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}
