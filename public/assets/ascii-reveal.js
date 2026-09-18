/**
 * ASCII Reveal — ported from the Originkit React component to plain JS so the
 * static pages can use it.
 *
 * The image is redrawn as characters. Move the pointer over it and a soft blob,
 * trailing a few frames behind, wipes the characters away to show the photo
 * underneath. That is the whole idea: the notes resolve into the real thing
 * when you look closely, which is the argument EduMoe is making anyway.
 *
 * The sampler canvas holds one pixel per character cell, so the per-frame cost
 * is the cell grid, not the image.
 */
(function () {
  const RAMP = " .:-=+*#%@";
  const DEFAULTS = {
    fit: "contain", focusY: 50, columns: 120, contrast: 15,
    invert: false, colorMode: "image", inkColor: "#FFFFFF",
    revealSize: 78, revealSoftness: 30,
  };

  function placeRect(imgW, imgH, boxW, boxH, fit, focusY) {
    const scale = fit === "contain"
      ? Math.min(boxW / imgW, boxH / imgH)
      : Math.max(boxW / imgW, boxH / imgH);
    const dw = imgW * scale, dh = imgH * scale;
    const f = fit === "cover" ? Math.min(100, Math.max(0, focusY)) / 100 : 0.5;
    return { dx: (boxW - dw) / 2, dy: (boxH - dh) * f, dw, dh };
  }

  function mount(canvas, options) {
    const o = Object.assign({}, DEFAULTS, options);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const punch = 0.5 + (o.contrast / 100) * 2;
    const pointer = { x: -9999, y: -9999, inside: false };
    const blobs = Array.from({ length: 5 }, () => ({ x: 0, y: 0 }));
    let seeded = false, raf = 0, alive = true, image = null;
    let off = null, sampler = null, photo = null, mask = null;
    let cover = { dx: 0, dy: 0, dw: 0, dh: 0 };

    const size = () => ({
      w: canvas.clientWidth || 600,
      h: canvas.clientHeight || 600,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
    });

    function layer(existing) {
      const el = existing || document.createElement("canvas");
      if (el.width !== canvas.width || el.height !== canvas.height) {
        el.width = canvas.width; el.height = canvas.height;
      }
      return el;
    }

    function build() {
      if (!image) return;
      const { w, h, dpr } = size();
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));

      const cols = Math.max(8, Math.round(o.columns));
      const cellW = (w * dpr) / cols;
      const fontPx = cellW * 1.7;
      const cellH = fontPx;
      const rows = Math.max(1, Math.floor((h * dpr) / cellH));

      sampler = sampler || document.createElement("canvas");
      sampler.width = cols; sampler.height = rows;
      const sctx = sampler.getContext("2d", { willReadFrequently: true });
      if (!sctx) return;

      const place = placeRect(image.width, image.height, canvas.width, canvas.height, o.fit, o.focusY);
      sctx.clearRect(0, 0, cols, rows);
      sctx.drawImage(image, place.dx / cellW, place.dy / cellH, place.dw / cellW, place.dh / cellH);

      let data;
      try { data = sctx.getImageData(0, 0, cols, rows).data; }
      catch (e) { image = null; return; }   // tainted canvas: give up quietly

      off = layer(off);
      const octx = off.getContext("2d");
      if (!octx) return;
      octx.clearRect(0, 0, off.width, off.height);
      octx.font = fontPx.toFixed(2) + "px ui-monospace, monospace";
      octx.textBaseline = "top";

      const last = RAMP.length - 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = (r * cols + c) * 4;
          const rr = data[i], gg = data[i + 1], bb = data[i + 2];
          let lum = (0.299 * rr + 0.587 * gg + 0.114 * bb) / 255;
          // The artwork was cut out onto true black. At a low contrast setting
          // even zero maps into the ramp, which would fill the empty frame with
          // dots, so cells with no light in them are left blank.
          if (lum <= 0.012) continue;
          // What is left is a lit object, whose midtones need a lift before the
          // contrast pass or the art reads as a handful of scattered marks.
          lum = Math.pow(lum, 0.62);
          lum = (lum - 0.5) * punch + 0.5;
          if (o.invert) lum = 1 - lum;
          lum = lum < 0 ? 0 : lum > 1 ? 1 : lum;
          const ch = RAMP[Math.round(lum * last)];
          if (ch === " ") continue;
          octx.fillStyle = o.colorMode === "image"
            ? `rgb(${Math.min(255, rr + 72)},${Math.min(255, gg + 72)},${Math.min(255, bb + 72)})`
            : o.inkColor;
          octx.fillText(ch, c * cellW, r * cellH);
        }
      }
      cover = place;
    }

    function step() {
      const { dpr } = size();
      const tx = pointer.x * dpr, ty = pointer.y * dpr;
      if (!seeded) { for (const b of blobs) { b.x = tx; b.y = ty; } seeded = true; return; }
      blobs[0].x += (tx - blobs[0].x) * 0.35;
      blobs[0].y += (ty - blobs[0].y) * 0.35;
      for (let i = 1; i < blobs.length; i++) {
        blobs[i].x += (blobs[i - 1].x - blobs[i].x) * 0.35;
        blobs[i].y += (blobs[i - 1].y - blobs[i].y) * 0.35;
      }
    }

    function paint() {
      if (!off) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(off, 0, 0);
      if (!pointer.inside || !image) return;

      const { dpr } = size();
      photo = layer(photo); mask = layer(mask);
      const pctx = photo.getContext("2d"), mctx = mask.getContext("2d");
      if (!pctx || !mctx) return;

      pctx.globalCompositeOperation = "source-over";
      pctx.clearRect(0, 0, photo.width, photo.height);
      pctx.drawImage(image, cover.dx, cover.dy, cover.dw, cover.dh);

      mctx.clearRect(0, 0, mask.width, mask.height);
      mctx.save();
      mctx.filter = `blur(${(o.revealSoftness * dpr).toFixed(1)}px)`;
      mctx.fillStyle = "#FFFFFF";
      for (let i = 0; i < blobs.length; i++) {
        const t = i / (blobs.length - 1);
        mctx.beginPath();
        mctx.arc(blobs[i].x, blobs[i].y, o.revealSize * dpr * (1 - t * 0.5), 0, Math.PI * 2);
        mctx.fill();
      }
      mctx.restore();

      pctx.globalCompositeOperation = "destination-in";
      pctx.drawImage(mask, 0, 0);
      pctx.globalCompositeOperation = "source-over";
      ctx.drawImage(photo, 0, 0);
    }

    function loop() { if (!alive) return; step(); paint(); raf = requestAnimationFrame(loop); }

    canvas.addEventListener("pointermove", event => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left, y = event.clientY - rect.top;
      pointer.x = x; pointer.y = y;
      pointer.inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
    });
    canvas.addEventListener("pointerleave", () => { pointer.inside = false; seeded = false; });

    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (!alive) return;
      image = img; build(); paint();
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) raf = requestAnimationFrame(loop);
    };
    img.onerror = () => { canvas.dataset.failed = "1"; };
    img.src = o.src;

    if (typeof ResizeObserver !== "undefined") {
      let pending = 0;
      new ResizeObserver(() => {
        clearTimeout(pending);
        pending = setTimeout(() => { build(); paint(); }, 120);
      }).observe(canvas);
    }
    return () => { alive = false; cancelAnimationFrame(raf); };
  }

  function boot() {
    document.querySelectorAll("canvas[data-ascii-src]").forEach(canvas => {
      mount(canvas, {
        src: canvas.dataset.asciiSrc,
        columns: Number(canvas.dataset.asciiColumns) || DEFAULTS.columns,
        revealSize: Number(canvas.dataset.asciiReveal) || DEFAULTS.revealSize,
        contrast: canvas.dataset.asciiContrast ? Number(canvas.dataset.asciiContrast) : DEFAULTS.contrast,
      });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
