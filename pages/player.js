'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const detectType = (url) => {
  if (!url) return 'mpd';
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (url.includes('.m3u8')) return 'hls';
  if (url.includes('.mp4')) return 'mp4';
  return 'mpd';
};
const getYtId = (url) => url?.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] || null;
const fmt = (s) => {
  if (!isFinite(s) || s < 0) return '0:00';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return h > 0 ? `${h}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}` : `${m}:${sec.toString().padStart(2,'0')}`;
};
const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const RK = (id) => `pw_resume_${id}`;

// ─── Seek Ripple ──────────────────────────────────────────────────────────────
function SeekRipple({ side, secs = 5 }) {
  return (
    <AnimatePresence>
      {side && (
        <motion.div
          key={side + Date.now()}
          initial={{ opacity: 0.9, scale: 0.8 }}
          animate={{ opacity: 0, scale: 1.5 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className={`absolute top-1/2 -translate-y-1/2 ${side === 'left' ? 'left-6' : 'right-6'} pointer-events-none z-30`}
        >
          <div className="w-16 h-16 rounded-full bg-white/25 flex items-center justify-center text-white text-2xl">
            {side === 'left' ? '⏪' : '⏩'}
          </div>
          <p className="text-white text-xs text-center mt-1 font-bold drop-shadow">
            {side === 'left' ? `-${secs}s` : `+${secs}s`}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Double-tap seek zones (mobile) ──────────────────────────────────────────
function TapZones({ onSeekLeft, onSeekRight, onTap }) {
  const leftTap  = useRef(null);
  const rightTap = useRef(null);

  const makeTapHandler = (side, onDoubleTap) => {
    let lastTap = 0;
    return (e) => {
      e.stopPropagation();
      const now = Date.now();
      if (now - lastTap < 300) {
        onDoubleTap();
        lastTap = 0;
      } else {
        lastTap = now;
        // Single tap — show/hide controls
        setTimeout(() => { if (lastTap !== 0) { onTap(); lastTap = 0; } }, 310);
      }
    };
  };

  return (
    <div className="absolute inset-0 flex z-10 pointer-events-none">
      <div
        className="flex-1 h-full pointer-events-auto"
        onTouchEnd={makeTapHandler('left', onSeekLeft)}
        onClick={makeTapHandler('left', onSeekLeft)}
      />
      <div
        className="flex-1 h-full pointer-events-auto"
        onTouchEnd={makeTapHandler('right', onSeekRight)}
        onClick={makeTapHandler('right', onSeekRight)}
      />
    </div>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ current, duration, buffered, onSeek }) {
  const barRef = useRef(null);
  const [hovering, setHovering] = useState(false);
  const [hoverPct, setHoverPct] = useState(0);

  const getPct = (e) => {
    const bar = barRef.current;
    if (!bar) return 0;
    return Math.max(0, Math.min(1, (e.clientX - bar.getBoundingClientRect().left) / bar.offsetWidth));
  };

  const progress = duration ? (current / duration) * 100 : 0;
  const buffPct = duration && buffered ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={barRef}
      className="relative h-1 group cursor-pointer"
      style={{ height: hovering ? '5px' : '3px', transition: 'height 0.15s' }}
      onClick={(e) => onSeek(getPct(e) * duration)}
      onMouseMove={(e) => { setHovering(true); setHoverPct(getPct(e) * 100); }}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Track */}
      <div className="absolute inset-0 bg-white/20 rounded-full" />
      {/* Buffered */}
      <div className="absolute inset-y-0 left-0 bg-white/30 rounded-full transition-all" style={{ width: `${buffPct}%` }} />
      {/* Progress */}
      <div className="absolute inset-y-0 left-0 bg-orange-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
      {/* Hover preview */}
      {hovering && (
        <div className="absolute inset-y-0 left-0 bg-white/10 rounded-full" style={{ width: `${hoverPct}%` }} />
      )}
      {/* Thumb */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-orange-500 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ left: `calc(${progress}% - 7px)` }}
      />
    </div>
  );
}

// ─── Controls ─────────────────────────────────────────────────────────────────
function Controls({ videoRef, playerRef, hlsRef, qualities, curQuality, onQuality, duration, buffered, title, onSeekRipple }) {
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [vol, setVol] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(() => parseFloat(localStorage.getItem('pw_speed') || '1'));
  const [showSpeed, setShowSpeed] = useState(false);
  const [showQuality, setShowQuality] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [fs, setFs] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const on = (ev, fn) => el.addEventListener(ev, fn);
    const off = (ev, fn) => el.removeEventListener(ev, fn);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setCurrent(el.currentTime);
    const onVol = () => { setVol(el.volume); setMuted(el.muted); };
    const onWait = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);
    on('play', onPlay); on('pause', onPause); on('timeupdate', onTime);
    on('volumechange', onVol); on('waiting', onWait); on('playing', onPlaying);
    return () => {
      off('play', onPlay); off('pause', onPause); off('timeupdate', onTime);
      off('volumechange', onVol); off('waiting', onWait); off('playing', onPlaying);
    };
  }, [videoRef]);

  useEffect(() => {
    const onFs = () => setFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const togglePlay = () => { const el = videoRef.current; el?.paused ? el.play() : el?.pause(); };
  const seek = (t) => { const el = videoRef.current; if (el) el.currentTime = Math.max(0, Math.min(t, el.duration || 0)); };
  const seekRel = (d) => { seek((videoRef.current?.currentTime || 0) + d); onSeekRipple(d > 0 ? 'right' : 'left'); };
  const changeVol = (v) => { const el = videoRef.current; if (el) { el.volume = v; el.muted = v === 0; } };
  const toggleMute = () => { const el = videoRef.current; if (el) el.muted = !el.muted; };
  const setSpeedVal = (s) => {
    const el = videoRef.current; if (el) el.playbackRate = s;
    setSpeed(s); setShowSpeed(false); localStorage.setItem('pw_speed', s);
  };
  const togglePip = async () => {
    try { document.pictureInPictureElement ? await document.exitPictureInPicture() : await videoRef.current?.requestPictureInPicture(); } catch (_) {}
  };
  const toggleFs = () => {
    const wrap = document.querySelector('.pw-player-wrap');
    document.fullscreenElement ? document.exitFullscreen() : wrap?.requestFullscreen();
  };

  const setQuality = (q) => {
    const hls = hlsRef?.current; const player = playerRef?.current;
    if (hls) hls.currentLevel = q.id;
    else if (player) { const t = player.getVariantTracks().find(t => t.id === q.id); if (t) player.selectVariantTrack(t, true); }
    onQuality(q);
    setShowQuality(false);
    localStorage.setItem('pw_quality', q.label);
  };

  return (
    <>
      {/* Buffering spinner */}
      <AnimatePresence>
        {buffering && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="w-14 h-14 rounded-full border-[3px] border-white/20 border-t-orange-500 animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom gradient + controls */}
      <div className="absolute inset-x-0 bottom-0 z-20">
        <div className="bg-gradient-to-t from-black/95 via-black/50 to-transparent pt-16 pb-2 px-3 space-y-1.5">
          {/* Title — mobile only */}
          <p className="text-white/80 text-xs font-medium truncate md:hidden">{title}</p>

          {/* Progress */}
          <ProgressBar current={current} duration={duration} buffered={buffered} onSeek={seek} />

          {/* Time */}
          <div className="flex items-center justify-between text-white/50 text-xs px-0.5">
            <span>{fmt(current)}</span>
            <span>{fmt(duration)}</span>
          </div>

          {/* Buttons row */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* Seek back */}
            <button onClick={() => seekRel(-5)}
              className="w-9 h-9 flex items-center justify-center text-white/80 hover:text-white rounded-lg hover:bg-white/10 active:bg-white/20 transition flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M12.5 3a9 9 0 1 0 9 9h-2a7 7 0 1 1-7-7V3z"/>
                <text x="8.5" y="14" fontSize="5.5" fontWeight="bold" fill="currentColor">5</text>
              </svg>
            </button>

            {/* Play/Pause */}
            <button onClick={togglePlay}
              className="w-11 h-11 flex items-center justify-center text-white hover:text-orange-400 transition rounded-xl hover:bg-white/10 active:bg-white/20 text-2xl flex-shrink-0">
              {playing ? '⏸' : '▶'}
            </button>

            {/* Seek forward */}
            <button onClick={() => seekRel(5)}
              className="w-9 h-9 flex items-center justify-center text-white/80 hover:text-white rounded-lg hover:bg-white/10 active:bg-white/20 transition flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M11.5 3a9 9 0 1 1-9 9h2a7 7 0 1 0 7-7V3z"/>
                <text x="8.5" y="14" fontSize="5.5" fontWeight="bold" fill="currentColor">5</text>
              </svg>
            </button>

            {/* Volume — hidden on small mobile */}
            <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
              <button onClick={toggleMute}
                className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white transition text-base">
                {muted || vol === 0 ? '🔇' : vol < 0.5 ? '🔉' : '🔊'}
              </button>
              <input type="range" min="0" max="1" step="0.02" value={muted ? 0 : vol}
                onChange={e => changeVol(parseFloat(e.target.value))}
                className="w-16 h-1 accent-orange-500 cursor-pointer" />
            </div>

            <div className="flex-1" />

            {/* Speed selector */}
            <div className="relative flex-shrink-0">
              <button onClick={() => { setShowSpeed(s => !s); setShowQuality(false); }}
                className="h-8 px-2 flex items-center gap-1 text-white/80 hover:text-white text-xs rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 transition font-mono">
                <span>⚡</span>
                <span className="hidden sm:inline">{speed}x</span>
                <span className="sm:hidden">{speed}x</span>
              </button>
              <AnimatePresence>
                {showSpeed && (
                  <motion.div initial={{ opacity: 0, y: 6, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.95 }} transition={{ duration: 0.15 }}
                    className="absolute bottom-10 right-0 bg-gray-950/98 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 min-w-[90px]">
                    <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider px-3 pt-2 pb-1">Speed</p>
                    {SPEEDS.map(s => (
                      <button key={s} onClick={() => setSpeedVal(s)}
                        className={`flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-white/10 active:bg-white/20 transition ${speed === s ? 'text-orange-400 font-bold' : 'text-white/80'}`}>
                        <span>{s}x</span>
                        {speed === s && <span className="text-orange-400 text-xs">✓</span>}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Quality selector */}
            {qualities.length > 1 && (
              <div className="relative flex-shrink-0">
                <button onClick={() => { setShowQuality(q => !q); setShowSpeed(false); }}
                  className="h-8 px-2 flex items-center gap-1 text-white/80 hover:text-white text-xs rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 transition">
                  <span>🎬</span>
                  <span>{curQuality}</span>
                </button>
                <AnimatePresence>
                  {showQuality && (
                    <motion.div initial={{ opacity: 0, y: 6, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.95 }} transition={{ duration: 0.15 }}
                      className="absolute bottom-10 right-0 bg-gray-950/98 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 min-w-[100px]">
                      <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider px-3 pt-2 pb-1">Quality</p>
                      {qualities.map(q => (
                        <button key={q.id} onClick={() => setQuality(q)}
                          className={`flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-white/10 active:bg-white/20 transition ${curQuality === q.label ? 'text-orange-400 font-bold' : 'text-white/80'}`}>
                          <span>{q.label}</span>
                          {curQuality === q.label && <span className="text-orange-400 text-xs">✓</span>}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* PiP — desktop only */}
            {typeof document !== 'undefined' && document.pictureInPictureEnabled && (
              <button onClick={togglePip}
                className="hidden sm:flex w-8 h-8 items-center justify-center text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition text-sm flex-shrink-0"
                title="Picture in Picture">
                ⧉
              </button>
            )}

            {/* Fullscreen */}
            <button onClick={toggleFs}
              className="w-9 h-9 flex items-center justify-center text-white/80 hover:text-white rounded-lg hover:bg-white/10 active:bg-white/20 transition text-base flex-shrink-0">
              {fs ? '⊡' : '⛶'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Notes Sidebar ────────────────────────────────────────────────────────────
function NotesSidebar({ batchId, subjectId, scheduleId, onClose }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!scheduleId) { setLoading(false); return; }
    fetch(`/api/pdfurl?batchId=${batchId || ''}&subjectId=${encodeURIComponent(subjectId || '')}&scheduleId=${scheduleId}`)
      .then(r => r.json())
      .then(d => setNotes(d.pdfs || []))
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  }, [scheduleId]);

  return (
    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute inset-y-0 right-0 w-72 bg-gray-900/95 backdrop-blur-xl border-l border-white/10 z-40 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <p className="text-white font-semibold text-sm">📄 Notes & Attachments</p>
        <button onClick={onClose} className="text-white/60 hover:text-white transition text-lg">×</button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && <div className="flex justify-center py-8"><div className="w-6 h-6 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" /></div>}
        {!loading && notes.length === 0 && <p className="text-white/40 text-sm text-center py-8">No notes available</p>}
        {notes.map((n, i) => (
          <a key={i} href={`/api/pdfproxy?url=${encodeURIComponent(n.url)}&filename=${encodeURIComponent(n.name || 'document.pdf')}&dl=1`}
            className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition group">
            <div className="w-9 h-9 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400 flex-shrink-0">📄</div>
            <div className="flex-1 min-w-0">
              <p className="text-white/90 text-xs font-medium truncate">{n.topic || n.name || 'Document'}</p>
              <p className="text-white/40 text-xs mt-0.5">Click to download</p>
            </div>
            <span className="text-emerald-400 text-xs opacity-0 group-hover:opacity-100 transition">⬇</span>
          </a>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main Player ──────────────────────────────────────────────────────────────
export default function Player() {
  const router = useRouter();
  const { video_id, batch_id, subject_id, schedule_id, title, mpd, url: qUrl } = router.query;

  const videoRef  = useRef(null);
  const playerRef = useRef(null);
  const hlsRef    = useRef(null);
  const wrapRef   = useRef(null);
  const hideTimer = useRef(null);

  const [phase, setPhase]       = useState('idle');
  const [loadPct, setLoadPct]   = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  const [videoUrl, setVideoUrl]   = useState('');
  const [videoType, setVideoType] = useState('');
  const [duration, setDuration]   = useState(0);
  const [buffered, setBuffered]   = useState(0);
  const [qualities, setQualities] = useState([]);
  const [curQuality, setCurQuality] = useState('Auto');

  const [showControls, setShowControls] = useState(true);
  const [seekRipple, setSeekRipple]     = useState(null);
  const [showNotes, setShowNotes]       = useState(false);

  const videoTitle = title ? decodeURIComponent(title) : 'Video Player';
  const resumeKey  = video_id ? RK(video_id) : null;

  const fail = useCallback((msg) => { setErrorMsg(msg); setPhase('error'); }, []);
  const step = useCallback((msg, pct) => { setStatusMsg(msg); setLoadPct(pct); }, []);

  // Auto-hide controls
  const resetHide = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    resetHide();
    return () => clearTimeout(hideTimer.current);
  }, []);

  // ── Resolve URL ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!router.isReady) return;
    setErrorMsg(''); setVideoUrl(''); setVideoType('');
    setLoadPct(0); setStatusMsg(''); setPhase('fetching');

    const direct = mpd || qUrl;
    if (direct) {
      setVideoUrl(direct); setVideoType(detectType(direct)); setPhase('loading'); return;
    }
    if (!video_id) { fail('No video ID provided'); return; }

    step('Fetching video URL...', 10);
    fetch(`/api/videourl?batchId=${batch_id || ''}&subjectId=${subject_id || ''}&findKey=${video_id}`)
      .then(r => r.json())
      .then(d => {
        if (!d.url) throw new Error(d.error || 'No URL returned');
        setVideoUrl(d.url); setVideoType(d.type || detectType(d.url)); setPhase('loading');
      })
      .catch(e => fail(e.message));
  }, [router.isReady, mpd, qUrl, video_id, retryKey]);

  // ── Init player ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'loading' || !videoUrl || !videoType) return;
    if (videoType === 'youtube') { setPhase('ready'); return; }
    const el = videoRef.current;
    if (!el) return;
    playerRef.current?.destroy().catch(() => {}); playerRef.current = null;
    hlsRef.current?.destroy(); hlsRef.current = null;
    if (videoType === 'hls') initHls(el, videoUrl);
    else initShaka(el, videoUrl);
  }, [phase, videoUrl, videoType]);

  // ── HLS ──────────────────────────────────────────────────────────────────────
  async function initHls(el, url) {
    try {
      step('Loading HLS...', 35);
      const Hls = (await import('hls.js')).default;
      if (!Hls.isSupported()) {
        if (el.canPlayType('application/vnd.apple.mpegurl')) {
          el.src = url; el.addEventListener('loadedmetadata', () => onReady(el), { once: true });
        } else fail('HLS not supported');
        return;
      }
      const hls = new Hls({ enableWorker: true, startLevel: -1 });
      hlsRef.current = hls;
      hls.loadSource(url); hls.attachMedia(el);
      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        const saved = localStorage.getItem('pw_quality');
        const qs = [{ id: -1, label: 'Auto' }, ...data.levels.map((l, i) => ({ id: i, label: l.height ? `${l.height}p` : `Level ${i}` }))];
        setQualities(qs);
        if (saved) { const idx = qs.findIndex(q => q.label === saved); if (idx > 0) hls.currentLevel = qs[idx].id; }
        onReady(el);
      });
      hls.on(Hls.Events.FRAG_BUFFERED, () => { if (el.buffered.length) setBuffered(el.buffered.end(el.buffered.length - 1)); });
      hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) fail('HLS: ' + d.details); });
    } catch (e) { fail(e.message); }
  }

  // ── Shaka ─────────────────────────────────────────────────────────────────────
  async function initShaka(el, url) {
    try {
      step('Loading player...', 25);
      const [shakaModule, drmData] = await Promise.all([
        import('shaka-player'),
        fetch(`/api/drm?findKey=${video_id || ''}&batchId=${batch_id || ''}&subjectId=${subject_id || ''}&mpdUrl=${encodeURIComponent(url)}`)
          .then(r => r.json()).catch(() => ({})),
      ]);
      step('Configuring DRM...', 55);
      const shaka = shakaModule.default;
      shaka.polyfill.installAll();
      if (!shaka.Player.isBrowserSupported()) { fail('Browser does not support DRM'); return; }

      const player = new shaka.Player();
      playerRef.current = player;
      await player.attach(el);

      const clearKeys = drmData?.clearKeys || {};
      const cfg = { streaming: { bufferingGoal: 60, rebufferingGoal: 3 } };
      if (Object.keys(clearKeys).length) cfg.drm = { clearKeys };
      player.configure(cfg);

      // Extract signed query params from MPD URL and attach to all segment requests
      let signedParams = '';
      try {
        const urlObj = new URL(url);
        if (urlObj.searchParams.has('Signature')) {
          signedParams = urlObj.search; // e.g. ?URLPrefix=...&Expires=...&Signature=...
        }
      } catch (_) {}

      // If signed, attach params to every segment request via network filter
      if (signedParams) {
        player.getNetworkingEngine().registerRequestFilter((type, request) => {
          if (!request.uris) return;
          request.uris = request.uris.map(uri => {
            if (uri.includes('sec-prod-mediacdn.pw.live') && !uri.includes('Signature=')) {
              return uri + (uri.includes('?') ? '&' : '?') + signedParams.slice(1);
            }
            return uri;
          });
        });
      }

      player.addEventListener('error', e => fail(`Shaka ${e.detail?.code || ''}: ${e.detail?.message || 'Playback error'}`));

      step('Loading video...', 75);

      // The URL is a CloudFront signed URL — try direct first (CORS may work),
      // then proxy as fallback
      let loaded = false;
      let lastErr = '';

      // Try 1: direct (signed URL may have CORS headers)
      try {
        await player.load(url);
        loaded = true;
        console.log('[Player] Loaded direct');
      } catch (e) {
        lastErr = e.message;
        console.warn('[Player] Direct failed:', e.message);
      }

      // Try 2: via proxy (server-side fetch, no CORS issue)
      if (!loaded) {
        try {
          const proxyUrl = `/api/stream?url=${encodeURIComponent(url)}`;
          await player.load(proxyUrl);
          loaded = true;
          console.log('[Player] Loaded via proxy');
        } catch (e) {
          lastErr = e.message;
          console.warn('[Player] Proxy failed:', e.message);
        }
      }

      if (!loaded) { fail('Shaka 1002: ' + lastErr); return; }

      const tracks = player.getVariantTracks();
      const seen = new Set();
      const qs = tracks.filter(t => { const k = t.height; if (seen.has(k)) return false; seen.add(k); return true; })
        .sort((a, b) => (b.height || 0) - (a.height || 0))
        .map(t => ({ id: t.id, label: t.height ? `${t.height}p` : 'Auto' }));
      if (qs.length > 1) {
        setQualities(qs);
        const saved = localStorage.getItem('pw_quality');
        if (saved) { const t = tracks.find(t => `${t.height}p` === saved); if (t) player.selectVariantTrack(t, true); }
      }
      onReady(el);
    } catch (e) { fail(e.message || 'Playback failed'); }
  }

  // ── On ready ─────────────────────────────────────────────────────────────────
  function onReady(el) {
    setPhase('ready'); setLoadPct(100);
    const s = parseFloat(localStorage.getItem('pw_speed') || '1');
    if (s !== 1) el.playbackRate = s;
    if (resumeKey) {
      const saved = parseFloat(localStorage.getItem(resumeKey) || '0');
      if (saved > 5) el.currentTime = saved;
    }
    el.addEventListener('timeupdate', () => {
      if (el.duration) setDuration(el.duration);
      if (el.buffered.length) setBuffered(el.buffered.end(el.buffered.length - 1));
      if (resumeKey && el.currentTime > 0 && Math.floor(el.currentTime) % 5 === 0)
        localStorage.setItem(resumeKey, el.currentTime);
    });
    el.play().catch(() => {});
  }

  const handleQuality = useCallback((q) => {
    setCurQuality(q.label);
    localStorage.setItem('pw_quality', q.label);
  }, []);

  const handleRetry = () => {
    setErrorMsg(''); setPhase('idle'); setVideoUrl(''); setVideoType('');
    setLoadPct(0); setStatusMsg(''); setRetryKey(k => k + 1);
  };

  const isLoading = ['fetching', 'loading'].includes(phase);
  const ytId = videoType === 'youtube' ? getYtId(videoUrl) : null;

  return (
    <>
      <Head>
        <title>{videoTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
        {/* Top bar */}
        <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="flex items-center gap-3 px-3 py-2.5 bg-black/80 backdrop-blur-md border-b border-white/5 flex-shrink-0 z-50">
          <button onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition flex-shrink-0">
            ←
          </button>
          <p className="text-white/90 text-sm font-medium truncate flex-1">{videoTitle}</p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {videoType && <span className="text-xs text-white/30 font-mono uppercase hidden sm:inline">{videoType}</span>}
            <button onClick={() => setShowNotes(n => !n)}
              className="px-2.5 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg transition">
              📄
            </button>
          </div>
        </motion.div>

        {/* Player + sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Player area — full width, 16:9 on mobile, fills remaining height */}
          <div className="flex-1 flex flex-col bg-black">
            <div
              ref={wrapRef}
              className="pw-player-wrap relative bg-black w-full"
              style={{ paddingTop: 'min(56.25%, calc(100vh - 48px))' }}
              onMouseMove={resetHide}
              onTouchStart={resetHide}
              onMouseLeave={() => { clearTimeout(hideTimer.current); hideTimer.current = setTimeout(() => setShowControls(false), 1500); }}
            >
              <div className="absolute inset-0">

                {/* YouTube */}
                {videoType === 'youtube' && ytId && (
                  <iframe className="w-full h-full" allowFullScreen
                    src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
                    title={videoTitle}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  />
                )}

                {/* Video element */}
                {(videoType === 'hls' || videoType === 'mpd' || videoType === 'mp4') && (
                  <video ref={videoRef} playsInline className="w-full h-full bg-black" controlsList="nodownload nofullscreen" />
                )}

                {/* Double-tap seek zones — works on mobile touch */}
                {phase === 'ready' && videoType !== 'youtube' && (
                  <TapZones
                    onSeekLeft={() => {
                      const el = videoRef.current;
                      if (el) el.currentTime = Math.max(0, el.currentTime - 5);
                      setSeekRipple('left');
                      setTimeout(() => setSeekRipple(null), 600);
                    }}
                    onSeekRight={() => {
                      const el = videoRef.current;
                      if (el) el.currentTime = Math.min(el.duration || 0, el.currentTime + 5);
                      setSeekRipple('right');
                      setTimeout(() => setSeekRipple(null), 600);
                    }}
                    onTap={resetHide}
                  />
                )}

                {/* Seek ripple */}
                <SeekRipple side={seekRipple} secs={5} />

                {/* Controls overlay */}
                <AnimatePresence>
                  {phase === 'ready' && showControls && (videoType !== 'youtube') && (
                    <motion.div key="controls" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }} className="absolute inset-0">
                      <Controls
                        videoRef={videoRef} playerRef={playerRef} hlsRef={hlsRef}
                        qualities={qualities} curQuality={curQuality} onQuality={handleQuality}
                        duration={duration} buffered={buffered} title={videoTitle}
                        onSeekRipple={(side) => { setSeekRipple(side); setTimeout(() => setSeekRipple(null), 500); }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Loading overlay */}
                <AnimatePresence>
                  {isLoading && (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-30">
                      <div className="relative mb-6">
                        <div className="w-16 h-16 rounded-full border-[3px] border-white/10 border-t-orange-500 animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-white/60 text-xs font-mono">{loadPct}%</span>
                        </div>
                      </div>
                      <p className="text-white/70 text-sm mb-4">{statusMsg}</p>
                      <div className="w-56 h-1 bg-white/10 rounded-full overflow-hidden">
                        <motion.div className="h-full bg-orange-500 rounded-full"
                          animate={{ width: `${loadPct}%` }} transition={{ duration: 0.4 }} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Error overlay */}
                <AnimatePresence>
                  {phase === 'error' && (
                    <motion.div key="error" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center bg-black/95 z-30">
                      <div className="text-center p-8 max-w-sm">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: 'spring' }}
                          className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
                          <span className="text-4xl">⚠️</span>
                        </motion.div>
                        <h3 className="text-white font-bold text-lg mb-2">Playback Error</h3>
                        <p className="text-red-400/80 text-sm mb-2">{errorMsg}</p>
                        {videoUrl && (
                          <p className="text-white/20 text-xs mb-6 break-all font-mono">
                            {videoUrl.substring(0, 80)}{videoUrl.length > 80 ? '...' : ''}
                          </p>
                        )}
                        <button onClick={handleRetry}
                          className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-orange-500/20">
                          🔄 Retry
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </div>
          </div>

          {/* Notes sidebar */}
          <AnimatePresence>
            {showNotes && (
              <NotesSidebar
                batchId={batch_id} subjectId={subject_id} scheduleId={schedule_id}
                onClose={() => setShowNotes(false)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
