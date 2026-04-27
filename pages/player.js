import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { decryptData } from '@/lib/decryptBrowser';
import { API_BASE_URL } from '@/lib/apiConfig';

const VideoPlayer = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL Parameters
  const videoId = searchParams.get('video_id');
  const subjectSlug = searchParams.get('subject_slug');
  const batchId = searchParams.get('batch_id');
  const scheduleId = searchParams.get('schedule_id');
  const subjectId = searchParams.get('subject_id');

  // Refs
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  // State
  const [showAttachments, setShowAttachments] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [manifestUrl, setManifestUrl] = useState(null);
  const [showDownloadSheet, setShowDownloadSheet] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState('Initializing...');
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Fetch and decrypt data helper
  const fetchAndDecrypt = useCallback(async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;

      const data = await response.json();
      if (!data.data) return null;

      const decrypted = await decryptData(data.data);
      return decrypted.success ? decrypted.data : null;
    } catch (error) {
      console.error('Fetch and decrypt error:', error);
      return null;
    }
  }, []);

  // Fetch attachments
  const fetchAttachments = useCallback(async () => {
    if (!batchId || !subjectId || !scheduleId) return;

    setLoadingAttachments(true);
    setAttachments([]);

    try {
      const url = `/api/contents/attachment-links?batchId=${batchId}&subjectId=${subjectId}&scheduleId=${scheduleId}`;
      const data = await fetchAndDecrypt(url);

      if (data && Array.isArray(data)) {
        const formattedAttachments = data.map(item => ({
          _id: item._id,
          name: item.name,
          url: item.url,
          type: 'note'
        }));
        setAttachments(formattedAttachments);
      }
    } catch (error) {
      console.error('Failed to fetch attachments:', error);
    } finally {
      setLoadingAttachments(false);
    }
  }, [batchId, subjectId, scheduleId, fetchAndDecrypt]);

  // Handle attachment download
  const handleDownload = (url) => {
    if (url) {
      window.open(url, '_blank');
    } else {
      alert('No download link available for this item.');
    }
  };

  // Initialize video player
  const initializePlayer = useCallback(async () => {
    let player = null;
    let ui = null;
    let isActive = true;

    if (!videoId || !batchId || !videoRef.current || !containerRef.current) {
      if (isActive) {
        setErrorMessage('Missing video parameters.');
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setYoutubeUrl(null);
    setManifestUrl(null);
    setLoadingStatus('Initializing...');
    setLoadingProgress(5);

    try {
      let videoUrl = null;

      // Try multiple API endpoints to get video URL
      setLoadingStatus('Fetching video details...');
      setLoadingProgress(20);

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
        console.warn('/api/pw/get-url failed, trying fallback:', error);
      }

      setLoadingProgress(35);

      // Attempt 2: /api/pw/video
      if (!videoUrl) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/pw/video?batchId=${batchId}&subjectId=${subjectSlug}&childId=${videoId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.data) {
              const decrypted = await decryptData(data.data);
              if (decrypted.success && decrypted.data?.url) {
                // Check if it's a YouTube URL
                if (decrypted.data.url.includes('youtube.com') || decrypted.data.url.includes('youtu.be')) {
                  setYoutubeUrl(decrypted.data.url);
                  setIsLoading(false);
                  return;
                }
                videoUrl = decrypted.data.signedUrl 
                  ? decrypted.data.url + decrypted.data.signedUrl 
                  : decrypted.data.url;
              }
            }
          }
        } catch (error) {
          console.warn('/api/pw/video failed, trying fallback:', error);
        }
      }

      setLoadingProgress(50);

      // Attempt 3: /api/pw/videoplay
      if (!videoUrl) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/pw/videoplay?batchId=${batchId}&subjectId=${subjectId}&childId=${videoId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data?.url) {
              if (data.data.type === 'youtube') {
                setYoutubeUrl(data.data.url);
                setIsLoading(false);
                return;
              }
              videoUrl = data.data.url;
            }
          }
        } catch (error) {
          console.warn('/api/pw/videoplay failed:', error);
        }
      }

      setLoadingProgress(60);

      // Attempt 4: /api/pw/get-urls
      if (!videoUrl) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/pw/get-urls?batchId=${batchId}&childId=${videoId}&subjectId=${subjectId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && Array.isArray(data.data) && data.data.length > 0 && data.data[0].url) {
              if (data.data[0].type === 'youtube') {
                setYoutubeUrl(data.data[0].url);
                setIsLoading(false);
                return;
              }
              videoUrl = data.data[0].url;
            }
          }
        } catch (error) {
          console.warn('/api/pw/get-urls failed:', error);
        }
      }

      if (!videoUrl) {
        throw new Error('Failed to get a valid video URL from any source.');
      }

      setManifestUrl(videoUrl);

      // Parse URL to separate manifest and query params
      const urlObj = new URL(videoUrl);
      const manifestPath = urlObj.origin + urlObj.pathname;
      const queryParams = urlObj.search;

      // Load Shaka Player
      setLoadingStatus('Loading player library...');
      const shaka = await import('shaka-player/dist/shaka-player.ui.js');
      await import('shaka-player/dist/controls.css');

      const videoElement = videoRef.current;
      const containerElement = containerRef.current;

      // Initialize Shaka Player
      player = new shaka.Player();

      // Add request filter to append query params
      player.getNetworkingEngine().registerRequestFilter((type, request) => {
        const uri = request.uris[0];
        if (!uri.includes('Signature=') && queryParams) {
          request.uris[0] = uri.includes('?') 
            ? uri + '&' + queryParams.slice(1) 
            : uri + queryParams;
        }
      });

      await player.attach(videoElement);

      // Error handling
      player.addEventListener('error', (event) => {
        console.error('Shaka Player Error:', event.detail);
      });

      setLoadingStatus('Initializing player...');
      setLoadingProgress(90);

      // Load manifest
      await player.load(manifestPath);

      // Initialize UI
      ui = new shaka.ui.Overlay(player, containerElement, videoElement);
      ui.getControls();

      if (isActive) {
        setIsLoading(false);
        setLoadingProgress(100);
        setErrorMessage(null);
      }
    } catch (error) {
      console.error('Failed to load video:', error);
      if (isActive) {
        setErrorMessage(error.message || 'An unknown error occurred while loading the video.');
        setIsLoading(false);
        setLoadingProgress(0);
      }
    }

    // Cleanup function
    return () => {
      isActive = false;
      (async () => {
        if (ui) {
          try {
            await ui.destroy();
          } catch (error) {
            console.error('UI cleanup error:', error);
          }
        }
        if (player) {
          try {
            await player.destroy();
          } catch (error) {
            console.error('Player cleanup error:', error);
          }
        }
      })();
    };
  }, [videoId, batchId, subjectId, subjectSlug]);

  // Initialize player on mount
  useEffect(() => {
    const cleanup = initializePlayer();
    return () => {
      cleanup.then(cleanupFn => {
        if (cleanupFn) cleanupFn();
      });
    };
  }, [initializePlayer]);

  // Fetch attachments when sheet opens
  useEffect(() => {
    if (showAttachments) {
      fetchAttachments();
    }
  }, [showAttachments, fetchAttachments]);

  const isLoadingState = isLoading;

  return (
    <div ref={containerRef} className="video-container">
      {/* Loading Overlay */}
      {isLoadingState && (
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

      {/* Attachments Button */}
      <div className="absolute top-4 left-4 z-20">
        <button
          onClick={() => setShowAttachments(true)}
          className="text-white bg-black/60 hover:bg-black/80 border-2 border-gray-700 rounded-lg p-2 w-10 h-10 flex items-center justify-center"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Download Button */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={() => setShowDownloadSheet(true)}
          disabled={isDownloading}
          className="text-white bg-black/60 hover:bg-black/80 border-2 border-gray-700 rounded-lg p-2 w-10 h-10 flex items-center justify-center disabled:opacity-50"
        >
          {isDownloading ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          )}
        </button>
      </div>

      {/* Attachments Modal */}
      {showAttachments && (
        <div className="absolute inset-0 bg-black/60 z-30 flex justify-center items-center">
          <div className="bg-[#1a1a1a] text-white rounded-lg shadow-2xl w-full max-w-md m-4 border-2 border-gray-700">
            <div className="flex justify-between items-center p-4 border-b-2 border-gray-700">
              <h2 className="text-2xl font-black">Attachments</h2>
              <button
                onClick={() => setShowAttachments(false)}
                className="text-white hover:bg-gray-700 p-2 rounded"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {loadingAttachments ? (
                <div className="flex justify-center items-center h-40">
                  <div className="attachment-spinner" />
                </div>
              ) : (
                <div className="w-full">
                  <details open className="border-b border-gray-700">
                    <summary className="flex flex-1 items-center justify-between py-4 font-extrabold text-xl cursor-pointer hover:underline">
                      NOTES
                      <svg className="w-4 h-4 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="pb-4 pt-0">
                      <div className="space-y-2">
                        {attachments.length > 0 ? (
                          attachments.map(attachment => (
                            <div
                              key={attachment._id}
                              className="flex items-center justify-between p-2 rounded-md hover:bg-gray-700/50"
                            >
                              <div className="flex items-center gap-3">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span>{attachment.name}</span>
                              </div>
                              <button
                                onClick={() => handleDownload(attachment.url)}
                                className="p-2 hover:bg-gray-600 rounded"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </button>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-400 text-sm p-2">No notes available</p>
                        )}
                      </div>
                    </div>
                  </details>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Video Element or YouTube Embed */}
      {youtubeUrl ? (
        <iframe
          className="w-full h-full"
          src={youtubeUrl}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <video
          ref={videoRef}
          playsInline
          autoPlay
          style={{ width: '100%', height: '100%' }}
        />
      )}

      {/* Error Messages */}
      {!isLoadingState && errorMessage && (
        errorMessage.includes('Failed to get a valid video URL') ? (
          <div style={{
            color: 'white',
            textAlign: 'center',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10000,
            background: 'rgba(0,0,0,0.8)',
            padding: '20px',
            borderRadius: '10px',
            maxWidth: '90%'
          }}>
            <h2 style={{ fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '15px' }}>
              This Batch is not Available
            </h2>
            <p style={{ fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto 20px', lineHeight: '1.5' }}>
              If any of your friends have this batch, tell them they can log in to donate it.
            </p>
            <button
              onClick={() => router.push('/donate')}
              className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
            >
              Add Batch
            </button>
          </div>
        ) : (
          <div style={{
            color: 'white',
            textAlign: 'center',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10000,
            background: 'rgba(0,0,0,0.8)',
            padding: '20px',
            borderRadius: '10px'
          }}>
            <h2 style={{ fontWeight: 'bold', marginBottom: '10px' }}>
              This may be a loading problem.
            </h2>
            <p style={{ fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>
              {errorMessage}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
            >
              Reload
            </button>
          </div>
        )
      )}

      {/* Download Sheet */}
      {showDownloadSheet && (
        <div className="fixed inset-0 z-50 bg-black/80" onClick={() => setShowDownloadSheet(false)}>
          <div 
            className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 pb-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Download Video</h2>
                <button
                  onClick={() => setShowDownloadSheet(false)}
                  className="h-8 w-8 text-gray-500 hover:bg-gray-100 rounded flex items-center justify-center"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Tutorial Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="bg-red-100 p-3 rounded-lg">
                    <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </div>
                  <h3 className="font-semibold text-lg">Watch Tutorial</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Learn how to use 1DM for downloading videos on your device.
                </p>
                <a
                  href="https://www.youtube.com/watch?v=hYwU-X25dC8"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <button className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">
                    Open YouTube
                  </button>
                </a>
              </div>

              <div className="border-t" />

              {/* Download Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-lg">Download with 1DM</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Click below to start the download. If you don't have 1DM, you will be redirected to the Play Store.
                </p>
                <button
                  className="w-full text-white px-4 py-2 rounded flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: '#5a4bda' }}
                  onClick={() => {
                    if (manifestUrl) {
                      const m3u8Url = encodeURIComponent(manifestUrl.replace(/\.mpd/i, '.m3u8'));
                      router.push(`/download?url=${m3u8Url}`);
                    } else {
                      alert('Video manifest not available for download.');
                    }
                  }}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        body {
          margin: 0;
          background: #000;
        }
        .video-container {
          width: 100vw;
          height: 100vh;
          position: relative;
        }
        video {
          width: 100%;
          height: 100%;
        }
        .spinner {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: conic-gradient(#0000 10%, #fff);
          mask: radial-gradient(farthest-side, #0000 calc(100% - 9px), #000 0);
          animation: spin 1s infinite linear;
        }
        .attachment-spinner {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: conic-gradient(from 90deg at 50% 50%, #0000 90%, #8c8c8c 100%);
          mask: radial-gradient(farthest-side, #0000 calc(100% - 10px), #000 0);
          animation: spin 1.5s infinite linear;
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
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="spinner" />
      </div>
    }>
      <VideoPlayer />
    </Suspense>
  );
}
