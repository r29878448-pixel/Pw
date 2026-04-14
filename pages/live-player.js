'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';

const getYtId = (url) => url?.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] || null;
const fmt = (s) => {
  if (!isFinite(s) || s < 0) return 'LIVE';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
    : `${m}:${sec.toString().padStart(2, '0')}`;
};

function LiveBadge() {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-600 rounded-full">
      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
      <span className="text-white text-xs font-bold tracking-wide">LIVE</span>
    </div>
  );
}

function LiveControls({ videoRef, playerRef, qualities, curQuality, onQuality, liveTime, title }) {
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
    if (el && el.seekable && el.seekable.length) {
      el.currentTime = el.seekable.end(el.seekable.length - 1);
    }
  };
  const togglePip = async () => {
    try {
      document.pictureInPictureElement
        ? await document.exitPictureInPicture()
        : await videoRef.current?.requestPictureInPicture();
    } catch (_) {}
  };
  const toggleFs = () => {
    const wrap = document.querySelector('.live-player-wrap');
    document.fullscreenElement ? document.exitFullscreen() : wrap?.requestFullscreen();
  };
  const setQuality = (q) => {
    const player = playerRef?.current;
    if (player) {
      const track = player.getVariantTracks().find((t) => t.id === q.id);
      if (track) {
        player.configure({ abr: { enabled: false } });
        player.selectVariantTrack(track, true);
      }
    }
    onQuality(q);
    setShowQuality(false);
    localStorage.setItem('pw_live_quality', q.label);
  };

  return (
    <>
      <AnimatePresence>
        {buffering && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="w-14 h-14 rounded-full border-[3px] border-white/20 border-t-red-500 animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-0 inset-x-0 z-20 bg-gradient-to-b from-black/80 to-transparent px-3 pt-3 pb-8">
        <div className="flex items-center gap-2">
          <LiveBadge />
          <p className="text-white/80 text-xs font-medium truncate flex-1">{title}</p>
          {liveTime > 0 && <span className="text-white/50 text-xs font-mono">{fmt(liveTime)}</span>}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20">
        <div className="bg-gradient-to-t from-black/95 via-black/50 to-transparent pt-10 pb-3 px-3">
          <div className="relative h-1 bg-white/15 rounded-full mb-2 overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-red-500 rounded-full w-full opacity-30" />
            <div className="absolute right-0 top-0 bottom-0 w-3 h-3 -mt-1 bg-red-500 rounded-full shadow-lg shadow-red-500/50" />
          </div>

          <div className="flex items-center gap-1">
            <button onClick={togglePlay}
              className="w-10 h-10 flex items-center justify-center text-white hover:text-red-400 transition rounded-xl hover:bg-white/10 active:bg-white/20 text-xl flex-shrink-0">
              {playing ? '⏸' : '▶'}
            </button>

            <button onClick={goLive}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-red-600/80 hover:bg-red-600 active:bg-red-700 text-white text-xs font-bold rounded-lg transition flex-shrink-0">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              LIVE
            </button>

            <button onClick={toggleMute}
              className="w-8 h-8 hidden sm:flex items-center justify-center text-white/80 hover:text-white transition text-sm flex-shrink-0">
              {muted || vol === 0 ? '🔇' : vol < 0.5 ? '🔉' : '🔊'}
            </button>
            <input type="range" min="0" max="1" step="0.02" value={muted ? 0 : vol}
              onChange={(e) => changeVol(parseFloat(e.target.value))}
              className="w-16 h-1 accent-red-500 cursor-pointer hidden sm:block" />

            <div className="flex-1" />

            {qualities.length > 1 && (
              <div className="relative flex-shrink-0">
                <button onClick={() => setShowQuality((q) => !q)}
                  className="h-8 px-2 flex items-center gap-1 text-white/80 hover:text-white text-xs rounded-lg bg-white/10 hover:bg-white/20 transition">
                  <span>🎬</span><span>{curQuality}</span>
                </button>
                <AnimatePresence>
                  {showQuality && (
                    <motion.div initial={{ opacity: 0, y: 6, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.95 }} transition={{ duration: 0.15 }}
                      className="absolute bottom-10 right-0 bg-gray-950/98 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 min-w-[100px]">
                      <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider px-3 pt-2 pb-1">Quality</p>
                      {qualities.map((q) => (
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

            {typeof document !== 'undefined' && document.pictureInPictureEnabled && (
              <button onClick={togglePip}
                className="w-8 h-8 hidden sm:flex items-center justify-center text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition text-sm flex-shrink-0">
                ⧉
              </button>
            )}

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

export default function LivePlayer() {
  const router = useRouter();
  const { video_id, batch_id, subject_id, schedule_id, title, url: qUrl } = router.query;

  const videoRef   = useRef(null);
  const playerRef  = useRef(null);
  const wrapRef    = useRef(null);
  const hideTimer  = useRef(null);
  const retryTimer = useRef(null);
  const mountedRef = useRef(true);

  const [phase, setPhase]           = useState('idle');
  const [loadPct, setLoadPct]       = useState(0);
  const [statusMsg, setStatusMsg]   = useState('');
  const [errorMsg, setErrorMsg]     = useState('');
  const [retryKey, setRetryKey]     = useState(0);
  const [retryIn, setRetryIn]       = useState(0);

  const [streamUrl, setStreamUrl]   = useState('');
  const [liveTime, setLiveTime]     = useState(0);
  const [qualities, setQualities]   = useState([]);
  const [curQuality, setCurQuality] = useState('Auto');
  const [showControls, setShowControls] = useState(true);
  const [youtubeUrl, setYoutubeUrl] = useState(null);

  const liveTitle = title ? decodeURIComponent(title) : 'Live Class';

  const step = useCallback((msg, pct) => { setStatusMsg(msg); setLoadPct(pct); }, []);

  const resetHide = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 4000);
  }, []);

  useEffect(() => { resetHide(); return () => clearTimeout(hideTimer.current); }, []);
  useEffect(() => () => { mountedRef.current = false; }, []);

  // ── Fetch stream URL ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!router.isReady) return;

    setErrorMsg('');
    setStreamUrl('');
    setLoadPct(0);
    setStatusMsg('');
    setPhase('fetching');
    setYoutubeUrl(null);

    if (qUrl) {
      setStreamUrl(qUrl);
      setPhase('loading');
      return;
    }

    if (!batch_id) {
      setErrorMsg('Missing batch ID');
      setPhase('error');
      return;
    }

    const vid = video_id || schedule_id || '';
    if (!vid) {
      setErrorMsg('Missing video/schedule ID');
      setPhase('error');
      return;
    }

    step('Connecting to live stream...', 20);

    (async () => {
      let url = null;

      // Route through our own Next.js API (server-side) to avoid CORS
      step('Fetching stream details...', 40);
      try {
        const r = await fetch(
          `/api/videourl?batchId=${batch_id}&subjectId=${subject_id || ''}&findKey=${vid}`
        );
        if (r.ok) {
          const json = await r.json();
          if (json.url) {
            if (json.url.includes('youtube.com') || json.url.includes('youtu.be')) {
              if (mountedRef.current) {
                setYoutubeUrl(json.url);
                setPhase('ready');
                setLoadPct(100);
              }
              return;
            }
            url = json.url;
          }
        }
      } catch (_) {}

      if (!mountedRef.current) return;

      if (!url) {
        setErrorMsg('Live stream not started yet');
        setPhase('waiting');
        scheduleRetry(15);
        return;
      }

      setStreamUrl(url);
      setPhase('loading');
    })();
  }, [router.isReady, qUrl, batch_id, video_id, schedule_id, subject_id, retryKey]);

  function scheduleRetry(seconds) {
    clearInterval(retryTimer.current);
    setRetryIn(seconds);
    let remaining = seconds;
    retryTimer.current = setInterval(() => {
      remaining -= 1;
      setRetryIn(remaining);
      if (remaining <= 0) {
        clearInterval(retryTimer.current);
        setRetryKey((k) => k + 1);
      }
    }, 1000);
  }

  useEffect(() => () => clearInterval(retryTimer.current), []);

  // ── Init Shaka ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'loading' || !streamUrl) return;
    const el = videoRef.current;
    if (!el) return;

    let cancelled = false;

    (async () => {
      if (playerRef.current) {
        try { await playerRef.current.destroy(); } catch (_) {}
        playerRef.current = null;
      }
      if (!cancelled) initShaka(el, streamUrl);
    })();

    return () => { cancelled = true; };
  }, [phase, streamUrl]);

  async function initShaka(el, url) {
    try {
      step('Loading player...', 70);

      const shakaModule = await import('shaka-player');
      const shaka = shakaModule.default || shakaModule;
      shaka.polyfill.installAll();

      if (!shaka.Player.isBrowserSupported()) {
        setErrorMsg('Browser does not support this stream');
        setPhase('error');
        return;
      }

      // Separate base URL from signed query params
      let baseUrl = url;
      let queryStr = '';
      try {
        const parsed = new URL(url);
        if (parsed.searchParams.has('Signature')) {
          queryStr = parsed.search;
          baseUrl = parsed.origin + parsed.pathname;
        }
      } catch (_) {}

      const player = new shaka.Player();
      playerRef.current = player;

      player.configure({ abr: { enabled: false } });

      // Attach signed params to every segment request
      if (queryStr) {
        player.getNetworkingEngine().registerRequestFilter((type, request) => {
          const uri = request.uris[0];
          if (!uri.includes('Signature=')) {
            request.uris[0] = uri.includes('?')
              ? uri + '&' + queryStr.slice(1)
              : uri + queryStr;
          }
        });
      }

      player.addEventListener('error', (e) => {
        console.error('Shaka error:', e.detail);
        if (mountedRef.current) {
          setErrorMsg(`Stream error: ${e.detail?.message || 'Unknown'}`);
          setPhase('waiting');
          scheduleRetry(10);
        }
      });

      step('Attaching player...', 80);
      await player.attach(el);

      step('Loading stream...', 90);
      await player.load(baseUrl);

      if (!mountedRef.current) return;

      // Extract quality tracks
      const tracks = player.getVariantTracks();
      const seen = new Set();
      const qs = tracks
        .filter((t) => { const k = t.height; if (seen.has(k)) return false; seen.add(k); return true; })
        .sort((a, b) => (b.height || 0) - (a.height || 0))
        .map((t) => ({ id: t.id, label: t.height ? `${t.height}p` : 'Auto' }));

      if (qs.length > 0) {
        setQualities(qs);
        const savedQuality = localStorage.getItem('pw_live_quality');
        if (savedQuality) {
          const saved = qs.find((q) => q.label === savedQuality);
          if (saved) {
            const track = tracks.find((t) => t.id === saved.id);
            if (track) {
              player.selectVariantTrack(track, true);
              setCurQuality(saved.label);
            }
          }
        }
      }

      setPhase('ready');
      setLoadPct(100);

      el.addEventListener('timeupdate', () => {
        if (mountedRef.current) setLiveTime(el.currentTime);
      });

      el.play().catch(() => {
        el.muted = true;
        el.play().catch(() => {});
      });

    } catch (e) {
      console.error('initShaka failed:', e);
      if (mountedRef.current) {
        setErrorMsg(e.message || 'Failed to load stream');
        setPhase('waiting');
        scheduleRetry(10);
      }
    }
  }

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (playerRef.current) {
        playerRef.current.destroy().catch(() => {});
      }
    };
  }, []);

  const handleQuality = useCallback((q) => {
    setCurQuality(q.label);
    localStorage.setItem('pw_live_quality', q.label);
  }, []);

  const handleManualRetry = () => {
    clearInterval(retryTimer.current);
    setRetryIn(0);
    setRetryKey((k) => k + 1);
  };

  const isLoading = phase === 'fetching' || phase === 'loading';
  const ytId = youtubeUrl ? getYtId(youtubeUrl) : null;

  return (
    <>
      <Head>
        <title>🔴 {liveTitle} — Live</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="h-screen bg-black flex flex-col overflow-hidden">
        <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="flex items-center gap-2 px-3 py-2 bg-black/90 backdrop-blur-md border-b border-white/5 flex-shrink-0 z-50 h-12">
          <button onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition flex-shrink-0 text-lg">
            ←
          </button>
          <p className="text-white/90 text-sm font-medium truncate flex-1">{liveTitle}</p>
          <LiveBadge />
        </motion.div>

        <div className="flex-1 relative bg-black overflow-hidden">
          <div
            ref={wrapRef}
            className="live-player-wrap absolute inset-0"
            onMouseMove={resetHide}
            onTouchStart={resetHide}
            onMouseLeave={() => {
              clearTimeout(hideTimer.current);
              hideTimer.current = setTimeout(() => setShowControls(false), 2000);
            }}
          >
            <div className="absolute inset-0">

              {ytId && (
                <iframe className="w-full h-full" allowFullScreen
                  src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
                  title={liveTitle}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                />
              )}

              {!ytId && (
                <video ref={videoRef} playsInline autoPlay
                  className="w-full h-full bg-black"
                  controlsList="nodownload nofullscreen noremoteplayback"
                />
              )}

              <AnimatePresence>
                {phase === 'ready' && showControls && !ytId && (
                  <motion.div key="controls" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }} className="absolute inset-0">
                    <LiveControls
                      videoRef={videoRef}
                      playerRef={playerRef}
                      qualities={qualities}
                      curQuality={curQuality}
                      onQuality={handleQuality}
                      liveTime={liveTime}
                      title={liveTitle}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

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
                        {phase === 'waiting' ? 'Live class has not started yet. Will auto-retry.' : errorMsg}
                      </p>
                      {retryIn > 0 && (
                        <p className="text-white/30 text-xs mb-4">
                          Auto-retrying in{' '}
                          <span className="text-orange-400 font-mono font-bold">{retryIn}s</span>
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
