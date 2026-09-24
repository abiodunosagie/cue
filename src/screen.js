// Screenshot via desktopCapturer (main process).
// The first call can trigger the system permission prompt for the app.
const { desktopCapturer, screen, nativeImage } = require('electron');
const { maskRect, scaleRect, THUMB_WIDTH, THUMB_HEIGHT } = require('./screen-watch');

// Vision models downscale anything larger than ~1568 px on the long edge
// anyway, and a gateway sitting on Vercel refuses request bodies over 4.5 MB
// before any route code runs (413, with no body the app can shape). A Retina
// PNG of a busy screen is commonly 5–15 MB, so every screenshot is resized to
// this long edge and encoded as JPEG before it is base64'd into the prompt.
const MAX_LONG_EDGE_PX = 1568;
const JPEG_QUALITY = 70;
// What the encoded data URL must stay under so the whole request, prompt and
// all, fits in the gateway's 4 MB request rule with room to spare.
const MAX_DATA_URL_BYTES = 3 * 1024 * 1024;

/**
 * Downscale a NativeImage to the long-edge cap (never upscale) and encode it as
 * a JPEG data URL. Pure with respect to Electron: the image is duck-typed
 * (getSize / resize / toJPEG), so it is unit-testable without a display.
 */
function encodeScreenshot(img, { maxLongEdge = MAX_LONG_EDGE_PX, quality = JPEG_QUALITY } = {}) {
  const { width, height } = img.getSize();
  let out = img;
  if (width > maxLongEdge || height > maxLongEdge) {
    out = width >= height ? img.resize({ width: maxLongEdge }) : img.resize({ height: maxLongEdge });
  }
  const jpeg = out.toJPEG(quality);
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
}

async function captureScreenshot() {
  const primary = screen.getPrimaryDisplay();
  const { width, height } = primary.size;
  const scale = primary.scaleFactor || 1;
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: Math.floor(width * scale), height: Math.floor(height * scale) }
  });
  if (!sources.length) return null;
  // Prefer the primary display source.
  const src = sources.find((s) => String(s.display_id) === String(primary.id)) || sources[0];
  const img = src.thumbnail;
  if (!img || img.isEmpty()) return null;
  return encodeScreenshot(img); // data:image/jpeg;base64,...
}

// For the screen watcher: the primary display at the model's size with cue's
// own window (maskBounds, screen points) blacked out, plus a tiny bitmap of the
// same masked image for the change check.
async function captureMaskedScreen(maskBounds) {
  const primary = screen.getPrimaryDisplay();
  const { width, height } = primary.size;
  const scale = Math.min(1, MAX_LONG_EDGE_PX / Math.max(width, height));
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: Math.round(width * scale), height: Math.round(height * scale) }
  });
  if (!sources.length) return null;
  const src = sources.find((s) => String(s.display_id) === String(primary.id)) || sources[0];
  const img = src.thumbnail;
  if (!img || img.isEmpty()) return null;
  return maskAndEncode(img, maskBounds, primary.bounds);
}

// Black out maskBounds (screen points, on a display at displayBounds) in img,
// then return the tiny change-check bitmap and the JPEG for the model.
function maskAndEncode(img, maskBounds, displayBounds) {
  const size = img.getSize();
  const bitmap = img.toBitmap();
  maskRect(bitmap, size.width, size.height, scaleRect(maskBounds, displayBounds, size.width, size.height));
  const masked = nativeImage.createFromBitmap(bitmap, { width: size.width, height: size.height });
  const thumb = masked.resize({ width: THUMB_WIDTH, height: THUMB_HEIGHT, quality: 'good' }).toBitmap();
  return { thumb, dataUrl: encodeScreenshot(masked) };
}

module.exports = { captureScreenshot, captureMaskedScreen, maskAndEncode, encodeScreenshot, MAX_LONG_EDGE_PX, JPEG_QUALITY, MAX_DATA_URL_BYTES };
