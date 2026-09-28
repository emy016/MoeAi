/**
 * Braille ASCII art, animated: a Canvas2D take on the "artezonafoda" look
 * (21st.dev community ASCII effect) with these settings:
 *   renderMode "braille", cellSize 7, contrast 150%, brightness 0,
 *   saturation 100%, coverage 100%, bgMode "none", tint off,
 *   animated "shimmer" at animSpeed 100 and animIntensity 60, no post effects.
 *
 * Pipeline: the photo is drawn once into a sampler canvas at two sub-pixels
 * per cell across and four down (the braille dot grid). Each frame, every
 * cell's eight sub-pixels are compared against a threshold after the
 * contrast curve; lit ones become braille dots, painted straight into a pixel
 * buffer in the cell's average colour (glyphs from fonts differ between
 * devices and read as bars; painted dots look the same everywhere and cost
 * less than thousands of fillText calls). The shimmer is a soft diagonal band that
 * sweeps across, lifting brightness and dot count as it passes. Transparent
 * pixels draw nothing. It pauses off-screen and draws one still frame when
 * the visitor prefers reduced motion.
 *
 * Usage: <canvas data-braille-src="/assets/moeai-hand.webp"></canvas>
 */
(function () {
  var CELL = 7, CONTRAST = 1.5, BRIGHTNESS = 0, SATURATION = 1, SPEED = 1, INTENSITY = 0.6, THRESHOLD = 0.34;
  // Braille dot bit for sub-pixel (x, y) inside a 2 x 4 cell.
  var BITS = [[0x01, 0x08], [0x02, 0x10], [0x04, 0x20], [0x40, 0x80]];

  function mount(canvas) {
    var src = canvas.getAttribute('data-braille-src');
    if (!src) return;
    var img = new Image();
    img.decoding = 'async';
    img.src = src;
    var ctx = canvas.getContext('2d');
    var sampler = document.createElement('canvas');
    var sctx = sampler.getContext('2d', { willReadFrequently: true });
    var buffer = null, pixels = null, base = null, cols = 0, rows = 0, lum = null, rgb = null, alpha = null, W = 0, H = 0, dpr = 1, ox = 0, oy = 0;
    var visible = true, raf = 0, last = 0, start = performance.now();
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function pageColour() {
      var probe = getComputedStyle(document.documentElement).getPropertyValue('--bg1').trim() || getComputedStyle(document.body).backgroundColor;
      var t = document.createElement('canvas').getContext('2d'); t.fillStyle = '#07070b'; t.fillStyle = probe; t.fillRect(0, 0, 1, 1);
      var d = t.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]];
    }
    function layout() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      if (!W || !H || !img.naturalWidth) return false;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var scale = Math.min(W / img.naturalWidth, H / img.naturalHeight);
      var dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
      ox = (W - dw) / 2; oy = (H - dh) / 2;
      cols = Math.max(8, Math.floor(dw / CELL)); rows = Math.max(8, Math.floor(dh / (CELL * 2)));
      buffer = ctx.createImageData(canvas.width, canvas.height); pixels = new Uint32Array(buffer.data.buffer);
      base = new Uint32Array(pixels.length);
      sampler.width = cols * 2; sampler.height = rows * 4;
      sctx.clearRect(0, 0, sampler.width, sampler.height);
      sctx.drawImage(img, 0, 0, sampler.width, sampler.height);
      var data = sctx.getImageData(0, 0, sampler.width, sampler.height).data, n = sampler.width * sampler.height;
      lum = new Float32Array(n); alpha = new Float32Array(n); rgb = new Uint8ClampedArray(cols * rows * 3);
      var sum = new Float32Array(cols * rows * 4);
      for (var i = 0; i < n; i++) {
        var r = data[i * 4] / 255, g = data[i * 4 + 1] / 255, b = data[i * 4 + 2] / 255, a = data[i * 4 + 3] / 255;
        var l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        l = (l - 0.5) * CONTRAST + 0.5 + BRIGHTNESS;
        lum[i] = Math.max(0, Math.min(1, l)); alpha[i] = a;
        var x = i % sampler.width, y = (i / sampler.width) | 0, c = ((y >> 2) * cols + (x >> 1)) * 4;
        sum[c] += r * a; sum[c + 1] += g * a; sum[c + 2] += b * a; sum[c + 3] += a;
      }
      // The book's silhouette, filled with the page colour, sits under the
      // dots: the page grid stops at its edge instead of running through it.
      var bg = pageColour(), little0 = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;
      var fill = little0 ? (215 << 24) | (bg[2] << 16) | (bg[1] << 8) | bg[0] : (bg[0] << 24) | (bg[1] << 16) | (bg[2] << 8) | 215;
      var cw = CELL * dpr, ch = CELL * 2 * dpr, bx = ox * dpr, by = oy * dpr;
      for (var cy2 = 0; cy2 < rows; cy2++) for (var cx2 = 0; cx2 < cols; cx2++) {
        var any = 0;
        for (var sy2 = 0; sy2 < 4; sy2++) for (var sx2 = 0; sx2 < 2; sx2++) { var ii = (cy2 * 4 + sy2) * (cols * 2) + cx2 * 2 + sx2; if (data[ii * 4 + 3] > 128) any++; }
        if (any < 5) continue;
        var x0c = Math.floor(bx + cx2 * cw), x1c = Math.ceil(bx + (cx2 + 1) * cw), y0c = Math.floor(by + cy2 * ch), y1c = Math.ceil(by + (cy2 + 1) * ch);
        for (var yy2 = Math.max(0, y0c); yy2 < Math.min(canvas.height, y1c); yy2++) { var row2 = yy2 * canvas.width; for (var xx2 = Math.max(0, x0c); xx2 < Math.min(canvas.width, x1c); xx2++) base[row2 + xx2] = fill; }
      }
      for (var k = 0; k < cols * rows; k++) {
        var w = sum[k * 4 + 3] || 1, rr = sum[k * 4] / w, gg = sum[k * 4 + 1] / w, bb = sum[k * 4 + 2] / w, grey = (rr + gg + bb) / 3;
        // Saturation, then lift so dark colours still read on a dark page.
        rr = grey + (rr - grey) * SATURATION; gg = grey + (gg - grey) * SATURATION; bb = grey + (bb - grey) * SATURATION;
        rgb[k * 3] = Math.min(255, 40 + rr * 235); rgb[k * 3 + 1] = Math.min(255, 40 + gg * 235); rgb[k * 3 + 2] = Math.min(255, 40 + bb * 235);
      }
      return true;
    }

    function frame(now) {
      raf = 0;
      if (!lum && !layout()) return;
      var t = ((now || performance.now()) - start) / 1000 * SPEED;
      pixels.set(base);
      var sw = cols * 2, band = (t * 0.35) % 1.6 - 0.3, PW = canvas.width, PH = canvas.height;
      var step = CELL / 2 * dpr, dot = Math.max(2, Math.round(1.9 * dpr)), x0 = ox * dpr + step / 2 - dot / 2, y0 = oy * dpr + step / 2 - dot / 2;
      var little = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;
      for (var cy = 0; cy < rows; cy++) {
        for (var cx = 0; cx < cols; cx++) {
          // Shimmer: a diagonal band sweeping across, plus a faint per-cell sparkle.
          var d = (cx / cols + cy / rows) / 2 - band;
          var glow = Math.exp(-d * d * 60) * INTENSITY + Math.sin(t * 3 + cx * 0.7 + cy * 1.3) * 0.05 * INTENSITY;
          var k = (cy * cols + cx) * 3, boost = 1 + glow * 0.9;
          var r = Math.min(255, rgb[k] * boost) | 0, g = Math.min(255, rgb[k + 1] * boost) | 0, b = Math.min(255, rgb[k + 2] * boost) | 0;
          var colour = little ? (255 << 24) | (b << 16) | (g << 8) | r : (r << 24) | (g << 16) | (b << 8) | 255;
          // Dark areas (the book, the hand) keep their shape as dimmer dots.
          var dr = (r * 0.5) | 0, dg = (g * 0.5) | 0, db = (b * 0.5) | 0;
          var dim = little ? (255 << 24) | (db << 16) | (dg << 8) | dr : (dr << 24) | (dg << 16) | (db << 8) | 255;
          var lit = 0;
          for (var sy = 0; sy < 4; sy++) {
            var row = (cy * 4 + sy) * sw + cx * 2;
            for (var sx = 0; sx < 2; sx++) {
              var i = row + sx;
              if (alpha[i] < 0.25) continue;
              var v = lum[i] + glow * 0.5;
              var c = v > THRESHOLD ? colour : dim;
              lit++;
              var px = Math.round(x0 + (cx * 2 + sx) * step), py = Math.round(y0 + (cy * 4 + sy) * step);
              for (var yy = py; yy < py + dot && yy < PH; yy++) { if (yy < 0) continue; var rowAt = yy * PW; for (var xx = px; xx < px + dot && xx < PW; xx++) if (xx >= 0) pixels[rowAt + xx] = c; }
            }
          }
        }
      }
      ctx.putImageData(buffer, 0, 0);
      if (!reduced && visible) schedule();
    }

    function schedule() {
      if (raf) return;
      raf = requestAnimationFrame(function (now) {
        if (now - last < 33) { raf = 0; schedule(); return; } // ~30 fps is plenty for a shimmer
        last = now; frame(now);
      });
    }

    img.onload = function () { lum = null; frame(); };
    // A theme switch changes the page colour under the silhouette.
    new MutationObserver(function () { lum = null; if (reduced || !raf) frame(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style', 'class'] });
    window.addEventListener('resize', function () { lum = null; if (reduced) frame(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible && !reduced) schedule();
      }).observe(canvas);
    }
  }

  function init() { document.querySelectorAll('canvas[data-braille-src]').forEach(mount); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
