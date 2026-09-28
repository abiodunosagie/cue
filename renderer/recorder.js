// The camera side of Script > Record (main owns the file, src/recording.js).
// One camera stream is opened for the preview and kept for the take, so the
// framing the candidate saw is what gets recorded. When the camera's own mode
// already has the preset's shape it is recorded as is; otherwise a canvas cuts
// the centred part out first (the iPhone through the Mac is landscape only).
// The preview is mirrored like a mirror; the file never is.
(function () {
  // Measured on the owner's Mac: the encoder settles near 7 Mbps from the MacBook
  // camera and 18 Mbps from the iPhone whatever is asked; this is the ceiling.
  const VIDEO_BPS = 24000000;
  const AUDIO_BPS = 192000;
  const CHUNK_MS = 1000;
  const TYPES = ['video/mp4;codecs=avc1.64002A,mp4a.40.2', 'video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4'];

  let stream = null;      // camera + mic, as opened
  let streamKey = '';
  let crop = null;        // { sx, sy, sw, sh } when a canvas cuts the frame
  let canvasStream = null;
  let drawing = 0;
  let recorder = null;
  let takeId = '';
  let queue = Promise.resolve();
  let writeError = '';

  async function devices() {
    const list = await navigator.mediaDevices.enumerateDevices();
    const pick = (kind) => list.filter((d) => d.kind === kind && d.deviceId && d.deviceId !== 'default')
      .map((d) => ({ id: d.deviceId, label: d.label || (kind === 'videoinput' ? 'Camera' : 'Microphone') }));
    return { cameras: pick('videoinput'), mics: pick('audioinput') };
  }

  function stopStream() {
    cancelAnimationFrame(drawing);
    drawing = 0;
    if (canvasStream) canvasStream.getTracks().forEach((t) => t.stop());
    canvasStream = null;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    streamKey = '';
    crop = null;
  }

  // Opens (or keeps) the camera and mic for this preset and shows them in
  // `video`. Resolves { width, height, fps, cropped } of what will be recorded.
  async function preview(video, { cameraId, micId, preset }) {
    const p = window.CueRecordPresets.PRESETS[preset];
    if (!p || !p.request) { stopStream(); video.srcObject = null; return null; }
    const key = [cameraId, micId, preset].join('|');
    if (!stream || streamKey !== key) {
      stopStream();
      stream = await navigator.mediaDevices.getUserMedia({
        // resizeMode none: the camera's own modes, never a copy Chromium scaled.
        video: { deviceId: cameraId ? { exact: cameraId } : undefined, width: { ideal: p.request.width }, height: { ideal: p.request.height }, frameRate: { ideal: 60 }, resizeMode: 'none' },
        // A voice recording: no echo cancelling (nothing plays back), noise kept down.
        audio: { deviceId: micId ? { exact: micId } : undefined, echoCancellation: false, noiseSuppression: true, autoGainControl: true, sampleRate: 48000 }
      });
      streamKey = key;
    }
    const s = stream.getVideoTracks()[0].getSettings();
    const exact = Math.abs(s.width / s.height - p.aspect) < 0.01;
    crop = exact ? null : window.CueRecordPresets.cropFor(s.width, s.height, p.aspect);
    video.srcObject = stream;
    video.style.aspectRatio = String(p.aspect);
    video.style.objectFit = 'cover';
    await video.play().catch(() => {});
    return { width: crop ? crop.sw : s.width, height: crop ? crop.sh : s.height, fps: Math.round(s.frameRate || 30), cropped: !!crop };
  }

  // The stream the recorder takes: the camera as is, or the canvas cut.
  function recordStream() {
    if (!crop) return stream;
    const video = document.createElement('video');
    video.muted = true;
    video.srcObject = new MediaStream(stream.getVideoTracks());
    video.play().catch(() => {});
    const canvas = document.createElement('canvas');
    canvas.width = crop.sw;
    canvas.height = crop.sh;
    const ctx = canvas.getContext('2d');
    const fps = Math.round(stream.getVideoTracks()[0].getSettings().frameRate || 30);
    const draw = () => {
      if (video.readyState >= 2) ctx.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, crop.sw, crop.sh);
      drawing = requestAnimationFrame(draw);
    };
    draw();
    canvasStream = canvas.captureStream(fps);
    return new MediaStream([...canvasStream.getVideoTracks(), ...stream.getAudioTracks()]);
  }

  // Starts a take. Resolves { file } or throws with a message to show.
  async function start({ scriptName, preset, take }) {
    if (!stream) throw new Error('The camera is not on.');
    if (recorder) throw new Error('Already recording.');
    const mimeType = TYPES.find((t) => MediaRecorder.isTypeSupported(t));
    if (!mimeType) throw new Error('This computer cannot record MP4 video.');
    const begun = await window.cue.recordBegin({ scriptName, preset, take });
    if (!begun || begun.error) throw new Error((begun && begun.error) || 'The video file could not be created.');
    takeId = begun.id;
    writeError = '';
    queue = Promise.resolve();
    recorder = new MediaRecorder(recordStream(), { mimeType, videoBitsPerSecond: VIDEO_BPS, audioBitsPerSecond: AUDIO_BPS });
    const id = takeId;
    // Chunks go to disk in order, one at a time.
    recorder.ondataavailable = (e) => {
      if (!e.data || !e.data.size) return;
      queue = queue.then(async () => {
        const res = await window.cue.recordChunk(id, await e.data.arrayBuffer());
        if (res && !res.ok && !writeError) writeError = res.error || 'The video could not be written.';
      });
    };
    recorder.start(CHUNK_MS);
    return { file: begun.file };
  }

  // Ends the take. Resolves main's result: { path, bytes, remuxed } or { error }.
  async function stop() {
    if (!recorder) return null;
    const r = recorder;
    recorder = null;
    await new Promise((resolve) => {
      if (r.state === 'inactive') { resolve(); return; }
      r.onstop = resolve;
      r.stop();
    });
    await queue;
    cancelAnimationFrame(drawing);
    drawing = 0;
    if (canvasStream) canvasStream.getTracks().forEach((t) => t.stop());
    canvasStream = null;
    const res = await window.cue.recordEnd(takeId);
    takeId = '';
    if (writeError && res && !res.error) res.warning = writeError;
    return res;
  }

  window.CueRecorder = {
    devices,
    preview,
    start,
    stop,
    // Everything off: the camera light goes out.
    close: () => { if (!recorder) stopStream(); },
    recording: () => !!recorder
  };
})();
