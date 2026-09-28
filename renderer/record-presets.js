// Video shapes for Script > Record, and the crop that gives each shape from a
// camera frame. Pure data and maths, no DOM: main (src/recording.js), the
// renderer (window.CueRecordPresets) and node tests all load this one file.
(function () {
  // Measured on the owner's Mac (AVFoundation, 2026-09-28): the MacBook Pro
  // camera gives 1920x1080, 1080x1920, 1552x1552 and 1328x1760 at 30 fps; the
  // iPhone through Continuity Camera gives up to 1920x1440 and 1920x1080 at
  // 60 fps, landscape only. Neither gives 4K: for 4K the iPhone records in its own
  // Camera app and cue is only the prompter ('prompter').
  const PRESETS = {
    landscape: {
      label: 'Landscape 16:9',
      aspect: 16 / 9,
      request: { width: 1920, height: 1080 },
      usual: 'Usual for YouTube, LinkedIn, Upwork and anything watched on a computer.',
      camera: 'Either camera gives full 1920x1080; the iPhone also gives 60 fps.'
    },
    portrait: {
      label: 'Portrait 9:16',
      aspect: 9 / 16,
      request: { width: 1080, height: 1920 },
      usual: 'Usual for Reels, TikTok, YouTube Shorts and Stories.',
      camera: 'Best on the MacBook camera: it films 1080x1920 as is. The iPhone through the Mac is landscape only, so portrait from it is a smaller crop.'
    },
    square: {
      label: 'Square 1:1',
      aspect: 1,
      request: { width: 1552, height: 1552 },
      usual: 'Usual for feed posts on Instagram and LinkedIn.',
      camera: 'Best on the MacBook camera (1552x1552 as is).'
    },
    feed: {
      label: 'Feed 4:5',
      aspect: 4 / 5,
      request: { width: 1328, height: 1760 },
      usual: 'Usual for Instagram and Facebook feed posts, the tallest a feed shows.',
      camera: 'Best on the MacBook camera.'
    },
    prompter: {
      label: 'Prompter only (record 4K on your iPhone)',
      aspect: 0,
      request: null,
      usual: 'cue shows the script and records nothing. Mount the iPhone on top of the screen, record in its Camera app in 4K, and read the text under it.',
      camera: 'The only way to 4K: the Mac\'s cameras stop at 1920x1080.'
    }
  };
  const PRESET_IDS = Object.keys(PRESETS);
  const DEFAULT_PRESET = 'landscape';

  // The part of a srcW x srcH frame that has the preset's shape, centred:
  // { sx, sy, sw, sh } in whole, even pixels (H.264 wants even sizes).
  function cropFor(srcW, srcH, aspect) {
    const even = (n) => Math.max(2, Math.floor(n / 2) * 2);
    if (!(srcW > 0 && srcH > 0 && aspect > 0)) return { sx: 0, sy: 0, sw: even(srcW || 2), sh: even(srcH || 2) };
    let sw = srcW;
    let sh = srcW / aspect;
    if (sh > srcH) { sh = srcH; sw = srcH * aspect; }
    sw = even(sw);
    sh = even(sh);
    return { sx: Math.floor((srcW - sw) / 2), sy: Math.floor((srcH - sh) / 2), sw, sh };
  }

  // The microphone check before Start: the loudest moment of the last second
  // or so (peak, 0 to 1). Speech well placed peaks around -20 to -6 dBFS.
  const QUIET_DB = -40;
  const LOUD_DB = -3;
  function micVerdict(peak) {
    const db = peak > 0 ? 20 * Math.log10(peak) : -Infinity;
    if (db < QUIET_DB) return { level: 'quiet', text: 'Too quiet. Speak up, move closer, or check the microphone is the right one.' };
    if (db > LOUD_DB) return { level: 'loud', text: 'Too loud, it may crackle. Move back a little.' };
    return { level: 'good', text: 'Sounds good.' };
  }

  const api = { PRESETS, PRESET_IDS, DEFAULT_PRESET, cropFor, micVerdict };
  if (typeof window !== 'undefined') window.CueRecordPresets = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
