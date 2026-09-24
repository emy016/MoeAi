/**
 * One mark, every page.
 *
 * The MoeAI mark is a red M of two overlapping peaks, each a band with a
 * black outline and a white cut between them — traced from the brand image
 * into two filled paths (the black outline layer under the red layer), so it
 * stays sharp at any size and weighs under 1 KB.
 */
(function () {
  var INK = "M35.5 15.6L0 92.3L0 105L60.1 73.3L119.8 105.1L120 92.2L84.3 14.9L60 51.4L35.9 14.9ZM36.6 29.8L5.6 95.9L52.9 69.9L38.5 50.2L20.2 84.9L9.8 91.1L37.4 36.6L60.1 68.5L82.9 36.6L110.2 90.9L100.1 85.4L81.6 50.2L67.2 69.9L114.3 95.7L83.2 29.5L60.1 63.7L36.9 29.5Z";
  var RED = "M35.7 17.2L1 92.5L1 103.4L60.3 72.4L119 103.6L119 92.5L84.2 16.8L60.1 53L36.1 16.9ZM36.5 27.9L3.8 97.8L39.4 78.7L54.2 70.1L38.3 48.5L19.4 84.5L12 88.7L37.6 38.4L59.9 70L82.8 38.4L108 88.8L100.8 84.6L81.7 48.5L65.9 70.1L116.2 97.8L83.5 27.7L60.1 62.1L36.8 27.6Z";

  function markup() {
    return '<svg class="moe-mark-svg" viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true" '
      + 'style="display:block;overflow:visible">'
      + '<path fill="#0e0404" fill-rule="evenodd" d="' + INK + '"/>'
      + '<path fill="#ea4349" fill-rule="evenodd" d="' + RED + '"/>'
      + "</svg>";
  }

  function paint() {
    var marks = document.querySelectorAll(".brand-mark, .nav-logo-mark, .mark, [data-moe-mark]");
    for (var i = 0; i < marks.length; i++) {
      var el = marks[i];
      if (el.dataset.moePainted) continue;
      el.innerHTML = markup();
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
