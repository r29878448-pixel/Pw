import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const IconVideo    = ({ className = 'w-4 h-4' }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2" strokeWidth={1.8}/></svg>;
const IconFile     = ({ className = 'w-4 h-4' }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8"/></svg>;
const IconDPP      = ({ className = 'w-4 h-4' }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14 2v4a2 2 0 0 0 2 2h4m-5 7-2 2-4-4"/></svg>;
const IconPlay     = ({ className = 'w-4 h-4' }) => <svg className={className} fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth={1.8}/><polygon points="10 8 16 12 10 16 10 8"/></svg>;
const IconClock    = ({ className = 'w-3 h-3' }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth={1.8}/><polyline points="12 6 12 12 16 14" strokeWidth={1.8} strokeLinecap="round"/></svg>;
const IconCalendar = ({ className = 'w-3 h-3' }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/></svg>;
const IconChevron  = ({ className = 'w-4 h-4' }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 18l6-6-6-6"/></svg>;
const IconSpin     = ({ className = 'w-5 h-5' }) => <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>;
const IconSparkle  = ({ className = 'w-4 h-4' }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>;
const IconDownload = ({ className = 'w-5 h-5' }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 13v8m0 0-4-4m4 4 4-4M4.393 15.269A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.436 8.284"/></svg>;
const IconBook     = ({ className = 'w-5 h-5' }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 2v8l3-3 3 3V2"/></svg>;
const IconTarget   = ({ className = 'w-4 h-4' }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth={1.8}/><circle cx="12" cy="12" r="6" strokeWidth={1.8}/><circle cx="12" cy="12" r="2" strokeWidth={1.8}/></svg>;
const IconPhone    = ({ className = 'w-5 h-5' }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2" strokeWidth={1.8}/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 18h.01"/></svg>;

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Sk = ({ className }) => <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;

// ─── Bottom Sheet Modal ───────────────────────────────────────────────────────
function BottomSheet({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-md bg-white rounded-t-2xl p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />
        {children}
      </div>
    </div>
  );
}

// ─── PDF Row ──────────────────────────────────────────────────────────────────
function PdfRow({ item, onOpen, loading }) {
  return (
    <div
      onClick={() => onOpen(item)}
      className="flex items-center gap-4 px-4 py-3.5 bg-white border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors group"
    >
      <img
        src="https://static.pw.live/react-batches/assets/study/Icon-material-picture-as-pdf.svg"
        alt="PDF"
        width={28} height={28}
        className="flex-shrink-0 group-hover:scale-110 transition-transform"
      />
      <span className="flex-1 text-sm font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">
        {item.topic}
      </span>
      {loading === item._id
        ? <IconSpin className="w-4 h-4 text-indigo-500" />
        : <IconChevron className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
      }
    </div>
  );
}

// ─── Video Card ───────────────────────────────────────────────────────────────
function VideoCard({ item, onPlay }) {
  const date = item.date ? new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
  return (
    <div
      onClick={() => onPlay(item)}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
    >
      <div className="relative aspect-video overflow-hidden bg-gray-100">
        <img
          src={item.thumbnail || 'https://i.ibb.co/9Hm0NqsH/f69ed82b-7169-45fc-a82b-915e453c6340.png'}
          alt={item.topic}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
          <IconPlay className="w-2.5 h-2.5" /> Lecture
        </div>
      </div>
      <div className="p-4">
        {date && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1.5">
            <IconCalendar /> {date}
          </div>
        )}
        <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors leading-snug mb-2">
          {item.topic}
        </h3>
        {item.duration && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
            <IconClock /> {item.duration}
          </div>
        )}
        <button
          className="w-full py-2 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
          style={{ backgroundColor: '#5a4bda' }}
        >
          <IconPlay className="w-4 h-4" /> Play Now
        </button>
      </div>
    </div>
  );
}

// ─── Tab config ───────────────────────────────────────────────────────────────
const TABS = [
  { key: 'lectures', label: 'Lectures', Icon: IconVideo },
  { key: 'notes',    label: 'Notes',    Icon: IconBook  },
  { key: 'dpp',      label: 'DPP',      Icon: IconDPP   },
];

// ─── API helper ───────────────────────────────────────────────────────────────
const apiFetch = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json();
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TopicContent() {
  const router = useRouter();
  const { batchId, subjectSlug, topicSlug, topicName, subjectId } = router.query;

  const [tab, setTab]           = useState('lectures');
  const [videos, setVideos]     = useState([]);
  const [notes, setNotes]       = useState([]);
  const [dpp, setDpp]           = useState([]);
  const [loading, setLoading]   = useState(false);
  const [pdfLoading, setPdfLoading] = useState(null); // item._id being fetched

  // Video play modal
  const [videoModal, setVideoModal] = useState(null);
  // PDF action modal
  const [pdfModal, setPdfModal]     = useState(null);

  const title = topicName ? decodeURIComponent(topicName) : 'Chapter';

  // ── fetch content ────────────────────────────────────────────────────────────
  const fetchContent = useCallback(async (type) => {
    if (!batchId || !subjectSlug || !topicSlug) return;
    setLoading(true);
    const contentType = type === 'lectures' ? 'videos' : type === 'dpp' ? 'dpp' : 'notes';
    try {
      const isAll = topicSlug === 'all-contents';
      let items = [];

      if (isAll) {
        // fetch all topics first, then content for each
        const td = await apiFetch(`/api/topics?batchId=${batchId}&subjectSlug=${encodeURIComponent(subjectSlug)}`);
        const allTopics = td?.data || td?.topics || td || [];
        const results = await Promise.allSettled(
          allTopics.map(tp =>
            apiFetch(`/api/content?batchId=${batchId}&subjectSlug=${encodeURIComponent(subjectSlug)}&topicSlug=${encodeURIComponent(tp.slug || tp._id)}&contentType=${contentType}`)
              .then(d => (d?.data || d?.content || d || []))
              .catch(() => [])
          )
        );
        items = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
      } else {
        const d = await apiFetch(`/api/content?batchId=${batchId}&subjectSlug=${encodeURIComponent(subjectSlug)}&topicSlug=${encodeURIComponent(topicSlug)}&contentType=${contentType}`);
        items = d?.data || d?.content || d || [];
      }

      if (!Array.isArray(items)) items = [];

      if (type === 'lectures') {
        setVideos(items.map(v => ({
          _id: v._id,
          topic: v.topic,
          thumbnail: v.videoDetails?.image || v.previewImage || 'https://i.ibb.co/9Hm0NqsH/f69ed82b-7169-45fc-a82b-915e453c6340.png',
          date: v.date,
          duration: v.videoDetails?.duration || v.duration || '',
          findKey: v.videoDetails?.findKey || v.findKey || v._id,
        })));
      } else {
        // notes / dpp — flatten homeworkIds
        const pdfs = items.flatMap(item =>
          (item.homeworkIds || [item]).map(hw => ({
            _id: hw._id || item._id,
            topic: hw.topic || item.topic || 'Document',
            pdf_url: hw.attachmentIds?.[0]?.key
              ? (hw.attachmentIds[0].baseUrl || '') + hw.attachmentIds[0].key
              : null,
            needs_fetching: !hw.attachmentIds?.[0]?.key,
            original_schedule_id: item._id,
            subjectId: subjectId || subjectSlug,
          }))
        );
        if (type === 'notes') setNotes(pdfs);
        else setDpp(pdfs);
      }
    } catch (e) {
      console.error('fetchContent error:', e);
    } finally {
      setLoading(false);
    }
  }, [batchId, subjectSlug, topicSlug, subjectId]);

  useEffect(() => { fetchContent(tab); }, [tab, fetchContent]);

  // ── open PDF ─────────────────────────────────────────────────────────────────
  const openPdf = async (item) => {
    if (item.pdf_url && !item.needs_fetching) {
      setPdfModal({ url: item.pdf_url, name: item.topic });
      return;
    }
    setPdfLoading(item._id);
    try {
      const d = await apiFetch(`/api/pdfurl?batchId=${batchId}&subjectId=${encodeURIComponent(item.subjectId || subjectId || subjectSlug)}&scheduleId=${item.original_schedule_id || item._id}`);
      const url = d?.pdfs?.[0]?.url;
      if (url) {
        // cache it
        const update = arr => arr.map(x => x._id === item._id ? { ...x, pdf_url: url, needs_fetching: false } : x);
        if (tab === 'notes') setNotes(update);
        else setDpp(update);
        setPdfModal({ url, name: item.topic });
      } else {
        alert('PDF not available');
      }
    } catch (e) {
      alert('Failed to fetch PDF: ' + e.message);
    } finally {
      setPdfLoading(null);
    }
  };

  // ── play video ────────────────────────────────────────────────────────────────
  const playVideo = (item) => {
    if (!item.findKey) return alert('Video not ready yet');
    setVideoModal(item);
  };

  const goPlay = (platform) => {
    if (!videoModal) return;
    const path = platform === 'apple' ? '/pw/drm/apple/play' : '/pw/drm/play';
    router.push(`${path}?video_id=${videoModal.findKey}&subject_slug=${subjectSlug}&batch_id=${batchId}&schedule_id=${videoModal._id}&subject_id=${encodeURIComponent(subjectId || subjectSlug)}&topicSlug=${encodeURIComponent(topicSlug)}`);
    setVideoModal(null);
  };

  const currentList = tab === 'lectures' ? videos : tab === 'notes' ? notes : dpp;

  return (
    <>
      <Head><title>{title}</title></Head>

      <div className="min-h-screen bg-gray-50">
        {/* Black header */}
        <header className="sticky top-0 z-50 bg-black text-white flex items-center h-14 px-4 gap-3">
          <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          </button>
          <h1 className="flex-1 font-semibold text-base truncate">{title}</h1>
        </header>

        {/* Tabs */}
        <div className="sticky top-14 z-40 bg-white border-b border-gray-200 grid grid-cols-3">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all border-b-2 ${
                tab === key
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        <main className="p-4 md:p-6">
          {/* Section heading */}
          <div className="flex items-center gap-2 mb-4">
            {tab === 'lectures' && <><IconVideo className="w-5 h-5 text-indigo-600" /><h2 className="text-base font-bold">Video Lectures</h2><IconSparkle className="w-4 h-4 text-yellow-400" /></>}
            {tab === 'notes'    && <><IconBook  className="w-5 h-5 text-indigo-600" /><h2 className="text-base font-bold">Study Notes</h2><IconSparkle className="w-4 h-4 text-yellow-400" /></>}
            {tab === 'dpp'      && <><IconDPP   className="w-5 h-5 text-indigo-600" /><h2 className="text-base font-bold">Daily Practice Problems</h2><IconTarget className="w-4 h-4 text-red-500" /></>}
          </div>

          {/* Loading */}
          {loading && tab === 'lectures' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[0,1,2].map(i => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <Sk className="w-full aspect-video rounded-none" />
                  <div className="p-4 space-y-2"><Sk className="h-4 w-3/4" /><Sk className="h-3 w-1/2" /></div>
                </div>
              ))}
            </div>
          )}
          {loading && tab !== 'lectures' && (
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {[0,1,2].map(i => (
                <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                  <Sk className="w-7 h-7 rounded flex-shrink-0" />
                  <Sk className="h-4 flex-1" />
                  <Sk className="w-4 h-4 rounded flex-shrink-0" />
                </div>
              ))}
            </div>
          )}

          {/* Video grid */}
          {!loading && tab === 'lectures' && (
            videos.length > 0
              ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {videos.map(v => <VideoCard key={v._id} item={v} onPlay={playVideo} />)}
                </div>
              : <Empty label="No lectures available yet" Icon={IconVideo} />
          )}

          {/* PDF list */}
          {!loading && tab !== 'lectures' && (
            currentList.length > 0
              ? <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                  {currentList.map(item => <PdfRow key={item._id} item={item} onOpen={openPdf} loading={pdfLoading} />)}
                </div>
              : <Empty label={tab === 'notes' ? 'No notes available yet' : 'No DPPs available yet'} Icon={tab === 'notes' ? IconFile : IconDPP} />
          )}
        </main>
      </div>

      {/* Video play modal */}
      <BottomSheet open={!!videoModal} onClose={() => setVideoModal(null)}>
        <div className="flex items-center gap-2 mb-5">
          <IconVideo className="w-5 h-5 text-indigo-600" />
          <p className="font-semibold text-base truncate">{videoModal?.topic}</p>
        </div>
        <div className="space-y-3">
          <button onClick={() => goPlay('apple')} className="w-full h-12 rounded-xl font-bold text-white flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-900 transition">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"/><path d="M10 2c1 .5 2 2 2 5"/></svg>
            Play on Apple
          </button>
          <button onClick={() => goPlay('drm')} className="w-full h-12 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition" style={{ backgroundColor: '#5a4bda' }}>
            <IconPhone className="w-5 h-5" /> Android / Normal
          </button>
        </div>
      </BottomSheet>

      {/* PDF action modal */}
      <BottomSheet open={!!pdfModal} onClose={() => setPdfModal(null)}>
        <div className="flex items-center gap-2 mb-5">
          <IconFile className="w-5 h-5 text-indigo-600" />
          <p className="font-semibold text-base truncate">{pdfModal?.name}</p>
        </div>
        <div className="space-y-3">
          <button onClick={() => { window.open(pdfModal?.url, '_blank'); setPdfModal(null); }}
            className="w-full h-12 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition" style={{ backgroundColor: '#5a4bda' }}>
            <IconBook className="w-5 h-5" /> Direct Open
          </button>
          <button onClick={() => { window.open(`/api/pdfproxy?url=${encodeURIComponent(pdfModal?.url)}&filename=${encodeURIComponent(pdfModal?.name)}`, '_blank'); setPdfModal(null); }}
            className="w-full h-12 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition" style={{ backgroundColor: '#5a4bda' }}>
            <IconFile className="w-5 h-5" /> View Online
          </button>
          <button onClick={() => { window.open(`/api/pdfproxy?url=${encodeURIComponent(pdfModal?.url)}&filename=${encodeURIComponent(pdfModal?.name)}&dl=1`, '_blank'); setPdfModal(null); }}
            className="w-full h-12 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 flex items-center justify-center gap-2 transition">
            <IconDownload className="w-5 h-5" /> Download
          </button>
        </div>
      </BottomSheet>
    </>
  );
}

function Empty({ label, Icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
      <Icon className="w-14 h-14 text-gray-300 mb-4" />
      <img
        src="https://static.pw.live/react-batches/assets/coming-soon.png"
        alt="Coming Soon"
        width={280}
        height={280}
        style={{ objectFit: 'contain' }}
      />
      <p className="font-semibold text-gray-500 mt-3">{label}</p>
    </div>
  );
}
