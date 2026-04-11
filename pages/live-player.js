import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getYtId = (url) => url?.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] || null;
const fmt = (s) => {
  if (!isFinite(s) || s < 0) return 'LIVE';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
    : `${m}:${sec.toString().padStart(2, '0')}`;
};

// ─── Live Badge ───────────────────────────────────────────────────────────────
function LiveBadge() {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-600 rounded-full">
      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
      <span className="text-white text-xs font-bold tracking-wide">LIVE</span>
    </div>
  );
}

// ─── Double-tap seek zones ────────────────────────────────────────────────────
function TapZones({ onSeekLeft, onSeekRight, onTap }) {
  const makeTapHandler = (onDoubleTap) => {
    let lastTap = 0;
    return (e) => {
      e.stopPropagation();
      const now = Date.now();
      if (now - lastTap < 300) {
        onDoubleTap();
        lastTap = 0;
      } else {
        lastTap = now;
        setTimeout(() => { if (lastTap !== 0) { onTap(); lastTap = 0; } }, 310);
      }
    };
  };
  return (
    <div className="absolute inset-0 flex z-10 pointer-events-none">
      <div className="flex-1 h-full pointer-events-auto"
        onTouchEnd={makeTapHandler(onSeekLeft)} onClick={makeTapHandler(onSeekLeft)} />
      <div className="flex-1 h-full pointer-events-auto"
        onTouchEnd={makeTapHandler(onSeekRight)} onClick={makeTapHandler(onSeekRight)} />
    </div>
  );
}

