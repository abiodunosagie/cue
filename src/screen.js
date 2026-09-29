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

// atCursor: the display under the pointer instead of the primary one.
async function captureScreenshot({ atCursor = false } = {}) {
  const display = atCursor ? screen.getDisplayNearestPoint(screen.getCursorScreenPoint()) : screen.getPrimaryDisplay();
  const { width, height } = display.size;
  const scale = display.scaleFactor || 1;
  // Captured at the size the model gets (encodeScreenshot's cap), not at full
  // Retina size: the same image, made much faster. fit turns screen points into
  // pixels: the display's own scale, or less when that passes the cap.
  const fit = Math.min(scale, MAX_LONG_EDGE_PX / Math.max(width, height));
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: Math.round(width * fit), height: Math.round(height * fit) }
  });
  if (!sources.length) return null;
  const src = sources.find((s) => String(s.display_id) === String(display.id)) || sources[0];
  const img = src.thumbnail;
  if (!img || img.isEmpty()) return null;
  return encodeScreenshot(img); // data:image/jpeg;base64,...
}

// For the screen watcher: the primary display at the model's size with cue's
// own window (maskBounds, screen points) blacked out, plus a tiny bitmap of the
// same masked image for the change check.
async function captureMaskedScreen(maskBounds) {
  const shot = await captureMaskedPage(maskBounds);
  return shot && { thumb: shot.thumb, dataUrl: encodeScreenshot(shot.image) };
}

// The same capture, left unencoded: reading a coding question takes one every tick
// and encodes only the pages it keeps (src/scroll-reader.js). keepPanel: the
// image keeps what is under cue's panel, like a Cmd+H screenshot, and only the
// change-check thumb is masked (the panel's status line changes every page).
async function captureMaskedPage(maskBounds, { keepPanel = false } = {}) {
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
  const masked = maskImage(img, maskBounds, primary.bounds);
  return keepPanel ? { thumb: masked.thumb, image: img } : masked;
}

// Black out maskBounds (screen points, on a display at displayBounds) in img,
// then return the masked image and its tiny change-check bitmap.
function maskImage(img, maskBounds, displayBounds) {
  const size = img.getSize();
  const bitmap = img.toBitmap();
  maskRect(bitmap, size.width, size.height, scaleRect(maskBounds, displayBounds, size.width, size.height));
  const masked = nativeImage.createFromBitmap(bitmap, { width: size.width, height: size.height });
  const thumb = masked.resize({ width: THUMB_WIDTH, height: THUMB_HEIGHT, quality: 'good' }).toBitmap();
  return { thumb, image: masked };
}

module.exports = { captureScreenshot, captureMaskedScreen, captureMaskedPage, encodeScreenshot, MAX_LONG_EDGE_PX, JPEG_QUALITY, MAX_DATA_URL_BYTES };
