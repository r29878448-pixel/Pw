import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function DrmPlay() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query;
    const params = new URLSearchParams();
    if (q.video_id)    params.set('video_id',    q.video_id);
    if (q.batch_id)    params.set('batch_id',    q.batch_id);
    if (q.subject_id)  params.set('subject_id',  q.subject_id);
    if (q.schedule_id) params.set('schedule_id', q.schedule_id);
    if (q.subject_slug) params.set('subject_slug', q.subject_slug);
    if (q.topicSlug)   params.set('topicSlug',   q.topicSlug);
    if (q.title)       params.set('title',       q.title);
    router.replace(`/player?${params.toString()}`);
  }, [router.isReady]);

  return (
    <div style={{ width:'100vw', height:'100vh', background:'#000', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:48, height:48, borderRadius:'50%', background:'conic-gradient(#0000 10%,#fff)', WebkitMask:'radial-gradient(farthest-side,#0000 calc(100% - 8px),#000 0)', mask:'radial-gradient(farthest-side,#0000 calc(100% - 8px),#000 0)', animation:'spin 1s infinite linear' }} />
      <style>{`@keyframes spin{to{transform:rotate(1turn)}}body{margin:0}`}</style>
    </div>
  );
}