// ─── Live Controls ────────────────────────────────────────────────────────────
function LiveControls({ videoRef, playerRef, hlsRef, qualities, curQuality, onQuality, liveTime, title }) {
  const [playing, setPlaying] = useState(true);
  const [vol, setVol] = useState(1);
  const [muted, setMuted] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [showQuality, setShowQuality] = useState(false);
  const [fs, setFs] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const h = {
      play: () => setPlaying(true),
      pause: () => setPlaying(false),
      volumechange: () => { setVol(el.volume); setMuted(el.muted); },
      waiting: () => setBuffering(true),
      playing: () => setBuffering(false),
      canplay: () => setBuffering(false),
    };
    Object.entries(h).forEach(([e, fn]) => el.addEventListener(e, fn));
    return () => Object.entries(h).forEach(([e, fn]) => el.removeEventListener(e, fn));
  }, [videoRef]);

  useEffect(() => {
    const onFs = () => setFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const togglePlay = () => { const el = videoRef.current; el?.paused ? el.play() : el?.pause(); };
  const toggleMute = () => { const el = videoRef.current; if (el) el.muted = !el.muted; };
  const changeVol = (v) => { const el = videoRef.current; if (el) { el.volume = v; el.muted = v === 0; } };
  const goLive = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.seekable?.length) el.currentTime = el.seekable.end(el.seekable.length - 1);
  };
  const togglePip = async () => {
    try { document.pictureInPictureElement ? await document.exitPictureInPicture() : await videoRef.current?.requestPictureInPicture(); } catch (_) {}
  };
  const toggleFs = () => {
    const wrap = document.querySelector('.live-player-wrap');
    document.fullscreenElement ? document.exitFullscreen() : wrap?.requestFullscreen();
  };
  const setQuality = (q) => {
    const hls = hlsRef?.current; const player = playerRef?.current;
    if (hls) hls.currentLevel = q.id;
    else if (player) { const t = player.getVariantTracks().find(t => t.id === q.id); if (t) player.selectVariantTrack(t, true); }
    onQuality(q); setShowQuality(false);
    localStorage.setItem('pw_live_quality', q.label);
  };

  return (
    <>
      {/* Buffering */}
      <AnimatePresence>
        {buffering && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="w-14 h-14 rounded-full border-[3px] border-white/20 border-t-red-500 animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top overlay — live badge + title */}
      <div className="absolute top-0 inset-x-0 z-20 bg-gradient-to-b from-black/80 to-transparent px-3 pt-3 pb-8">
        <div className="flex items-center gap-2">
          <LiveBadge />
          <p className="text-white/80 text-xs font-medium truncate flex-1">{title}</p>
          {liveTime > 0 && (
            <span className="text-white/50 text-xs font-mono">{fmt(liveTime)}</span>
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="absolute inset-x-0 bottom-0 z-20">
        <div className="bg-gradient-to-t from-black/95 via-black/50 to-transparent pt-10 pb-3 px-3">

          {/* Live progress bar — only shows buffer, no seeking back */}
          <div className="relative h-1 bg-white/15 rounded-full mb-2 overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-red-500 rounded-full w-full opacity-30" />
            <div className="absolute right-0 top-0 bottom-0 w-3 h-3 -mt-1 bg-red-500 rounded-full shadow-lg shadow-red-500/50" />
          </div>

          <div className="flex items-center gap-1">
            {/* Play/Pause */}
            <button onClick={togglePlay}
              className="w-10 h-10 flex items-center justify-center text-white hover:text-red-400 transition rounded-xl hover:bg-white/10 active:bg-white/20 text-xl flex-shrink-0">
              {playing ? '⏸' : '▶'}
            </button>

            {/* Go Live button */}
            <button onClick={goLive}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-red-600/80 hover:bg-red-600 active:bg-red-700 text-white text-xs font-bold rounded-lg transition flex-shrink-0">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              LIVE
            </button>

            {/* Volume */}
            <button onClick={toggleMute}
              className="w-8 h-8 hidden sm:flex items-center justify-center text-white/80 hover:text-white transition text-sm flex-shrink-0">
              {muted || vol === 0 ? '🔇' : vol < 0.5 ? '🔉' : '🔊'}
            </button>
            <input type="range" min="0" max="1" step="0.02" value={muted ? 0 : vol}
              onChange={e => changeVol(parseFloat(e.target.value))}
              className="w-16 h-1 accent-red-500 cursor-pointer hidden sm:block" />

            <div className="flex-1" />

            {/* Quality */}
            {qualities.length > 1 && (
              <div className="relative flex-shrink-0">
                <button onClick={() => setShowQuality(q => !q)}
                  className="h-8 px-2 flex items-center gap-1 text-white/80 hover:text-white text-xs rounded-lg bg-white/10 hover:bg-white/20 transition">
                  <span>🎬</span><span>{curQuality}</span>
                </button>
                <AnimatePresence>
                  {showQuality && (
                    <motion.div initial={{ opacity: 0, y: 6, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.95 }} transition={{ duration: 0.15 }}
                      className="absolute bottom-10 right-0 bg-gray-950/98 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 min-w-[100px]">
                      <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider px-3 pt-2 pb-1">Quality</p>
                      {qualities.map(q => (
                        <button key={q.id} onClick={() => setQuality(q)}
                          className={`flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-white/10 transition ${curQuality === q.label ? 'text-red-400 font-bold' : 'text-white/80'}`}>
                          <span>{q.label}</span>
                          {curQuality === q.label && <span className="text-red-400 text-xs">✓</span>}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* PiP */}
            {typeof document !== 'undefined' && document.pictureInPictureEnabled && (
              <button onClick={togglePip}
                className="w-8 h-8 hidden sm:flex items-center justify-center text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition text-sm flex-shrink-0">
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

// ─── Main Live Player ─────────────────────────────────────────────────────────
export default function LivePlayer() {
  const router = useRouter();
  const { video_id, batch_id, subject_id, schedule_id, title, url: qUrl } = router.query;

  const videoRef  = useRef(null);
  const playerRef = useRef(null);
  const hlsRef    = useRef(null);
  const hideTimer = useRef(null);
  const retryTimer = useRef(null);

  // phase: idle | fetching | loading | ready | waiting | error
  const [phase, setPhase]       = useState('idle');
  const [loadPct, setLoadPct]   = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [retryIn, setRetryIn]   = useState(0);

  const [streamUrl, setStreamUrl]   = useState('');
  const [streamType, setStreamType] = useState('');
  const [liveTime, setLiveTime]     = useState(0);
  const [qualities, setQualities]   = useState([]);
  const [curQuality, setCurQuality] = useState('Auto');
  const [showControls, setShowControls] = useState(true);

  const liveTitle = title ? decodeURIComponent(title) : 'Live Class';

  const fail = useCallback((msg, waiting = false) => {
    setErrorMsg(msg);
    setPhase(waiting ? 'waiting' : 'error');
  }, []);

  const step = useCallback((msg, pct) => { setStatusMsg(msg); setLoadPct(pct); }, []);

  // Auto-hide controls
  const resetHide = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 4000);
  }, []);

  useEffect(() => { resetHide(); return () => clearTimeout(hideTimer.current); }, []);

  // ── Fetch stream URL ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!router.isReady) return;
    setErrorMsg(''); setStreamUrl(''); setStreamType('');
    setLoadPct(0); setStatusMsg(''); setPhase('fetching');

    // Direct URL passed (e.g. from live classes list)
    if (qUrl) {
      const type = qUrl.includes('.m3u8') ? 'hls' : qUrl.includes('.mpd') ? 'mpd' : 'hls';
      setStreamUrl(qUrl); setStreamType(type); setPhase('loading'); return;
    }

    if (!batch_id) { fail('Missing batch ID'); return; }

    step('Connecting to live stream...', 20);

    const params = new URLSearchParams();
    if (batch_id)   params.set('batch_id',   batch_id);
    if (subject_id) params.set('subject_id', subject_id);
    if (video_id)   params.set('video_id',   video_id);
    if (schedule_id) params.set('schedule_id', schedule_id);

    fetch(`/api/liveurl?${params.toString()}`)
      .then(r => r.json())
      .then(d => {
        if (!d.url) throw new Error(d.error || 'Stream not available yet');
        setStreamUrl(d.url);
        setStreamType(d.type || 'hls');
        setPhase('loading');
      })
      .catch(e => {
        // Stream not started yet — auto retry every 15s
        fail(e.message, true);
        scheduleRetry();
      });
  }, [router.isReady, qUrl, batch_id, schedule_id, retryKey]);

  // Auto-retry when stream not started
  function scheduleRetry(seconds = 15) {
    clearInterval(retryTimer.current);
    setRetryIn(seconds);
    let remaining = seconds;
    retryTimer.current = setInterval(() => {
      remaining -= 1;
      setRetryIn(remaining);
      if (remaining <= 0) {
        clearInterval(retryTimer.current);
        setRetryKey(k => k + 1);
      }
    }, 1000);
  }

  useEffect(() => () => clearInterval(retryTimer.current), []);

  // ── Init player ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'loading' || !streamUrl || !streamType) return;
    if (streamType === 'youtube') { setPhase('ready'); return; }
    const el = videoRef.current;
    if (!el) return;

    // Cleanup previous
    playerRef.current?.destroy().catch(() => {}); playerRef.current = null;
    hlsRef.current?.destroy(); hlsRef.current = null;

    if (streamType === 'hls') initHls(el, streamUrl);
    else initShaka(el, streamUrl);
  }, [phase, streamUrl, streamType]);

  // ── HLS (preferred for live) ─────────────────────────────────────────────────
  async function initHls(el, url) {
    try {
      step('Loading stream...', 50);
      const Hls = (await import('hls.js')).default;
      if (!Hls.isSupported()) {
        if (el.canPlayType('application/vnd.apple.mpegurl')) {
          el.src = url;
          el.addEventListener('loadedmetadata', () => onReady(el), { once: true });
        } else fail('HLS not supported in this browser');
        return;
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,       // Low latency for live
        backBufferLength: 30,       // Keep 30s back buffer
        maxBufferLength: 10,        // Small forward buffer for live
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
      });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(el);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        const saved = localStorage.getItem('pw_live_quality');
        const qs = [
          { id: -1, label: 'Auto' },
          ...data.levels.map((l, i) => ({ id: i, label: l.height ? `${l.height}p` : `Level ${i}` })),
        ];
        setQualities(qs);
        if (saved) { const idx = qs.findIndex(q => q.label === saved); if (idx > 0) hls.currentLevel = qs[idx].id; }
        onReady(el);
      });

      hls.on(Hls.Events.ERROR, (_, d) => {
        if (d.fatal) {
          if (d.type === Hls.ErrorTypes.NETWORK_ERROR) {
            fail('Stream ended or not available', true);
            scheduleRetry(10);
          } else {
            fail('Stream error: ' + d.details);
          }
        }
      });
    } catch (e) { fail(e.message); }
  }

  // ── Shaka (for DASH live) ────────────────────────────────────────────────────
  async function initShaka(el, url) {
    try {
      step('Loading stream...', 50);
      const shaka = (await import('shaka-player')).default;
      shaka.polyfill.installAll();
      if (!shaka.Player.isBrowserSupported()) { fail('Browser not supported'); return; }

      const player = new shaka.Player();
      playerRef.current = player;
      await player.attach(el);

      player.configure({
        streaming: {
          bufferingGoal: 10,
          rebufferingGoal: 2,
          bufferBehind: 30,
          lowLatencyMode: true,
        },
      });

      player.addEventListener('error', e => {
        fail(`Stream error: ${e.detail?.message || 'Unknown'}`);
        scheduleRetry(10);
      });

      await player.load(url);

      const tracks = player.getVariantTracks();
      const seen = new Set();
      const qs = tracks
        .filter(t => { const k = t.height; if (seen.has(k)) return false; seen.add(k); return true; })
        .sort((a, b) => (b.height || 0) - (a.height || 0))
        .map(t => ({ id: t.id, label: t.height ? `${t.height}p` : 'Auto' }));
      if (qs.length > 1) setQualities(qs);

      onReady(el);
    } catch (e) { fail(e.message || 'Failed to load stream', true); scheduleRetry(10); }
  }

  // ── On ready ─────────────────────────────────────────────────────────────────
  function onReady(el) {
    setPhase('ready'); setLoadPct(100);
    el.addEventListener('timeupdate', () => setLiveTime(el.currentTime));
    el.play().catch(() => {
      // Autoplay blocked — mute and retry
      el.muted = true;
      el.play().catch(() => {});
    });
  }

  const handleQuality = useCallback((q) => {
    setCurQuality(q.label);
    localStorage.setItem('pw_live_quality', q.label);
  }, []);

  const handleManualRetry = () => {
    clearInterval(retryTimer.current);
    setRetryIn(0);
    setRetryKey(k => k + 1);
  };

  const isLoading = ['fetching', 'loading'].includes(phase);
  const ytId = streamType === 'youtube' ? getYtId(streamUrl) : null;

  return (
    <>
      <Head>
        <title>🔴 {liveTitle} — Live</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="h-screen bg-black flex flex-col overflow-hidden">
        {/* Top bar — fixed height */}
        <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="flex items-center gap-2 px-3 py-2 bg-black/90 backdrop-blur-md border-b border-white/5 flex-shrink-0 z-50 h-12">
          <button onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition flex-shrink-0 text-lg">
            ←
          </button>
          <p className="text-white/90 text-sm font-medium truncate flex-1">{liveTitle}</p>
          <LiveBadge />
        </motion.div>

        {/* Player — fills remaining height exactly */}
        <div className="flex-1 relative bg-black overflow-hidden">
          <div
            className="live-player-wrap absolute inset-0"
            onMouseMove={resetHide}
            onTouchStart={resetHide}
            onMouseLeave={() => { clearTimeout(hideTimer.current); hideTimer.current = setTimeout(() => setShowControls(false), 2000); }}
          >
            <div className="absolute inset-0">

              {/* YouTube live */}
              {streamType === 'youtube' && ytId && (
                <iframe className="w-full h-full" allowFullScreen
                  src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
                  title={liveTitle}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                />
              )}

              {/* Video element */}
              {(streamType === 'hls' || streamType === 'mpd') && (
                <video ref={videoRef} playsInline autoPlay
                  className="w-full h-full bg-black"
                  controlsList="nodownload nofullscreen noremoteplayback"
                />
              )}

              {/* Double-tap zones — right=+5s, left=show controls (no backward seek on live) */}
              {phase === 'ready' && streamType !== 'youtube' && (
                <TapZones
                  onSeekLeft={resetHide}
                  onSeekRight={() => {
                    // Live: jump to live edge on right tap
                    const el = videoRef.current;
                    if (el?.seekable?.length) el.currentTime = el.seekable.end(el.seekable.length - 1);
                    resetHide();
                  }}
                  onTap={resetHide}
                />
              )}

              {/* Controls */}
              <AnimatePresence>
                {phase === 'ready' && showControls && streamType !== 'youtube' && (
                  <motion.div key="controls" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }} className="absolute inset-0">
                    <LiveControls
                      videoRef={videoRef} playerRef={playerRef} hlsRef={hlsRef}
                      qualities={qualities} curQuality={curQuality} onQuality={handleQuality}
                      liveTime={liveTime} title={liveTitle}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Loading overlay */}
              <AnimatePresence>
                {isLoading && (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-black z-30">
                    <div className="relative mb-5">
                      <div className="w-16 h-16 rounded-full border-[3px] border-white/10 border-t-red-500 animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white/50 text-xs font-mono">{loadPct}%</span>
                      </div>
                    </div>
                    <p className="text-white/60 text-sm mb-3">{statusMsg}</p>
                    <div className="w-48 h-0.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div className="h-full bg-red-500 rounded-full"
                        animate={{ width: `${loadPct}%` }} transition={{ duration: 0.4 }} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Waiting / Error overlay */}
              <AnimatePresence>
                {(phase === 'waiting' || phase === 'error') && (
                  <motion.div key="error" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/95 z-30">
                    <div className="text-center p-8 max-w-sm">
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: 'spring' }}
                        className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 ${phase === 'waiting' ? 'bg-orange-500/10' : 'bg-red-500/10'}`}>
                        <span className="text-4xl">{phase === 'waiting' ? '📡' : '⚠️'}</span>
                      </motion.div>

                      <h3 className="text-white font-bold text-lg mb-2">
                        {phase === 'waiting' ? 'Waiting for Live Stream' : 'Stream Error'}
                      </h3>
                      <p className="text-white/50 text-sm mb-6">
                        {phase === 'waiting'
                          ? 'Live class has not started yet. Will auto-retry.'
                          : errorMsg}
                      </p>

                      {retryIn > 0 && (
                        <p className="text-white/30 text-xs mb-4">
                          Auto-retrying in <span className="text-orange-400 font-mono font-bold">{retryIn}s</span>
                        </p>
                      )}

                      <button onClick={handleManualRetry}
                        className="px-6 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-red-600/20">
                        🔄 Retry Now
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
