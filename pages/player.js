import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { decryptData } from '@/lib/decryptBrowser';
import { API_BASE_URL } from '@/lib/apiConfig';

// Helper functions for DRM
const hexToUint8Array = (hex) => {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return arr;
};

const uint8ArrayToBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const VideoPlayer = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL Parameters
  const videoId = searchParams.get('video_id');
  const subjectSlug = searchParams.get('subject_slug');
  const batchId = searchParams.get('batch_id');
  const subjectId = searchParams.get('subject_id');

  // Refs
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const uiRef = useRef(null);
  const queryParamsRef = useRef({ queryParams: '' });

  // State
  const [errorMessage, setErrorMessage] = useState(null);
  const [batchNotAvailable, setBatchNotAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('Initializing...');
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Extract KID from MPD manifest
  const extractKID = useCallback(async (mpdUrl) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/pw/kid?mpdUrl=${encodeURIComponent(mpdUrl)}`);
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || data.details || 'Failed to extract KID');
      }
      
      return data.kid;
    } catch (error) {
      console.error('KID extraction failed:', error);
      return null;
    }
  }, []);

  // Initialize video player
  const initializePlayer = useCallback(async () => {
    let isActive = true;

    if (!videoId || !batchId || !videoRef.current) {
      if (isActive) {
        setErrorMessage('Missing required video parameters.');
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setBatchNotAvailable(false);
    setLoadingStatus('Fetching video details...');
    setLoadingProgress(10);

    try {
      let videoUrl = null;

      // Try multiple API endpoints to get video URL
      // Attempt 1: /api/pw/get-url
      try {
        const response = await fetch(`${API_BASE_URL}/api/pw/get-url?batchId=${batchId}&childId=${videoId}&subjectId=${subjectId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.data) && data.data.length > 0 && data.data[0].url) {
            videoUrl = data.data[0].url;
          }
        }
      } catch (error) {
        console.warn('/api/pw/get-url failed, proceeding to fallbacks.', error);
      }

      setLoadingProgress(30);

      // Attempt 2: /api/pw/video
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
          console.warn('Fallback video API failed.', error);
        }
      }

      setLoadingProgress(50);

      // Attempt 3: /api/pw/videoplay
      if (!videoUrl) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/pw/videoplay?batchId=${batchId}&childId=${videoId}&subjectId=${subjectId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && Array.isArray(data.data) && data.data.length > 0 && data.data[0].url) {
              if (data.data[0].type === 'youtube') {
                // Handle YouTube separately if needed
                setErrorMessage('YouTube videos not supported in this player');
                setIsLoading(false);
                return;
              }
              videoUrl = data.data[0].url;
            }
          }
        } catch (error) {
          console.warn('/api/pw/videoplay failed', error);
        }
      }

      // Attempt 4: /api/pw/get-urls
      if (!videoUrl) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/pw/get-urls?batchId=${batchId}&childId=${videoId}&subjectId=${subjectId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && Array.isArray(data.data) && data.data.length > 0 && data.data[0].url) {
              if (data.data[0].type === 'youtube') {
                setErrorMessage('YouTube videos not supported in this player');
                setIsLoading(false);
                return;
              }
              videoUrl = data.data[0].url;
            }
          }
        } catch (error) {
          console.warn('/api/pw/get-urls failed', error);
        }
      }

      setLoadingProgress(50);

      if (!videoUrl) {
        setBatchNotAvailable(true);
        setIsLoading(false);
        return;
      }

      // Extract query params for signed URLs
      const urlParts = videoUrl.split('?');
      if (urlParts.length > 1) {
        queryParamsRef.current.queryParams = '?' + urlParts[1];
      }

      setLoadingStatus('Fetching decryption keys...');
      setLoadingProgress(75);

      // Convert m3u8 to mpd for KID extraction
      const mpdUrl = urlParts[0].replace(/\.m3u8/i, '.mpd') + queryParamsRef.current.queryParams;
      const kid = await extractKID(mpdUrl);

      if (!kid) {
        throw new Error('Could not extract Key ID (KID) from video manifest.');
      }

      // Fetch OTP key
      const otpResponse = await fetch(`${API_BASE_URL}/api/pw/otp?kid=${kid}`);
      if (!otpResponse.ok) {
        throw new Error(`Failed to fetch decryption key (status: ${otpResponse.status})`);
      }

      const otpData = await otpResponse.json();
      if (!otpData.success || !otpData.key) {
        throw new Error(otpData.error || 'Invalid key data received from API.');
      }

      const decryptionKey = otpData.key;

      setLoadingProgress(85);
      setLoadingStatus('Initializing player...');
      setLoadingProgress(90);

      // Load Shaka Player
      const shaka = await import('shaka-player/dist/shaka-player.ui.js');
      await import('shaka-player/dist/controls.css');

      const videoElement = videoRef.current;
      const containerElement = containerRef.current;

      // Initialize Shaka Player
      const player = new shaka.Player(videoElement);
      playerRef.current = player;

      // Initialize UI
      const ui = new shaka.ui.Overlay(player, containerElement, videoElement);
      uiRef.current = ui;
      ui.getControls();

      // Configure player
      player.configure({
        abr: { enabled: false }
      });

      // Error handling
      player.addEventListener('error', (event) => {
        console.error('Shaka Player Error:', event.detail);
      });

      // Request filter to add query params and referer
      player.getNetworkingEngine().registerRequestFilter((type, request) => {
        request.headers['Referer'] = 'https://www.pw.live/';
        
        if (type === shaka.net.NetworkingEngine.RequestType.SEGMENT || 
            type === shaka.net.NetworkingEngine.RequestType.MANIFEST) {
          if (!request.uris[0].includes('?')) {
            request.uris[0] += queryParamsRef.current.queryParams;
          }
        }
      });

      // Response filter to inject decryption key into m3u8
      player.getNetworkingEngine().registerResponseFilter((type, response) => {
        if (type === shaka.net.NetworkingEngine.RequestType.MANIFEST) {
          const manifestText = new TextDecoder().decode(response.data);
          const keyLineMatch = manifestText.match(/(#EXT-X-KEY:.*)/);
          
          if (keyLineMatch && keyLineMatch[0]) {
            const originalKeyLine = keyLineMatch[0];
            const keyDataUri = `data:application/octet-stream;base64,${uint8ArrayToBase64(hexToUint8Array(decryptionKey).buffer)}`;
            const modifiedKeyLine = originalKeyLine
              .replace(/URI="[^"]*"/, `URI="${keyDataUri}"`)
              .replace(/,IV=0x[0-9a-fA-F]+/, '');
            
            const modifiedManifest = manifestText.replace(originalKeyLine, modifiedKeyLine);
            response.data = new TextEncoder().encode(modifiedManifest);
          }
        }
      });

      // Load the m3u8 stream
      const m3u8Url = videoUrl.replace(/\.mpd/i, '.m3u8');
      await player.load(m3u8Url);

      if (isActive) {
        setIsLoading(false);
        setLoadingProgress(100);
        
        // Auto-play
        videoElement.play().catch(() => {
          console.log('Autoplay was prevented.');
        });
      }
    } catch (error) {
      console.error('Player initialization failed:', error);
      if (isActive) {
        setErrorMessage(error.message || 'An unknown error occurred during setup.');
        setIsLoading(false);
        setLoadingProgress(0);
      }
    }

    // Cleanup function
    return () => {
      isActive = false;
      if (playerRef.current) {
        playerRef.current.destroy();
      }
      if (uiRef.current) {
        uiRef.current.destroy();
      }
    };
  }, [videoId, batchId, subjectSlug, subjectId, extractKID]);

  // Initialize player on mount
  useEffect(() => {
    const cleanup = initializePlayer();
    return () => {
      cleanup.then(cleanupFn => {
        if (cleanupFn) cleanupFn();
      });
    };
  }, [initializePlayer]);

  return (
    <div ref={containerRef} className="video-container">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 z-10">
          <div className="spinner" />
          <p className="text-white mt-2">{loadingStatus}</p>
          <div className="w-48 bg-gray-600 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-white h-1.5 rounded-full" 
              style={{ 
                width: `${loadingProgress}%`, 
                transition: 'width 0.5s ease-in-out' 
              }} 
            />
          </div>
        </div>
      )}

      {/* Video Element */}
      <video
        ref={videoRef}
        playsInline
        autoPlay
        style={{ width: '100%', height: '100%' }}
      />

      {/* Error Messages */}
      {!isLoading && (errorMessage || batchNotAvailable) && (
        batchNotAvailable ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm z-20 p-4">
            <div className="text-center max-w-md">
              <div className="bg-amber-500/10 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <svg className="h-10 w-10 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="font-bold text-xl mb-2 text-white">Batch Not Available</h2>
              <p className="text-sm text-gray-300 mb-2">This batch isn't available on our site yet.</p>
              <p className="text-sm text-gray-400 mb-6">If you know someone who has purchased this batch, kindly ask them to donate it on our site.</p>
              <div className="space-y-3">
                <button
                  onClick={() => window.open('https://deltastudy.site/donate', '_blank')}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
                >
                  Donate Now
                </button>
                <p className="text-xs text-gray-500">Donating a batch is safe and harmless to your account. Help each other and support us.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm z-20">
            <div className="text-center p-8 max-w-md">
              <div className="bg-red-500/10 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <svg className="h-10 w-10 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="font-bold text-xl mb-2 text-white">Playback Error</h2>
              <p className="text-sm text-gray-400 mb-6">{errorMessage}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
              >
                Try Again
              </button>
            </div>
          </div>
        )
      )}

      <style jsx>{`
        body {
          margin: 0;
          background: #000;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif;
        }
        .video-container {
          width: 100vw;
          height: 100vh;
          position: relative;
          overflow: hidden;
        }
        video {
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: #000;
        }
        .spinner {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: conic-gradient(#0000 10%, #fff);
          mask: radial-gradient(farthest-side, #0000 calc(100% - 9px), #000 0);
          animation: spin 1s infinite linear;
        }
        @keyframes spin {
          to {
            transform: rotate(1turn);
          }
        }
      `}</style>
    </div>
  );
};

export default function PlayerPage() {
  return (
    <Suspense fallback={
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="spinner" />
      </div>
    }>
      <VideoPlayer />
    </Suspense>
  );
}
