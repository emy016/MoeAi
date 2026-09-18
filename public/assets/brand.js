/**
 * One mark, every page.
 *
 * The MoeAI mark is two overlapping triangles, each drawn as a nested outline —
 * so every edge reads as a pair of neon lines, and the two long bars cross
 * below the valley. Each page used to draw its own idea of a logo (a book
 * glyph here, a graduation cap there); this replaces all of them, and points
 * the favicon at the same geometry.
 */
(function () {
  var PATHS = [
    "M 9.3 95.6 L 37.8 25.2 L 58.0 64.8 Z M 0.3 106.4 L 37.0 11.2 L 66.4 67.2 Z",
    "M 62.0 64.8 L 82.2 25.2 L 110.7 95.6 Z M 53.6 67.2 L 83.0 11.2 L 119.7 106.4 Z",
  ];
  var STOPS = [
    ["0%", "#22d3ee"], ["15%", "#3b82f6"], ["30%", "#d946ef"],
    ["50%", "#fb1e4e"], ["70%", "#f97316"], ["100%", "#fde047"],
  ];
  var seq = 0;

  function markup(glow) {
    var id = "moe-mark-" + (seq++);
    var stops = STOPS.map(function (s) {
      return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"/>';
    }).join("");
    // Below about 40px the bloom swallows the gap between the paired lines,
    // so small marks are drawn flat.
    var filter = glow
      ? '<filter id="f' + id + '" x="-40%" y="-40%" width="180%" height="180%">'
        + '<feGaussianBlur stdDeviation="1.7" result="s"/><feMerge>'
        + '<feMergeNode in="s"/><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
      : "";
    return '<svg class="moe-mark-svg" viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true" '
      + 'style="display:block;overflow:visible">'
      + '<defs><linearGradient id="g' + id + '" x1="0" y1="0" x2="120" y2="0" gradientUnits="userSpaceOnUse">'
      + stops + "</linearGradient>" + filter + "</defs>"
      + '<g fill="none" stroke="url(#g' + id + ')" stroke-width="2.4" stroke-linejoin="miter" stroke-miterlimit="8"'
      + (glow ? ' filter="url(#f' + id + ')"' : "") + ">"
      + PATHS.map(function (d) { return '<path d="' + d + '"/>'; }).join("")
      + "</g></svg>";
  }

  function paint() {
    var marks = document.querySelectorAll(".brand-mark, .nav-logo-mark, .mark, [data-moe-mark]");
    for (var i = 0; i < marks.length; i++) {
      var el = marks[i];
      if (el.dataset.moePainted) continue;
      var box = el.getBoundingClientRect();
      el.innerHTML = markup(Math.max(box.width, box.height) >= 40);
      el.dataset.moePainted = "1";
      el.setAttribute("aria-hidden", "true");
      // The tile these used to sit on was the logo. Now the mark is.
      el.style.background = "none";
      el.style.boxShadow = "none";
      el.style.borderRadius = "0";
      el.style.clipPath = "none";
    }
  }

  function favicon() {
    var existing = document.querySelectorAll('link[rel~="icon"]');
    for (var i = 0; i < existing.length; i++) existing[i].remove();
    var link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/svg+xml";
    link.href = "/favicon.svg";
    document.head.appendChild(link);
  }

  function boot() { favicon(); paint(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  // Pages that build their nav after load get a second pass.
  window.addEventListener("load", paint);
})();
