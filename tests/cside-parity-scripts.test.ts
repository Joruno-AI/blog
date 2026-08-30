import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import test from "node:test";

// @ts-ignore Node executes these audit utilities directly as ESM JavaScript.
import {
  CLOUDFLARE_ROBOTS_BEGIN,
  CLOUDFLARE_ROBOTS_END,
  CLOUDFLARE_ROBOTS_PREAMBLE_START,
  EXPECTED_AUDITED_ROUTE_COUNT,
  EXPECTED_SITEMAP_ROUTE_COUNT,
  exactBodyResult,
  normalizeCloudflareManagedRobots,
  resolveRenderedMainHtml,
  semanticBodyContract,
} from "../scripts/cside-parity-core.mjs";
// @ts-ignore Node executes these audit utilities directly as ESM JavaScript.
import { isolatedRequest } from "../scripts/isolated-http.mjs";

test("keeps the C-side audit pinned to all 1,395 route, metadata and semantic body contracts", () => {
  assert.equal(EXPECTED_SITEMAP_ROUTE_COUNT, 1_393);
  assert.equal(EXPECTED_AUDITED_ROUTE_COUNT, 1_395);
  const source = readFileSync("scripts/verify-cside-route-parity.mjs", "utf8");
  assert.match(source, /sitemapRoutePaths\.length !== EXPECTED_SITEMAP_ROUTE_COUNT/);
  assert.match(source, /allRoutePaths\.length !== EXPECTED_AUDITED_ROUTE_COUNT/);
  assert.match(source, /!fullRouteAudit[\s\S]*routeMismatches\.length/);
  assert.match(source, /semanticBodyContract/);
  assert.match(source, /semanticRouteMismatches/);
  assert.match(source, /semanticMismatchFamilies/);
  assert.match(source, /routesByFamily: familySamples/);
  assert.match(source, /reviewDocsCatalog: docsCatalogResult/);
});

