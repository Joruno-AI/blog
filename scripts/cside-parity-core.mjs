import { createHash } from "node:crypto";

export const EXPECTED_SITEMAP_ROUTE_COUNT = 1_393;
export const EXPECTED_AUDITED_ROUTE_COUNT = 1_395;

export const CLOUDFLARE_ROBOTS_PREAMBLE_START =
  "# As a condition of accessing this website, you agree to abide by the following";
export const CLOUDFLARE_ROBOTS_BEGIN = "# BEGIN Cloudflare Managed content";
export const CLOUDFLARE_ROBOTS_END = "# END Cloudflare Managed Content";

export function sha256(body) {
  return createHash("sha256").update(body).digest("hex");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const RAW_TEXT_TAGS = new Set(["script", "style", "textarea", "title"]);

/**
 * Scan actual markup while respecting quoted attributes and raw-text nodes.
 * A regex-only search mistakes source code inside `data-markdown` (for
 * example `<article>`) for the page's visible article element.
 */
function *htmlTagTokens(source, start = 0) {
  let cursor = start;
  while (cursor < source.length) {
    const index = source.indexOf("<", cursor);
    if (index < 0) return;
    if (source.startsWith("<!--", index)) {
      const commentEnd = source.indexOf("-->", index + 4);
      cursor = commentEnd < 0 ? source.length : commentEnd + 3;
      continue;
    }

    let offset = index + 1;
    const closing = source[offset] === "/";
    if (closing) offset += 1;
    const nameMatch = /^[A-Za-z][\w:-]*/.exec(source.slice(offset));
    if (!nameMatch) {
      cursor = index + 1;
      continue;
    }

    const tagName = nameMatch[0].toLowerCase();
    let quote = "";
    let end = offset + nameMatch[0].length;
    for (; end < source.length; end += 1) {
      const character = source[end];
      if (quote) {
        if (character === quote) quote = "";
      } else if (character === '"' || character === "'") {
        quote = character;
      } else if (character === ">") {
        end += 1;
        break;
      }
    }
    if (end > source.length) return;

    const raw = source.slice(index, end);
    const token = {
      index,
      end,
      raw,
      tagName,
      closing,
      selfClosing: /\/\s*>$/.test(raw),
    };
    yield token;
    cursor = end;

    if (!closing && !token.selfClosing && RAW_TEXT_TAGS.has(tagName)) {
      const closingPattern = new RegExp(`<\\/${escapeRegExp(tagName)}\\s*>`, "ig");
      closingPattern.lastIndex = cursor;
      const rawTextClose = closingPattern.exec(source);
      if (!rawTextClose || rawTextClose.index === undefined) return;
      yield {
        index: rawTextClose.index,
        end: rawTextClose.index + rawTextClose[0].length,
        raw: rawTextClose[0],
        tagName,
        closing: true,
        selfClosing: false,
      };
      cursor = rawTextClose.index + rawTextClose[0].length;
    }
  }
}

function findOpeningTag(source, tagName, predicate = () => true) {
  const wanted = tagName.toLowerCase();
  for (const token of htmlTagTokens(source)) {
    if (!token.closing && token.tagName === wanted && predicate(token.raw)) return token;
  }
  return null;
}

function elementRangeFromOpeningTag(source, opening) {
  if (!opening || opening.index === undefined) return null;

  const tagName = opening.tagName ?? opening[1]?.toLowerCase();
  const innerStart = opening.end ?? opening.index + opening[0].length;
  let depth = 1;
  for (const token of htmlTagTokens(source, innerStart)) {
    if (token.tagName !== tagName) continue;
    if (token.closing) depth -= 1;
    else if (!token.selfClosing) depth += 1;
    if (depth === 0) {
      return {
        inner: source.slice(innerStart, token.index),
        outerStart: opening.index,
        outerEnd: token.end,
      };
    }
  }
  return null;
}

function innerHtmlFromOpeningTag(source, opening) {
  return elementRangeFromOpeningTag(source, opening)?.inner ?? null;
}

function elementInnerHtml(source, tagName, id) {
  const opening = findOpeningTag(source, tagName, (raw) =>
    !id || new RegExp(`\\bid=["']${escapeRegExp(id)}["']`, "i").test(raw));
  return innerHtmlFromOpeningTag(source, opening);
}

export function elementInnerHtmlByTag(source, tagName) {
  const opening = findOpeningTag(source, tagName);
  return innerHtmlFromOpeningTag(source, opening);
}

export function elementInnerHtmlByAttribute(source, attribute, value) {
  const attributePattern = new RegExp(
    `\\b${escapeRegExp(attribute)}=["']${escapeRegExp(value)}["']`,
    "i",
  );
  let opening = null;
  for (const token of htmlTagTokens(source)) {
    if (!token.closing && attributePattern.test(token.raw)) {
      opening = token;
      break;
    }
  }
  return innerHtmlFromOpeningTag(source, opening);
}

function withoutElementsByTag(source, tagName) {
  let output = source;
  for (let pass = 0; pass < 100; pass += 1) {
    const opening = findOpeningTag(output, tagName);
    const range = elementRangeFromOpeningTag(output, opening);
    if (!range) break;
    output = output.slice(0, range.outerStart) + output.slice(range.outerEnd);
  }
  return output;
}

function withoutElementById(source, id) {
  const idPattern = new RegExp(`\\bid=["']${escapeRegExp(id)}["']`, "i");
  let opening = null;
  for (const token of htmlTagTokens(source)) {
    if (!token.closing && idPattern.test(token.raw)) {
      opening = token;
      break;
    }
  }
  const range = elementRangeFromOpeningTag(source, opening);
  if (!range) return source;
  return source.slice(0, range.outerStart) + source.slice(range.outerEnd);
}

/**
 * Return the page content that the browser receives inside `<main>`.
 *
 * Next's static HTML may initially place `loading.tsx` in `<main>` and append
 * the completed server result in a hidden `S:n` container. Its inline `$RV`
 * script swaps that container into the matching `B:n` template before paint.
 * Auditing the wire order without replaying that deterministic swap compares
 * the loading shell instead of the rendered document and also puts persistent
 * UI (music/search dialogs) ahead of the real page. Resolve those boundaries
 * here so the semantic audit measures the same DOM a browser displays.
 */
export function resolveRenderedMainHtml(html) {
  let main = elementInnerHtml(html, "main", null) ?? html;
  const visited = new Set();

  for (let pass = 0; pass < 20; pass += 1) {
    const ids = [...main.matchAll(/<template\b[^>]*\bid=["']B:([^"']+)["'][^>]*><\/template>/gi)]
      .map((match) => match[1])
      .filter((id) => !visited.has(id));
    if (!ids.length) break;

    let changed = false;
    for (const id of ids) {
      visited.add(id);
      const streamed = elementInnerHtml(html, "div", `S:${id}`);
      if (streamed === null) continue;
      const escapedId = escapeRegExp(id);
      const boundary = new RegExp(
        `<!--\\$[?!]?--><template\\b[^>]*\\bid=["']B:${escapedId}["'][^>]*><\\/template>[\\s\\S]*?<!--\\/\\$-->`,
        "i",
      );
      const next = boundary.test(main)
        // A replacement string interprets authored `$&`, `$$`, `$`` and
        // `$<name>` code samples as substitution patterns. Return the streamed
        // HTML from a callback so the deterministic boundary replay remains
        // byte-faithful to the DOM the browser receives.
        ? main.replace(boundary, () => streamed)
        : main.replace(
          new RegExp(`<template\\b[^>]*\\bid=["']B:${escapedId}["'][^>]*><\\/template>`, "i"),
          () => streamed,
        );
      if (next !== main) {
        main = next;
        changed = true;
      }
    }
    if (!changed) break;
  }

  return main;
}

export function decodeHtml(value) {
  // HTML parses character references exactly once. Sequential replacements
  // accidentally decode mixed forms twice: Astro serializes a literal
  // `&amp;` in highlighted code as `&#x26;amp;`, while React uses
  // `&amp;amp;`; both display the same text in a browser.
  return value.replace(
    /&#(\d+);|&#x([\da-f]+);|&(quot|apos|lt|gt|nbsp|amp);/gi,
    (_, decimal, hexadecimal, named) => {
      if (decimal) return String.fromCodePoint(Number(decimal));
      if (hexadecimal) return String.fromCodePoint(Number.parseInt(hexadecimal, 16));
      return {
        quot: '"',
        apos: "'",
        lt: "<",
        gt: ">",
        nbsp: " ",
        amp: "&",
      }[named.toLowerCase()];
    },
  );
}

function decodeCloudflareEmail(hex) {
  if (!/^[\da-f]+$/i.test(hex) || hex.length < 4 || hex.length % 2 !== 0) return null;
  const key = Number.parseInt(hex.slice(0, 2), 16);
  const bytes = [];
  for (let index = 2; index < hex.length; index += 2) {
    bytes.push(Number.parseInt(hex.slice(index, index + 2), 16) ^ key);
  }
  return Buffer.from(bytes).toString("utf8");
}

function restoreCloudflareProtectedEmails(value) {
  return value.replace(
    /<a\b(?=[^>]*\bclass=["'][^"']*\b__cf_email__\b[^"']*["'])(?=[^>]*\bdata-cfemail=["']([\da-f]+)["'])[^>]*>[\s\S]*?<\/a>/gi,
    (markup, hex) => decodeCloudflareEmail(hex) ?? markup,
  );
}

const SEMANTIC_BLOCK_TAGS = new Set([
  "address", "article", "aside", "blockquote", "caption", "dd", "details",
  "dialog", "div", "dl", "dt", "fieldset", "figcaption", "figure", "footer",
  "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "li",
  "main", "nav", "ol", "p", "pre", "section", "summary", "table", "tbody",
  "td", "tfoot", "th", "thead", "tr", "ul",
]);
const SEMANTIC_HIDDEN_TAGS = new Set(["script", "style", "svg", "template"]);

function normalizedText(value) {
  // Preserve authored inline text exactly while treating layout elements as
  // word boundaries. Scan actual tags instead of tag-shaped text: Astro stores
  // the complete source Markdown in a quoted `data-markdown` attribute, where
  // code fixtures legitimately contain strings such as `<h2>` and `<script>`.
  // Decode entities only after removing actual markup, otherwise an authored
  // `&lt;Component&gt;` code sample is mistaken for an HTML element and lost.
  const source = restoreCloudflareProtectedEmails(value)
    .replace(/<!--[\s\S]*?-->/g, " ");
  let text = "";
  let cursor = 0;
  let hiddenDepth = 0;

  for (const token of htmlTagTokens(source)) {
    if (hiddenDepth === 0 && token.index > cursor) {
      text += source.slice(cursor, token.index);
    }

    const hidden = SEMANTIC_HIDDEN_TAGS.has(token.tagName);
    if (token.closing) {
      if (hidden) hiddenDepth = Math.max(0, hiddenDepth - 1);
      if (hiddenDepth === 0 && SEMANTIC_BLOCK_TAGS.has(token.tagName)) text += " ";
    } else {
      if (
        hiddenDepth === 0
        && (hidden || token.tagName === "br" || SEMANTIC_BLOCK_TAGS.has(token.tagName))
      ) {
        text += " ";
      }
      if (hidden && !token.selfClosing) hiddenDepth += 1;
    }
    cursor = token.end;
  }
  if (hiddenDepth === 0 && cursor < source.length) text += source.slice(cursor);

  return decodeHtml(text)
    .replace(/\s+/gu, " ")
    .trim();
}

/** Return visible, real heading elements without inspecting quoted attributes. */
function visibleHeadingInnerHtml(source, wantedTagNames) {
  const wanted = new Set(wantedTagNames);
  const openHeadings = new Map([...wanted].map((tagName) => [tagName, []]));
  const matches = [];
  let hiddenDepth = 0;

  for (const token of htmlTagTokens(source)) {
    const hidden = SEMANTIC_HIDDEN_TAGS.has(token.tagName);
    if (token.closing) {
      if (hidden) {
        hiddenDepth = Math.max(0, hiddenDepth - 1);
        continue;
      }
      if (hiddenDepth > 0 || !wanted.has(token.tagName)) continue;
      const opening = openHeadings.get(token.tagName)?.pop();
      if (opening) {
        matches.push({
          index: opening.index,
          tagName: token.tagName,
          inner: source.slice(opening.end, token.index),
        });
      }
      continue;
    }

    if (hiddenDepth === 0 && wanted.has(token.tagName) && !token.selfClosing) {
      openHeadings.get(token.tagName)?.push(token);
    }
    if (hidden && !token.selfClosing) hiddenDepth += 1;
  }

  return matches.sort((left, right) => left.index - right.index);
}

function isDetailRoute(path, section) {
  const normalized = path.replace(/\/+$/, "") || "/";
  return normalized.startsWith(`/${section}/`);
}

/**
 * Select the authoritative page-content region for semantic parity.
 *
 * The Astro and Next implementations intentionally place equivalent desktop
 * and mobile navigation controls in different DOM order. Comparing all of
 * `<main>` would therefore count duplicated TOC/sidebar labels as article
 * changes. Detail routes use their single article, while Streams uses the
 * identically labelled stream list. The page-level h1 remains audited from
 * the complete rendered main so a missing title cannot be hidden by this
 * projection.
 */
export function semanticTextProjection(html, path = "/") {
  const main = resolveRenderedMainHtml(html);
  let regionName = "main";
  let content = main;
  let regionFound = true;

  if (["blog", "changelog", "shorts"].some((section) => isDetailRoute(path, section))) {
    regionName = "article";
    const article = elementInnerHtmlByTag(main, "article");
    regionFound = article !== null;
    content = article ?? main;
    // Astro nests responsive TOC controls inside the article while Next keeps
    // them beside it. They repeat the same labels and are audited visually and
    // interactively, but are not part of the authored Markdown projection.
    content = withoutElementById(withoutElementsByTag(content, "aside"), "mobile-control");
  } else if ((path.replace(/\/+$/, "") || "/") === "/streams") {
    regionName = "stream-list";
    const streamList = elementInnerHtmlByAttribute(main, "aria-label", "Stream list");
    regionFound = streamList !== null;
    content = streamList ?? main;
  }

  const headings = { h1: [], h2: [], h3: [] };
  // A page has one authoritative title. Code examples can contain literal
  // `<h1>` markup that Astro and the Next highlighter wrap differently; only
  // the first page-level heading participates in this contract.
  headings.h1 = visibleHeadingInnerHtml(main, ["h1"])
    .slice(0, 1)
    .map((match) => normalizedText(match.inner));
  const contentHeadings = visibleHeadingInnerHtml(content, ["h2", "h3"]);
  for (const level of [2, 3]) {
    headings[`h${level}`] = contentHeadings
      .filter((match) => match.tagName === `h${level}`)
      .map((match) => normalizedText(match.inner));
  }

  return {
    regionName,
    regionFound,
    headings,
    text: normalizedText(content),
  };
}

export function semanticBodyContract(html, path = "/") {
  const projection = semanticTextProjection(html, path);
  const text = projection.text;

  return {
    regionName: projection.regionName,
    regionFound: projection.regionFound,
    headings: JSON.stringify(projection.headings),
    textBytes: Buffer.byteLength(text),
    textHash: sha256(text),
    textSample: text.slice(0, 240),
  };
}

/**
 * Remove only Cloudflare's documented, prepended Managed Content injection.
 *
 * The application-owned robots body is otherwise byte-for-byte significant.
 * A marker found after application directives, an incomplete marker pair, or
 * an unknown preamble is deliberately left untouched so it produces a parity
 * failure rather than masking a real robots policy change.
 */
export function normalizeCloudflareManagedRobots(body) {
  const source = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const text = source.toString("utf8");
  const beginIndex = text.indexOf(CLOUDFLARE_ROBOTS_BEGIN);
  if (beginIndex < 0) return { body: source, managedInjectionRemoved: false };

  const preamble = text.slice(0, beginIndex);
  const isMarkerFirst = beginIndex === 0;
  const isKnownCloudflarePreamble = preamble.startsWith(CLOUDFLARE_ROBOTS_PREAMBLE_START)
    && preamble.split(/\r?\n/).every((line) => !line || line.startsWith("#"));
  if (!isMarkerFirst && !isKnownCloudflarePreamble) {
    return { body: source, managedInjectionRemoved: false };
  }

  const endIndex = text.indexOf(CLOUDFLARE_ROBOTS_END, beginIndex + CLOUDFLARE_ROBOTS_BEGIN.length);
  if (endIndex < 0) return { body: source, managedInjectionRemoved: false };

  const afterMarker = text.slice(endIndex + CLOUDFLARE_ROBOTS_END.length);
  // Cloudflare places one line ending after its end marker and one separator
  // line before the untouched application body. Consume at most those two.
  const applicationBody = afterMarker.replace(/^(?:\r?\n){1,2}/, "");
  return { body: Buffer.from(applicationBody), managedInjectionRemoved: true };
}

export function exactBodyResult(path, reference, candidate, normalizer = (value) => ({ body: value })) {
  const normalizedReference = normalizer(reference.body);
  const normalizedCandidate = normalizer(candidate.body);
  const referenceHash = sha256(normalizedReference.body);
  const candidateHash = sha256(normalizedCandidate.body);
  return {
    path,
    referenceStatus: reference.response.status,
    candidateStatus: candidate.response.status,
    referenceBytes: normalizedReference.body.length,
    candidateBytes: normalizedCandidate.body.length,
    referenceHash,
    candidateHash,
    equal: reference.response.status === candidate.response.status && referenceHash === candidateHash,
    normalization: {
      referenceManagedContentRemoved: normalizedReference.managedInjectionRemoved === true,
      candidateManagedContentRemoved: normalizedCandidate.managedInjectionRemoved === true,
    },
  };
}
