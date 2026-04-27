'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

/**
 * Live Stream Player
 * Dedicated player for live classes only
 */
export default function LivePlayer() {
  const router = useRouter();
  const { video_id, batch_id, subject_id, schedule_id, title, subject_slug } = router.query;

  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);

  const [phase, setPhase] = useState('idle');
  const [loadPct, setLoadPct] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  const videoTitle = title ? decodeURIComponent(title) : 'Live Stream';

  const fail = useCallback((msg) => { setErrorMsg(msg); setPhase('error'); }, []);
  const step = useCallback((msg, pct) => { setStatusMsg(msg); setLoadPct(pct); }, []);

  // Fetch live stream URL
  useEffect(() => {
    if (!router.isReady) return;
    setErrorMsg(''); setLoadPct(0); setStatusMsg(''); setPhase('fetching');

    if (!video_id && !schedule_id) { 
      fail('No video ID or schedule ID provided'); 
      return; 
    }

    const apiUrl = `/api/liveurl?batch_id=${batch_id || ''}&subject_id=${encodeURIComponent(subject_id || '')}&video_id=${video_id || ''}&schedule_id=${schedule_id || ''}`;
    
    step('Connecting to live stream...', 10);
    console.log('🔍 Fetching live stream from:', apiUrl);
    
    fetch(apiUrl)
      .then(r => {
        console.log('📡 API Response status:', r.status);
        return r.json();
      })
      .then(d => {
        console.log('📦 API Response data:', d);
        if (!d.url) { 
          console.error('❌ No URL in response:', d);
          fail('Live stream not available. Please check if the stream has started.');
          return; 
        }
        console.log('✅ Got live stream URL:', d.url.substring(0, 100));
        
        // For CloudFront signed URLs, use direct URL (don't proxy)
        // Proxy breaks signed URLs because signature is in the URL
        initPlayer(d.url);
      })
      .catch(e => {
        console.error('❌ Fetch error:', e);
        fail('Failed to connect: ' + e.message);
      });
  }, [router.isReady, video_id, schedule_id, batch_id, subject_id, retryKey]);

  // Initialize HLS player
  async function initPlayer(url) {
    setPhase('loading');
    const el = videoRef.current;
    if (!el) return;

    // Cleanup previous
    if (hlsRef.current) { 
      hlsRef.current.destroy(); 
      hlsRef.current = null; 
    }

    try {
      step('Loading live stream...', 35);
      console.log('🎬 Initializing HLS with URL:', url);
      
      // Check if direct MP4
      if (url.endsWith('.mp4') || url.includes('.mp4?')) {
        console.log('📹 Direct MP4 playback');
        el.src = url;
        el.addEventListener('loadedmetadata', () => onReady(el), { once: true });
        el.addEventListener('error', () => {
          fail('Failed to load video: ' + (el.error?.message || 'Unknown error'));
        });
        return;
      }
      
      const Hls = (await import('hls.js')).default;
      console.log('📦 HLS.js loaded');
      
      if (!Hls.isSupported()) {
        console.log('⚠️ HLS.js not supported, trying native');
        if (el.canPlayType('application/vnd.apple.mpegurl')) {
          el.src = url; 
          el.addEventListener('loadedmetadata', () => onReady(el), { once: true });
        } else {
          fail('HLS not supported on this browser');
        }
        return;
      }
      
      const hls = new Hls({ 
        enableWorker: true, 
        startLevel: -1,
        debug: false,
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        manifestLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: 4,
        levelLoadingTimeOut: 10000,
        levelLoadingMaxRetry: 4,
        xhrSetup: function(xhr, requestUrl) {
          xhr.withCredentials = false;
          // For CloudFront signed URLs, preserve query parameters
          // Extract signature params from master playlist URL
          try {
            const masterUrl = new URL(url);
            const targetUrl = new URL(requestUrl);
            
            // If target URL doesn't have signature but master does, copy signature
            if (!targetUrl.searchParams.has('Signature') && masterUrl.searchParams.has('Signature')) {
              const signatureParams = ['Policy', 'Signature', 'Key-Pair-Id'];
              signatureParams.forEach(param => {
                const value = masterUrl.searchParams.get(param);
                if (value) {
                  targetUrl.searchParams.set(param, value);
                }
              });
              // Update the request URL with signature
              xhr.open('GET', targetUrl.toString(), true);
            }
          } catch (e) {
            console.warn('Failed to process signed URL:', e);
          }
        }
      });
      
      hlsRef.current = hls;
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('❌ HLS Error:', data.type, data.details);
        
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('🔄 Network error, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('🔄 Media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              fail(`Stream error: ${data.details || 'Playback failed'}`);
              hls.destroy();
              break;
          }
        }
      });
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('✅ HLS manifest parsed');
        onReady(el);
      });
      
      console.log('🔗 Loading HLS source...');
      hls.loadSource(url);
      hls.attachMedia(el);
      
    } catch (e) { 
      console.error('❌ HLS init error:', e);
      fail(e.message); 
    }
  }

  function onReady(el) {
    setPhase('ready'); 
    setLoadPct(100);
    el.play().catch(() => {});
  }

  const handleRetry = () => {
    setErrorMsg(''); 
    setPhase('idle');
    setLoadPct(0); 
    setStatusMsg(''); 
    setRetryKey(k => k + 1);
  };

  const isLoading = ['fetching', 'loading'].includes(phase);

  return (
    <>
      <Head>
        <title>{videoTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <style>{`
        body { margin: 0; background: #000; }
        .player-wrap { width: 100vw; height: 100vh; position: relative; background: #000; overflow: hidden; }
        video { width: 100%; height: 100%; object-fit: contain; background: #000; }
        .sp { width: 52px; height: 52px; border-radius: 50%;
          background: conic-gradient(#0000 10%, #fff);
          -webkit-mask: radial-gradient(farthest-side, #0000 calc(100% - 8px), #000 0);
          mask: radial-gradient(farthest-side, #0000 calc(100% - 8px), #000 0);
          animation: spin 1s infinite linear; }
        @keyframes spin { to { transform: rotate(1turn); } }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      <div className="player-wrap">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          style={{ 
            position: 'absolute', 
            top: 16, 
            left: 16, 
            zIndex: 100, 
            width: 36, 
            height: 36, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            background: 'rgba(0,0,0,0.6)', 
            border: 'none', 
            borderRadius: '50%', 
            cursor: 'pointer', 
            color: '#fff' 
          }}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>

        {/* Live indicator badge */}
        {phase === 'ready' && (
          <div style={{ 
            position: 'absolute', 
            top: 16, 
            right: 16, 
            zIndex: 100, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6, 
            background: 'rgba(220,38,38,0.95)', 
            padding: '6px 12px', 
            borderRadius: 9999, 
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)' 
          }}>
            <span style={{ 
              width: 8, 
              height: 8, 
              background: '#fff', 
              borderRadius: '50%', 
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' 
            }} />
            <span style={{ 
              color: '#fff', 
              fontSize: 12, 
              fontWeight: 700, 
              letterSpacing: '0.05em' 
            }}>LIVE</span>
          </div>
        )}

        {/* Video container */}
        <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
          <video 
            ref={videoRef} 
            playsInline 
            autoPlay 
            controls
            style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} 
          />
        </div>

        {/* Loading overlay */}
        {isLoading && (
          <div style={{ 
            position: 'absolute', 
            inset: 0, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: 16, 
            background: 'rgba(0,0,0,0.85)', 
            zIndex: 50 
          }}>
            <div className="sp" />
            <p style={{ color: '#fff', fontSize: 14, margin: 0 }}>{statusMsg || 'Loading...'}</p>
            <div style={{ 
              width: 192, 
              height: 6, 
              background: '#374151', 
              borderRadius: 9999, 
              overflow: 'hidden' 
            }}>
              <div style={{ 
                height: '100%', 
                background: '#fff', 
                borderRadius: 9999, 
                width: `${loadPct}%`, 
                transition: 'width 0.5s ease' 
              }} />
            </div>
          </div>
        )}

        {/* Error overlay */}
        {phase === 'error' && errorMsg && (
          <div style={{ 
            position: 'absolute', 
            inset: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            background: 'rgba(0,0,0,0.92)', 
            zIndex: 50, 
            padding: 16 
          }}>
            <div style={{ textAlign: 'center', maxWidth: 400 }}>
              <div style={{ 
                background: 'rgba(239,68,68,0.1)', 
                borderRadius: '50%', 
                width: 80, 
                height: 80, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 16px' 
              }}>
                <svg width="40" height="40" fill="none" stroke="#ef4444" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth="1.5"/>
                  <path strokeLinecap="round" strokeWidth="1.5" d="M12 8v4m0 4h.01"/>
                </svg>
              </div>
              <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>
                Stream Error
              </h2>
              <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 24 }}>{errorMsg}</p>
              <button 
                onClick={handleRetry} 
                style={{ 
                  padding: '10px 24px', 
                  background: '#4f46e5', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: 8, 
                  fontWeight: 600, 
                  cursor: 'pointer', 
                  fontSize: 14 
                }}
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
