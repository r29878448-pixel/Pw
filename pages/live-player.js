'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function LivePlayer() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;
    
    // Redirect to player.js with is_live flag
    const { video_id, batch_id, subject_id, schedule_id, title } = router.query;
    
    const params = new URLSearchParams();
    if (video_id) params.set('video_id', video_id);
    if (batch_id) params.set('batch_id', batch_id);
    if (subject_id) params.set('subject_id', subject_id);
    if (schedule_id) params.set('schedule_id', schedule_id);
    if (title) params.set('title', title);
    params.set('is_live', '1');
    
    router.replace(`/player?${params.toString()}`);
  }, [router.isReady, router.query]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white text-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm">Redirecting to player...</p>
      </div>
    </div>
  );
}

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white text-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm">Redirecting to player...</p>
      </div>
    </div>
  );
}