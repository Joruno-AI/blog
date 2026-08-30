/**
 * Bridge the opaque Archify iframe sandbox to the host viewer controls.
 * `allow-same-origin` deliberately stays disabled: the host and the official
 * Archify camera communicate only through a small postMessage command set.
 */
export const ARCHIFY_EMBED_CHANNEL = "archify-embed-v1";
export const ARCHIFY_EMBED_BRIDGE_MARKER = "data-archify-embed-bridge=\"v1\"";

function relaxEmbeddedZoomFloor(html) {
  // Archify's standalone reader intentionally starts at 100%. Embedded blog
  // canvases need a real zoom-out range for very wide diagrams. Patch only
  // the official camera's numeric floor; routing, focus, hit testing and all
  // semantic interactions continue to run through Archify.view.
  return html
    .replace(
      /next = Math\.max\(1, Math\.min\(3, Math\.round\(next \* 4\) \/ 4\)\);/g,
      "next = Math.max(0.25, Math.min(3, Math.round(next * 4) / 4));",
    )
    .replace(
      /var minimumScale = Math\.max\(1, Math\.min\(3, Number\(options\.minimumScale\) \|\| 1\)\);/g,
      "var minimumScale = Math.max(0.25, Math.min(3, Number(options.minimumScale) || 0.25));",
    )
    .replace(/outBtn\.disabled = state\.scale <= 1;/g, "outBtn.disabled = state.scale <= 0.25;")
    .replace(
      /Archify\.view\.reveal\(\[id\], \{ includeNeighbors: true, reason: 'focus' \}\);/g,
      "if (document.documentElement.getAttribute('data-embed') !== 'true') Archify.view.reveal([id], { includeNeighbors: true, reason: 'focus' });",
    );
}