test("semantic audits resolve Next streamed server content instead of its loading fallback", () => {
  const html = [
    '<main id="main"><!--$?--><template id="B:0"></template>',
    '<div class="site-loading">loading</div><!--/$--></main>',
    '<aside><h1>persistent dialog</h1></aside>',
    '<div hidden id="S:0"><article><div><h1>Rendered page</h1></div>',
    "<p>complete server body</p><code>$$ $& $' $` $&lt;month&gt;</code></article><!--$--><!--/$--></div>",
    '<script>$RV()</script>',
  ].join("");

  const rendered = resolveRenderedMainHtml(html);
  assert.match(rendered, /Rendered page/);
  assert.match(rendered, /complete server body/);
  assert.match(rendered, /\$\$ \$& \$' \$` \$&lt;month&gt;/);
  assert.doesNotMatch(rendered, /site-loading|persistent dialog/);
});

test("semantic detail audits compare the primary article instead of incidental TOC order", () => {
  const reference = [
    '<main><h1>Same title</h1><aside>alpha beta duplicated toc</aside>',
    '<article class="slide-enter-content prose"><aside>desktop toc</aside>',
    '<div id="mobile-control"><nav><div>mobile toc</div></nav></div>',
    '<h2>Section</h2><p>Authoritative body.</p></article></main>',
  ].join("");
  const candidate = [
    '<main><h1>Same title</h1>',
    '<article class="prose blog-article-body"><h2>Section</h2><p>Authoritative body.</p></article>',
    '<aside>duplicated toc beta alpha</aside></main>',
  ].join("");

  assert.deepEqual(
    semanticBodyContract(reference, "/blog/example/"),
    semanticBodyContract(candidate, "/blog/example/"),
  );

  const changed = candidate.replace("Authoritative body.", "Changed primary body.");
  assert.notEqual(
    semanticBodyContract(reference, "/blog/example/").textHash,
    semanticBodyContract(changed, "/blog/example/").textHash,
  );
});

test("semantic detail discovery ignores tag-shaped source stored in HTML attributes", () => {
  const reference = [
    '<main><header><div class="post-actions" data-markdown="return <article>{post.content}</article>">',
    "actions</div></header>",
    '<article class="slide-enter-content prose"><h2>Visible section</h2><p>Visible body.</p></article></main>',
  ].join("");
  const candidate = [
    '<main><header><div class="post-actions" data-markdown="encoded source">actions</div></header>',
    '<article class="prose blog-article-body"><h2>Visible section</h2><p>Visible body.</p></article></main>',
  ].join("");

  assert.deepEqual(
    semanticBodyContract(reference, "/blog/attribute-source/"),
    semanticBodyContract(candidate, "/blog/attribute-source/"),
  );
});

test("semantic article text and headings ignore complete Markdown stored in quoted attributes", () => {
  const reference = [
    '<main><h1>Real title</h1><article>',
    '<div class="post-actions" data-markdown=\'```html\n<h2 data-label="a > b">Fake section</h2>\n',
    '<script>fake()</script>\n```\'>actions</div>',
    '<template><h2>Hidden template section</h2></template>',
    '<svg><h3>Hidden vector section</h3></svg>',
    '<h2>Visible section <span title="<h3>attribute heading</h3>">now</span></h2>',
    '<p>Visible <em>body</em>.</p></article></main>',
  ].join("");
  const candidate = [
    '<main><h1>Real title</h1><article>',
    '<div class="post-actions" data-markdown="encoded source">actions</div>',
    '<h2>Visible section <span title="encoded heading">now</span></h2>',
    '<p>Visible body.</p></article></main>',
  ].join("");

  assert.deepEqual(
    semanticBodyContract(reference, "/blog/attribute-markdown/"),
    semanticBodyContract(candidate, "/blog/attribute-markdown/"),
  );
});

test("semantic text ignores renderer-only inline token wrappers and preserves encoded code", () => {
  const reference = [
    '<main><h1>Code</h1><article><pre><code>',
    '<span>const</span><span> </span><span>value</span><span> </span><span>=</span><span> </span><span>1</span>',
    '</code></pre><button data-code="<Component prop=&#x22;x&#x22; />"></button>',
    '<p>&lt;Component&gt;</p></article></main>',
  ].join("");
  const candidate = '<main><h1>Code</h1><article><pre><code>const value = 1</code></pre><button data-code="&lt;Component prop=&quot;x&quot; /&gt;"></button><p>&#x3C;Component&gt;</p></article></main>';
  assert.deepEqual(
    semanticBodyContract(reference, "/blog/code/"),
    semanticBodyContract(candidate, "/blog/code/"),
  );
});

test("semantic text decodes Astro and React character references exactly once", () => {
  const reference = '<main><h1>Code</h1><article><pre><code>&#x26;amp; &#x26;lt; &#x26;quot;</code></pre></article></main>';
  const candidate = '<main><h1>Code</h1><article><pre><code>&amp;amp; &amp;lt; &amp;quot;</code></pre></article></main>';

  assert.deepEqual(
    semanticBodyContract(reference, "/blog/entities/"),
    semanticBodyContract(candidate, "/blog/entities/"),
  );
});

test("semantic audits restore Cloudflare email protection and ignore code-sample h1 tags", () => {
  const protectedEmail = "d1abb9b0bfb691b4a9b0bca1bdb4ffb2bebc";
  const reference = [
    '<main><h1>Article</h1><article><p>Contact ',
    `<a class="__cf_email__" data-cfemail="${protectedEmail}" href="/cdn-cgi/l/email-protection">[email&#160;protected]</a>`,
    '</p><h1>Heading inside a raw code fixture</h1></article></main>',
  ].join("");
  const candidate = '<main><h1>Article</h1><article><p>Contact zhang@example.com</p><p>Heading inside a raw code fixture</p></article></main>';
  assert.deepEqual(
    semanticBodyContract(reference, "/blog/cloudflare-email/"),
    semanticBodyContract(candidate, "/blog/cloudflare-email/"),
  );
});

test("semantic Streams audits compare the labelled stream list and still audit page h1", () => {
  const reference = '<main><h1>Streams</h1><nav>2024 2023</nav><div aria-label="Stream list"><p>Entry</p></div></main>';
  const candidate = '<main><nav>2023 2024</nav><h1>Streams</h1><div class="stream-list" aria-label="Stream list"><p>Entry</p></div></main>';
  assert.deepEqual(
    semanticBodyContract(reference, "/streams/"),
    semanticBodyContract(candidate, "/streams/"),
  );

  const missingTitle = candidate.replace("<h1>Streams</h1>", "");
  assert.notEqual(
    semanticBodyContract(reference, "/streams/").headings,
    semanticBodyContract(missingTitle, "/streams/").headings,
  );
});

test("removes only Cloudflare's prepended robots injection and preserves the application policy byte-for-byte", () => {
  const applicationRobots = Buffer.from(
    "User-agent: *\nAllow: /\nSitemap: https://wangshengliang.cn/sitemap-index.xml\n",
  );
  const injected = Buffer.from([
    CLOUDFLARE_ROBOTS_PREAMBLE_START,
    "# content signals:",
    "",
    CLOUDFLARE_ROBOTS_BEGIN,
    "User-agent: GPTBot",
    "Disallow: /",
    CLOUDFLARE_ROBOTS_END,
    "",
    applicationRobots.toString(),
  ].join("\n"));

  const normalized = normalizeCloudflareManagedRobots(injected);
  assert.equal(normalized.managedInjectionRemoved, true);
  assert.deepEqual(normalized.body, applicationRobots);

  const changedApplicationRobots = Buffer.from(applicationRobots.toString().replace("Allow: /", "Disallow: /private"));
  const reference = { response: { status: 200 }, body: injected };
  const candidate = { response: { status: 200 }, body: changedApplicationRobots };
  assert.equal(exactBodyResult("/robots.txt", reference, candidate, normalizeCloudflareManagedRobots).equal, false);
});

test("does not normalize marker-like content inside the application robots policy", () => {
  const markerInsideApplication = Buffer.from([
    "User-agent: *",
    "Allow: /",
    CLOUDFLARE_ROBOTS_BEGIN,
    "User-agent: GPTBot",
    "Disallow: /",
    CLOUDFLARE_ROBOTS_END,
    "",
  ].join("\n"));
  const incompleteInjection = Buffer.from(`${CLOUDFLARE_ROBOTS_BEGIN}\nUser-agent: GPTBot\n`);

  const markerResult = normalizeCloudflareManagedRobots(markerInsideApplication);
  assert.equal(markerResult.managedInjectionRemoved, false);
  assert.strictEqual(markerResult.body, markerInsideApplication);
  const incompleteResult = normalizeCloudflareManagedRobots(incompleteInjection);
  assert.equal(incompleteResult.managedInjectionRemoved, false);
  assert.strictEqual(incompleteResult.body, incompleteInjection);
});

test("retries a transient response on a fresh non-keep-alive socket", async (t) => {
  let calls = 0;
  const sockets = new Set();
  const server = createServer((request, response) => {
    calls += 1;
    sockets.add(request.socket);
    assert.equal(request.headers.connection, "close");
    if (calls === 1) {
      response.writeHead(503, { "Content-Type": "text/plain" });
      response.end("retry");
      return;
    }
    response.writeHead(200, { "Content-Type": "text/plain" });
    response.end("ok");
  });
  t.after(() => server.close());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  const result = await isolatedRequest(`http://127.0.0.1:${address.port}/fixture`, {
    attempts: 2,
    retryBaseDelayMs: 1,
    timeoutMs: 1_000,
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.toString(), "ok");
  assert.equal(result.attempt, 2);
  assert.equal(calls, 2);
  assert.equal(sockets.size, 2);
});
