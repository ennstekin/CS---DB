/**
 * Strip quoted text and signatures from email content
 * Makes timeline view cleaner by showing only the new content
 */

/**
 * Strip quoted content from plain text email
 */
export function stripEmailQuotes(text: string | null | undefined): string {
  if (!text) return "";

  const lines = text.split("\n");
  const cleanLines: string[] = [];
  let inQuote = false;
  let foundSignature = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Check for signature delimiter (-- or --- at start of line)
    if (trimmedLine === "--" || trimmedLine === "---") {
      foundSignature = true;
      break;
    }

    // Check for "On ... wrote:" pattern (quote start)
    // Matches: "On Dec 20, 2025 at 11:40 PM <email> wrote:"
    // Also Turkish: "20 Ara 2025 tarihinde ... yazdı:"
    if (
      /^On\s+.+\s+wrote:\s*$/i.test(trimmedLine) ||
      /^tarihinde\s+.+\s+yazd[ıi]:\s*$/i.test(trimmedLine) ||
      /^\d+\s+\w+\s+\d+.*(?:wrote|yazdı):\s*$/i.test(trimmedLine)
    ) {
      inQuote = true;
      continue;
    }

    // Check for quoted lines (starting with >)
    if (trimmedLine.startsWith(">")) {
      inQuote = true;
      continue;
    }

    // If we hit an empty line after quote content, might be end of quote section
    // But be careful - could be multiple quote blocks
    if (inQuote && trimmedLine === "") {
      // Check if next non-empty line is also a quote
      let nextNonEmptyIdx = i + 1;
      while (nextNonEmptyIdx < lines.length && lines[nextNonEmptyIdx].trim() === "") {
        nextNonEmptyIdx++;
      }
      if (nextNonEmptyIdx < lines.length) {
        const nextLine = lines[nextNonEmptyIdx].trim();
        if (!nextLine.startsWith(">") && !nextLine.match(/^On\s+.+\s+wrote:/i)) {
          inQuote = false;
        }
      }
      continue;
    }

    // Skip quoted content
    if (inQuote) {
      continue;
    }

    cleanLines.push(line);
  }

  // Trim trailing empty lines
  while (cleanLines.length > 0 && cleanLines[cleanLines.length - 1].trim() === "") {
    cleanLines.pop();
  }

  return cleanLines.join("\n").trim();
}

/**
 * Strip quoted content from HTML email
 * Removes <blockquote> elements and gmail_quote divs
 */
export function stripEmailQuotesHtml(html: string | null | undefined): string {
  if (!html) return "";

  // Create a temporary div to parse HTML
  // Since we're running on server/client, we need a simple regex approach
  let cleanHtml = html;

  // Remove blockquote elements and their content
  cleanHtml = cleanHtml.replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/gi, "");

  // Remove Gmail quote divs (class="gmail_quote")
  cleanHtml = cleanHtml.replace(/<div[^>]*class="[^"]*gmail_quote[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "");

  // Remove Outlook quote divs (class="OutlookMessageHeader" or similar)
  cleanHtml = cleanHtml.replace(/<div[^>]*class="[^"]*OutlookMessageHeader[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "");

  // Remove "On ... wrote:" lines in div/p tags
  cleanHtml = cleanHtml.replace(/<(?:div|p)[^>]*>\s*On\s+[^<]+\s+wrote:\s*<\/(?:div|p)>/gi, "");

  // Remove signature block (content after <br>--<br> or similar)
  cleanHtml = cleanHtml.replace(/<br\s*\/?>\s*--\s*<br\s*\/?>[\s\S]*$/gi, "");
  cleanHtml = cleanHtml.replace(/<div[^>]*>\s*--\s*<\/div>[\s\S]*$/gi, "");

  // Remove Gmail signature class
  cleanHtml = cleanHtml.replace(/<div[^>]*class="[^"]*gmail_signature[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "");

  // Clean up multiple consecutive <br> tags
  cleanHtml = cleanHtml.replace(/(<br\s*\/?>\s*){3,}/gi, "<br><br>");

  // Trim trailing whitespace and empty tags
  cleanHtml = cleanHtml.replace(/(<br\s*\/?>|\s)+$/gi, "");

  return cleanHtml.trim();
}
