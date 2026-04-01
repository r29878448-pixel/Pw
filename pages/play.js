import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

/**
 * External Player Page
 * Plays videos using deltastudy.site player in iframe
 */
export default function Play() {
  const router = useRouter();
  const { video_id, batch_id, subject_id, subject_slug, schedule_id, topicSlug, title } = router.query;
  const [playerUrl, setPlayerUrl] = useState('');

  useEffect(() => {
    if (!router.isReady) return;
    
    // Build deltastudy.site player URL
    const params = new URLSearchParams();
    if (video_id) params.set('video_id', video_id);
    if (batch_id) params.set('batch_id', batch_id);
    if (subject_id) params.set('subject_id', subject_id);
    if (subject_slug) params.set('subject_slug', subject_slug);
    if (schedule_id) params.set('schedule_id', schedule_id);
    if (topicSlug) params.set('topicSlug', topicSlug);
    
    const url = `https://deltastudy.site/pw/drm/play?${params.toString()}`;
    setPlayerUrl(url);
    
    console.log('🎬 Loading player:', url);
  }, [router.isReady, video_id, batch_id, subject_id, subject_slug, schedule_id, topicSlug]);

  const videoTitle = title ? decodeURIComponent(title) : 'Video Player';

  return (
    <>
      <Head>
        <title>{videoTitle} - PW Mission Topper</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Head>
      
      <div className="fixed inset-0 bg-black flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button 
              onClick={() => router.back()} 
              className="text-gray-400 hover:text-white transition"
              title="Go back"
            >
              ← Back
            </button>
            <p className="text-white text-sm font-medium truncate flex-1">{videoTitle}</p>
          </div>
          <button 
            onClick={() => window.close()} 
            className="text-gray-400 hover:text-white text-sm ml-4"
            title="Close window"
          >
            ✕
          </button>
        </div>

        {/* Player iframe */}
        <div className="flex-1 relative">
          {playerUrl ? (
            <iframe
              src={playerUrl}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              title={videoTitle}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-white">
                <div className="w-12 h-12 rounded-full border-[3px] border-orange-200 border-t-orange-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-300">Loading player...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
