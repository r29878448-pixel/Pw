import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, Suspense } from 'react';
import Head from 'next/head';
import { decryptData } from '@/lib/decryptBrowser';
import { API_BASE_URL } from '@/lib/apiConfig';

const PlyrPlayer = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL Parameters
  const videoId = searchParams.get('video_id');
  const subjectSlug = searchParams.get('subject_slug');
  const batchId = searchParams.get('batch_id');
  const subjectId = searchParams.get('subject_id');

  const videoRef = useRef(null);
  const shakaPlayerRef = useRef(null);
  const plyrInstanceRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  // Extract KID from MPD
  const extractKID = async (mpdUrl) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/pw/kid?mpdUrl=${encodeURIComponent(mpdUrl)}`);
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to extract KID');
      }
      
      return data.kid;
    } catch (error) {
      console.error('KID extraction failed:', error);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initPlayer = async () => {
      if (!videoId || !batchId || !videoRef.current) {
        setErrorMessage('Missing required parameters');
        setIsLoading(false);
        return;
      }

      try {
        // Fetch video URL from multiple endpoints
        let videoUrl = null;

        // Try endpoint 1
        try {
          const response = await fetch(`${API_BASE_URL}/api/pw/get-url?batchId=${batchId}&childId=${videoId}&subjectId=${subjectId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && Array.isArray(data.data) && data.data.length > 0 && data.data[0].url) {
              videoUrl = data.data[0].url;
            }
          }
        } catch (error) {
          console.warn('Endpoint 1 failed:', error);
        }

        // Try endpoint 2
        if (!videoUrl) {
          try {
            const response = await fetch(`${API_BASE_URL}/api/pw/video?batchId=${batchId}&subjectId=${subjectSlug}&childId=${videoId}`);
            if (response.ok) {
              const data = await response.json();
              if (data.data) {
                const decrypted = await decryptData(data.data);
                if (decrypted.success && decrypted.data?.url) {
                  videoUrl = decrypted.data.signedUrl 
                    ? decrypted.data.url + decrypted.data.signedUrl 
                    : decrypted.data.url;
                }
              }
            }
          } catch (error) {
            console.warn('Endpoint 2 failed:', error);
          }
        }

        // Try endpoint 3
        if (!videoUrl) {
          try {
            const response = await fetch(`${API_BASE_URL}/api/pw/videoplay?batchId=${batchId}&childId=${videoId}&subjectId=${subjectId}`);
            if (response.ok) {
              const data = await response.json();
              if (data.success && Array.isArray(data.data) && data.data.length > 0 && data.data[0].url) {
                videoUrl = data.data[0].url;
              }
            }
          } catch (error) {
            console.warn('Endpoint 3 failed:', error);
          }
        }

        // Try endpoint 4
        if (!videoUrl) {
          try {
            const response = await fetch(`${API_BASE_URL}/api/pw/get-urls?batchId=${batchId}&childId=${videoId}&subjectId=${subjectId}`);
            if (response.ok) {
              const data = await response.json();
              if (data.success && Array.isArray(data.data) && data.data.length > 0 && data.data[0].url) {
                videoUrl = data.data[0].url;
              }
            }
          } catch (error) {
            console.warn('Endpoint 4 failed:', error);
          }
        }

        if (!videoUrl) {
          throw new Error('Failed to fetch video URL from any endpoint');
        }

        // Extract KID from MPD
        const mpdUrl = videoUrl.replace(/\.m3u8/i, '.mpd');
        const kid = await extractKID(mpdUrl);

        if (!kid) {
          throw new Error('Failed to extract Key ID');
        }

        // Fetch decryption key
        const otpResponse = await fetch(`${API_BASE_URL}/api/pw/otp?kid=${kid}`);
        if (!otpResponse.ok) {
          throw new Error('Failed to fetch decryption key');
        }

        const otpData = await otpResponse.json();
        if (!otpData.success || !otpData.key) {
          throw new Error('Invalid key data');
        }

        const key = otpData.key;
        const manifest = videoUrl.replace(/\.mpd/i, '.m3u8');

        // Load Shaka Player
        const shaka = await import('shaka-player/dist/shaka-player.compiled.js');
        
        if (!shaka.Player.isBrowserSupported()) {
          throw new Error('Browser not supported');
        }

        const video = videoRef.current;
        const player = new shaka.Player(video);
        shakaPlayerRef.current = player;

        // Configure ClearKey DRM
        player.configure({
          drm: {
            clearKeys: {
              [kid]: key
            }
          }
        });

        // Forward signed URL params to segments
        player.getNetworkingEngine().registerRequestFilter((type, request) => {
          if (type === shaka.net.NetworkingEngine.RequestType.SEGMENT) {
            try {
              const segUrl = new URL(request.uris[0]);
              const masterUrl = new URL(manifest);
              masterUrl.searchParams.forEach((value, key) => {
                segUrl.searchParams.set(key, value);
              });
              request.uris[0] = segUrl.toString();
            } catch (e) {
              console.warn('URL processing error:', e);
            }
          }
        });

        // Load manifest
        await player.load(manifest);

        if (!mounted) return;

        // Get quality tracks
        const tracks = player.getVariantTracks();
        const resolutions = [...new Map(tracks.map(t => [t.height, t])).values()]
          .sort((a, b) => b.height - a.height);
        const qualityOptions = resolutions.map(r => r.height);

        // Load Plyr
        const Plyr = (await import('plyr')).default;
        await import('plyr/dist/plyr.css');

        const plyr = new Plyr(video, {
          seekTime: 10,
          controls: [
            'play-large',
            'rewind',
            'play',
            'fast-forward',
            'progress',
            'current-time',
            'duration',
            'mute',
            'volume',
            'settings',
            'fullscreen'
          ],
          settings: ['quality', 'speed'],
          quality: {
            default: qualityOptions[0] || 720,
            options: qualityOptions,
            forced: true,
            onChange: (height) => {
              const track = tracks.find(t => t.height === parseInt(height));
              if (track) {
                player.configure({ abr: { enabled: false } });
                player.selectVariantTrack(track, true);
              }
            }
          },
          speed: {
            selected: 1,
            options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
          }
        });

        plyrInstanceRef.current = plyr;

        plyr.on('ready', () => {
          if (mounted) {
            setIsLoading(false);
          }
        });

      } catch (error) {
        console.error('Player initialization error:', error);
        if (mounted) {
          setErrorMessage(error.message || 'Failed to load video');
          setIsLoading(false);
        }
      }
    };

    initPlayer();

    return () => {
      mounted = false;
      if (shakaPlayerRef.current) {
        shakaPlayerRef.current.destroy();
      }
      if (plyrInstanceRef.current) {
        plyrInstanceRef.current.destroy();
      }
    };
  }, [videoId, batchId, subjectId, subjectSlug]);

  return (
    <>
      <Head>
        <title>Video Player</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#000' }}>
        {isLoading && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              border: '6px solid rgba(255,255,255,0.2)',
              borderTop: '6px solid #fff',
              animation: 'spin 0.8s linear infinite'
            }} />
          </div>
        )}

        {errorMessage && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            color: '#fff',
            textAlign: 'center',
            padding: '20px'
          }}>
            <div>
              <h2 style={{ fontSize: '24px', marginBottom: '10px' }}>Error</h2>
              <p style={{ marginBottom: '20px' }}>{errorMessage}</p>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 20px',
                  background: '#4f46e5',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          playsInline
          style={{ width: '100%', height: '100%', background: '#000' }}
        />
      </div>

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        body {
          margin: 0;
          background: #000;
        }
      `}</style>
    </>
  );
};

export default function PlyrPlayerPage() {
  return (
    <Suspense fallback={
      <div style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          border: '6px solid rgba(255,255,255,0.2)',
          borderTop: '6px solid #fff',
          animation: 'spin 0.8s linear infinite'
        }} />
      </div>
    }>
      <PlyrPlayer />
    </Suspense>
  );
}