const ARCHIFY_EMBED_BRIDGE = String.raw`<script ${ARCHIFY_EMBED_BRIDGE_MARKER}>
(function () {
  'use strict';
  var CHANNEL = '${ARCHIFY_EMBED_CHANNEL}';
  // Match the host viewer's 25% minimum so a wide diagram can be fitted
  // inside a small article column without clipping.
  var MIN_SCALE = 0.25;
  var MAX_SCALE = 3;

  function enableEmbeddedCamera() {
    if (document.documentElement.getAttribute('data-embed') !== 'true') return;
    var container = document.querySelector('.diagram-container');
    if (!container) return;

    // The standalone viewer sizes SVGs from their width. In a fullscreen
    // iframe the viewport can be wider than the diagram's authored ratio,
    // which used to crop the bottom of the graph. Let SVG preserveAspectRatio
    // perform a true contain fit against both available dimensions.
    document.documentElement.style.height = '100%';
    document.documentElement.style.width = '100%';
    if (document.body && document.body.style) {
      document.body.style.height = '100%';
      document.body.style.width = '100%';
    }
    var shell = typeof container.closest === 'function' ? container.closest('.container') : null;
    if (shell && shell.style) {
      shell.style.width = '100%';
      shell.style.height = '100%';
      shell.style.overflow = 'hidden';
    }
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.boxSizing = 'border-box';
    container.style.padding = '0';
    var svg = container.querySelector(':scope > svg, svg');
    if (svg && svg.style) {
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.style.setProperty('display', 'block', 'important');
      svg.style.setProperty('width', '100%', 'important');
      svg.style.setProperty('height', '100%', 'important');
      svg.style.setProperty('max-height', '100%', 'important');
    }

    // Embedded node selection keeps the complete map stationary and exposes
    // its real one-hop neighbourhood. The upstream focus attributes remain
    // authoritative; this override only replaces the standalone reader's
    // aggressive fade/reframe treatment, which looked like unrelated nodes
    // were being arbitrarily hidden inside an article canvas.
    if (!document.getElementById('archify-embed-focus-style')) {
      var focusStyle = document.createElement('style');
      focusStyle.id = 'archify-embed-focus-style';
      focusStyle.textContent =
        'html[data-embed="true"] svg[data-focus-active] [data-node-id]{opacity:.52!important}' +
        'html[data-embed="true"] svg[data-focus-active] [data-edge-from]{opacity:.34!important}' +
        'html[data-embed="true"] svg[data-focus-active] [data-focus-match]{opacity:1!important}';
      (document.head || document.documentElement).appendChild(focusStyle);
    }

    if (!container.hasAttribute('data-wide-diagram')) return;

    // Archify's narrow standalone-reader mode turns a wide diagram into a
    // horizontal scroller and intentionally pins its camera to scale 1. The
    // host embed already owns viewport sizing and navigation, so preserve the
    // shape as metadata while opting this camera into Archify's normal
    // pan/zoom path. This keeps centerAt() functional inside <=720px iframes.
    container.setAttribute('data-archify-embed-wide-diagram', 'true');
    container.removeAttribute('data-wide-diagram');
  }

  function camera() {
    enableEmbeddedCamera();
    return window.Archify && window.Archify.view ? window.Archify.view : null;
  }

  function applyTheme(value) {
    var theme = value === 'light' || value === 'dark' ? value : null;
    if (!theme) return false;
    var html = document.documentElement;
    // Embedded frames can be off-screen while the host initializes them;
    // Chromium pauses their CSS transitions at frame zero. Disable only the
    // document background transition so the requested palette is observable
    // immediately instead of remaining visually stuck on the old theme.
    if (document.body && document.body.style) {
      document.body.style.setProperty('transition', 'none', 'important');
    }
    var current = html.getAttribute('data-theme');
    var officialTheme = window.Archify && window.Archify.theme;
    if ((current === 'light' || current === 'dark') && current !== theme &&
        officialTheme && typeof officialTheme.toggle === 'function') {
      officialTheme.toggle();
    }
    // Keep the embed deterministic even if the official toolbar is absent or
    // a future runtime declines the toggle. Archify's complete palette is
    // keyed from this official data-theme contract.
    if (html.getAttribute('data-theme') !== theme) html.setAttribute('data-theme', theme);
    var button = document.getElementById('btn-theme');
    if (button) button.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
    return true;
  }

  function metrics() {
    var view = camera();
    var state = view && typeof view.state === 'function' ? view.state() : { scale: 1 };
    var svg = document.querySelector('.diagram-container > svg, .diagram-container svg');
    var box = svg && svg.viewBox ? svg.viewBox.baseVal : null;
    var width = box && Number(box.width) > 0 ? Number(box.width) : 16;
    var height = box && Number(box.height) > 0 ? Number(box.height) : 9;
    return {
      scale: Math.round((Number(state.scale) || 1) * 1000) / 1000,
      percent: Math.round((Number(state.scale) || 1) * 100),
      x: Math.round((Number(state.x) || 0) * 1000) / 1000,
      y: Math.round((Number(state.y) || 0) * 1000) / 1000,
      width: width,
      height: height,
      aspectRatio: width / height,
      theme: document.documentElement.getAttribute('data-theme') || null
    };
  }

  function report(type) {
    try {
      parent.postMessage({ channel: CHANNEL, type: type || 'state', payload: metrics() }, '*');
    } catch (_) {}
  }

  function clampScale(value) {
    value = Number(value);
    if (!Number.isFinite(value)) return null;
    return Math.max(MIN_SCALE, Math.min(MAX_SCALE, value));
  }

  function setScale(nextScale) {
    var view = camera();
    var next = clampScale(nextScale);
    if (!view || next === null) return false;
    if (next <= MIN_SCALE + 0.0001) {
      view.reset({ automatic: true });
      return true;
    }
    var viewport = typeof view.logicalViewport === 'function' ? view.logicalViewport() : null;
    if (!viewport || typeof view.centerAt !== 'function') return false;
    return view.centerAt(
      viewport.x + viewport.width / 2,
      viewport.y + viewport.height / 2,
      { scale: next, minimumScale: MIN_SCALE, instant: true }
    ) !== false;
  }

  function execute(command, value) {
    var view = camera();
    if (!view) return false;
    var state = typeof view.state === 'function' ? view.state() : { scale: 1 };
    if (command === 'zoom-in') return setScale((Number(state.scale) || 1) + 0.25);
    if (command === 'zoom-out') return setScale((Number(state.scale) || 1) - 0.25);
    if (command === 'set-zoom') return setScale(Number(value) / 100);
    if (command === 'set-theme') return applyTheme(value);
    if (command === 'fit' || command === 'reset') {
      // "Fit" is also the deterministic way back from a node-focused view:
      // clear Archify's semantic focus first, then restore the complete graph.
      var focus = window.Archify && window.Archify.focus;
      if (focus && typeof focus.active === 'function' && focus.active() && typeof focus.clear === 'function') {
        focus.clear({ preserveView: true, restoreFocus: false });
      }
      view.reset({ automatic: true });
      return true;
    }
    return command === 'get-state';
  }

  window.addEventListener('message', function (event) {
    if (event.source !== parent) return;
    var message = event.data;
    if (!message || message.channel !== CHANNEL || message.type !== 'command') return;
    if (!execute(message.command, message.value)) return;
    // Opaque iframes below the fold can have requestAnimationFrame paused.
    // Report once synchronously so host controls/theme handshakes never wait
    // for visibility, then sample again on the next rendered frame.
    report('state');
    requestAnimationFrame(function () { report('state'); });
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    try { parent.postMessage({ channel: CHANNEL, type: 'escape' }, '*'); } catch (_) {}
  }, true);

  document.addEventListener('pointerup', function () { report('state'); }, { passive: true });
  window.addEventListener('resize', function () { report('state'); }, { passive: true });
  enableEmbeddedCamera();
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { report('ready'); });
  });
})();
</script>`;

export function withArchifyEmbedBridge(html) {
  if (typeof html !== "string" || !html.trim()) return html;
  let output = relaxEmbeddedZoomFloor(html);
  if (!/data-embed=["']true["']/i.test(output)) {
    output = output.replace(/<html\b([^>]*)>/i, '<html$1 data-embed="true">');
  }
  if (output.includes(ARCHIFY_EMBED_BRIDGE_MARKER)) return output;
  if (/<\/body>/i.test(output)) return output.replace(/<\/body>/i, `${ARCHIFY_EMBED_BRIDGE}\n</body>`);
  return `${output}\n${ARCHIFY_EMBED_BRIDGE}`;
}
