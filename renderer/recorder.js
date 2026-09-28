// The camera side of Script > Record (main owns the file, src/recording.js).
// One camera stream is opened for the preview and kept for the take, so the
// framing the candidate saw is what gets recorded. When the camera's own mode
// already has the preset's shape it is recorded as is; otherwise the centred
// part is cut out of every frame first (the iPhone through the Mac is
// landscape only). The preview is mirrored like a mirror; the file never is.
(function () {
  // Measured on the owner's Mac: the encoder settles near 7 Mbps from the MacBook
  // camera and 18 to 24 Mbps from the iPhone whatever is asked; this is the ceiling.
  const VIDEO_BPS = 24000000;
  const AUDIO_BPS = 192000;
  const CHUNK_MS = 1000;
  const TYPES = ['video/mp4;codecs=avc1.64002A,mp4a.40.2', 'video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4'];

  let stream = null;      // camera + mic, as opened
  let streamKey = '';
  // Moves on every preview request and every close, so a request or a
  // delayed close from before cannot act on the camera a newer one owns.
  let generation = 0;
  let crop = null;        // { sx, sy, sw, sh } when frames are cut
  let cutting = null;     // the running cut: { stop() }
  let recorder = null;
  let takeId = '';
  let queue = Promise.resolve();
  let writeError = '';
  let meterCtx = null;
  let meterRaf = 0;

  async function devices() {
    const list = await navigator.mediaDevices.enumerateDevices();
    const pick = (kind) => list.filter((d) => d.kind === kind && d.deviceId && d.deviceId !== 'default')
      .map((d) => ({ id: d.deviceId, label: d.label || (kind === 'videoinput' ? 'Camera' : 'Microphone') }));
    return { cameras: pick('videoinput'), mics: pick('audioinput') };
  }

  // The microphone meter: calls onPeak(0..1) with the loudest sample of each frame.
  function meter(onPeak) {
    stopMeter();
    const tracks = stream ? stream.getAudioTracks() : [];
    if (!tracks.length) return;
    meterCtx = new AudioContext();
    const analyser = meterCtx.createAnalyser();
    analyser.fftSize = 1024;
    meterCtx.createMediaStreamSource(new MediaStream(tracks)).connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    const tick = () => {
      analyser.getFloatTimeDomainData(buf);
      let peak = 0;
      for (const v of buf) { const a = Math.abs(v); if (a > peak) peak = a; }
      onPeak(peak);
      meterRaf = requestAnimationFrame(tick);
    };
    tick();
  }

  function stopMeter() {
    cancelAnimationFrame(meterRaf);
    meterRaf = 0;
    if (meterCtx) meterCtx.close().catch(() => {});
    meterCtx = null;
  }

  function stopCut() {
    if (cutting) cutting.stop();
    cutting = null;
  }

  function stopStream() {
    stopMeter();
    stopCut();
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    streamKey = '';
    crop = null;
  }

  // Opens (or keeps) the camera and mic for this preset and shows them in
  // `video`. Resolves { width, height, fps, cropped } of what will be recorded,
  // or null when a newer request took over meanwhile.
  async function preview(video, { cameraId, micId, preset }) {
    const mine = ++generation;
    const p = window.CueRecordPresets.PRESETS[preset];
    if (!p || !p.request) { stopStream(); video.srcObject = null; return null; }
    const key = [cameraId, micId, preset].join('|');
    if (!stream || streamKey !== key) {
      stopStream();
      const opened = await navigator.mediaDevices.getUserMedia({
        // resizeMode none: the camera's own modes, never a copy Chromium scaled.
        video: { deviceId: cameraId ? { exact: cameraId } : undefined, width: { ideal: p.request.width }, height: { ideal: p.request.height }, frameRate: { ideal: 60 }, resizeMode: 'none' },
        // A voice recording: no echo cancelling (nothing plays back), noise kept down.
        audio: { deviceId: micId ? { exact: micId } : undefined, echoCancellation: false, noiseSuppression: true, autoGainControl: true, sampleRate: 48000 }
      });
      // Overtaken while the camera opened: this stream is nobody's, so it goes off.
      if (mine !== generation) { opened.getTracks().forEach((t) => t.stop()); return null; }
      stopStream();
      stream = opened;
      streamKey = key;
    }
    const s = stream.getVideoTracks()[0].getSettings();
    const exact = Math.abs(s.width / s.height - p.aspect) < 0.01;
    crop = exact ? null : window.CueRecordPresets.cropFor(s.width, s.height, p.aspect);
    video.srcObject = stream;
    video.style.aspectRatio = String(p.aspect);
    video.style.objectFit = 'cover';
    await video.play().catch(() => {});
    const mic = stream.getAudioTracks()[0];
    // The devices really in use: with no choice saved, the system default, which the lists must show.
    return { width: crop ? crop.sw : s.width, height: crop ? crop.sh : s.height, fps: Math.round(s.frameRate || 30), cropped: !!crop,
      cameraId: s.deviceId || '', micId: mic ? mic.getSettings().deviceId || '' : '' };
  }

  // A video track of the cut frames. Each camera frame is cut as it arrives
  // (insertable streams), so nothing depends on the page being painted: a
  // canvas redrawn on animation frames would freeze while audio kept going.
  function cutTrack(source) {
    const processor = new MediaStreamTrackProcessor({ track: source });
    const generator = new MediaStreamTrackGenerator({ kind: 'video' });
    // Each frame is drawn cut into its own canvas and sent on with its own
    // timestamp. (Passing the cut as a visibleRect recorded black frames.)
    const canvas = new OffscreenCanvas(crop.sw, crop.sh);
    const ctx = canvas.getContext('2d');
    const c = crop;
    const abort = new AbortController();
    processor.readable
      .pipeThrough(new TransformStream({
        transform(frame, controller) {
          try {
            ctx.drawImage(frame, c.sx, c.sy, c.sw, c.sh, 0, 0, c.sw, c.sh);
            controller.enqueue(new VideoFrame(canvas, { timestamp: frame.timestamp }));
          } finally { frame.close(); }
        }
      }), { signal: abort.signal })
      .pipeTo(generator.writable, { signal: abort.signal })
      .catch(() => { /* stopped */ });
    cutting = { stop: () => { abort.abort(); generator.stop(); } };
    return generator;
  }

  // The stream the recorder takes: the camera as is, or its cut frames.
  function recordStream() {
    if (!crop) return stream;
    return new MediaStream([cutTrack(stream.getVideoTracks()[0]), ...stream.getAudioTracks()]);
  }

  // Starts a take. Resolves { file } or throws with a message to show.
  // onProblem(message): the camera or recorder failed mid-take.
  async function start({ scriptName, preset, take, onProblem }) {
    if (!stream) throw new Error('The camera is not on. Close the Script window, open it again and check the preview.');
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
    const r = recorder;
    // Chunks go to disk in order, one at a time.
    r.ondataavailable = (e) => {
      if (!e.data || !e.data.size) return;
      queue = queue.then(async () => {
        const res = await window.cue.recordChunk(id, await e.data.arrayBuffer());
        if (res && !res.ok && !writeError) writeError = res.error || 'The video could not be written.';
      });
    };
    const problem = (message) => { if (recorder === r && onProblem) onProblem(message); };
    r.onerror = (e) => problem('The recording stopped: ' + (e && e.error && e.error.message ? e.error.message : 'the recorder failed') + '.');
    for (const t of stream.getTracks()) {
      t.onended = () => problem(t.kind === 'video' ? 'The camera stopped (unplugged, asleep, or taken by another app).' : 'The microphone stopped.');
    }
    r.start(CHUNK_MS);
    return { file: begun.file };
  }

  // Ends the take. srt: this take's subtitles, or ''. Resolves main's result:
  // { path, bytes, remuxed, srt, subtitleTrack } or { error }.
  async function stop(srt = '') {
    if (!recorder) return null;
    const r = recorder;
    recorder = null;
    await new Promise((resolve) => {
      if (r.state === 'inactive') { resolve(); return; }
      r.onstop = resolve;
      r.stop();
    });
    await queue;
    stopCut();
    const res = await window.cue.recordEnd(takeId, { srt });
    takeId = '';
    if (writeError && res && !res.error && !res.warning) res.warning = writeError;
    return res;
  }

  window.CueRecorder = {
    devices,
    preview,
    meter,
    stopMeter,
    start,
    stop,
    // The camera owner right now: pass it back to close() from a delayed step.
    generation: () => generation,
    // Everything off: the camera light goes out. With `owner`, only if no
    // newer preview has taken the camera since.
    close: (owner) => {
      if (recorder) return;
      if (owner !== undefined && owner !== generation) return;
      generation++;
      stopStream();
    },
    recording: () => !!recorder
  };
})();
