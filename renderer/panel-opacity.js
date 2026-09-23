// The answer panel's see-through level: one source for the settings store
// (main process) and the slider (renderer), so the two ranges never drift.
(function () {
  // Below MIN white text stops being readable over a light page; MAX is just
  // short of fully opaque.
  const MIN = 0.3;
  const MAX = 0.97;
  const DEFAULT = 0.9;
  const FULL_BLUR_PX = 24;

  function normalize(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return DEFAULT;
    return Math.min(MAX, Math.max(MIN, Math.round(n * 100) / 100));
  }

  // Blur fades out with the tint, otherwise a light tint still smears the page
  // behind it and nothing there is readable. It is full at the default and above,
  // so the default look is unchanged.
  function blurFor(alpha) {
    const t = (normalize(alpha) - MIN) / (DEFAULT - MIN);
    return Math.round(FULL_BLUR_PX * Math.min(1, Math.max(0, t)));
  }

  const api = { MIN, MAX, DEFAULT, normalize, blurFor };
  if (typeof window !== 'undefined') window.PanelOpacity = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
