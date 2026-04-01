import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Player() {
  const router = useRouter();
  const { video_id, batch_id, subject_id, subject_slug, schedule_id, topicSlug, title, mpd } = router.query;
  const videoRef = useRef(null);
  const [status, setStatus] = useState('Loading...');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady || !videoRef.current) return;
    if (!mpd && !video_id) { setError('No video URL provided'); return; }

    let player = null;

    async function init() {
      try {
        setStatus('Loading Shaka Player...');
        const shaka = (await import('shaka-player')).default;
        shaka.polyfill.installAll();

        if (!shaka.Player.isBrowserSupported()) {
          setError('Browser does not support DRM playback');
          return;
        }

        player = new shaka.Player();
        await player.attach(videoRef.current);

        // Try to get DRM keys
        let clearKeys = {};
        if (video_id) {
          try {
            const r = await fetch(`/api/drm?findKey=${video_id}&batchId=${batch_id || ''}&subjectId=${subject_id || ''}&mpdUrl=${encodeURIComponent(mpd || '')}`);
            const data = await r.json();
            if (data.clearKeys) clearKeys = data.clearKeys;
          } catch (_) {}
        }

        const config = {
          streaming: { bufferingGoal: 30, rebufferingGoal: 2 },
        };
        if (Object.keys(clearKeys).length > 0) {
          config.drm = { clearKeys };
        }
        player.configure(config);

        player.addEventListener('error', (e) => {
          setError('Playback error: ' + (e.detail?.message || 'Unknown'));
        });

        const mpdUrl = mpd || '';
        setStatus('Loading video...');

        // Try proxy first, then direct
        try {
          await player.load(`/api/stream?url=${encodeURIComponent(mpdUrl)}`);
        } catch (_) {
          await player.load(mpdUrl);
        }

        setStatus('');
        videoRef.current.play().catch(() => {});
      } catch (e) {
        setError('Error: ' + e.message);
        setStatus('');
      }
    }

    init();

    return () => {
      if (player) player.destroy().catch(() => {});
    };
  }, [router.isReady, mpd, video_id]);

  const videoTitle = title ? decodeURIComponent(title) : 'Video Player';

  return (
    <>
      <Head>
        <title>{videoTitle}</title>
      </Head>
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <div className="w-full max-w-5xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-900">
            <p className="text-white text-sm font-medium truncate">{videoTitle}</p>
            <button onClick={() => window.close()} className="text-gray-400 hover:text-white text-sm">✕ Close</button>
          </div>

          {/* Player */}
          <div className="relative bg-black" style={{ paddingTop: '56.25%' }}>
            <div className="absolute inset-0 flex items-center justify-center">
              {(status || error) && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/80">
                  {error
                    ? <div className="text-center text-white p-6">
                        <div className="text-4xl mb-3">⚠️</div>
                        <p className="text-red-400 text-sm">{error}</p>
                        <p className="text-gray-400 text-xs mt-2">MPD: {mpd?.substring(0, 60)}...</p>
                      </div>
                    : <div className="text-center text-white">
                        <div className="w-10 h-10 rounded-full border-[3px] border-orange-200 border-t-orange-500 animate-spin mx-auto mb-3" />
                        <p className="text-gray-300 text-sm">{status}</p>
                      </div>
                  }
                </div>
              )}
              <video
                ref={videoRef}
                controls
                playsInline
                className="w-full h-full"
                controlsList="nodownload"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
