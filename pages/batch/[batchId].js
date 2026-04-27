import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const api = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json();
};

function getClassStatus(cls) {
  const topic = (cls.topic || '').toLowerCase();
  if (topic.includes('cancelled') || topic.includes('canceled')) return 'cancelled';
  
  // Check time-based status first
  const now = new Date();
  const startTime = cls.startTime ? new Date(cls.startTime) : null;
  const endTime = cls.endTime ? new Date(cls.endTime) : null;
  
  if (startTime) {
    // If class has started and not ended yet, it's LIVE
    if (now >= startTime) {
      // Check if it has ended
      if (endTime && now > endTime) {
        return 'ended';
      }
      // If no end time, assume 2 hour duration
      const estimatedEnd = new Date(startTime.getTime() + (2 * 60 * 60 * 1000));
      if (now > estimatedEnd) {
        return 'ended';
      }
      // Class is currently live
      return 'live';
    } else {
      // Class hasn't started yet
      return 'upcoming';
    }
  }
  
  // Fallback to tag/status if no time info
  if (cls.tag === 'live'  || cls.status === 'live')  return 'live';
  if (cls.tag === 'ended' || cls.status === 'ended'  || topic.includes('recorded')) return 'ended';
  return 'upcoming';
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const IcoCalendar = () => (
  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth={1.8}/>
    <path strokeLinecap="round" strokeWidth={1.8} d="M8 2v4M16 2v4M3 10h18"/>
  </svg>
);

const IcoBook = () => (
  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 7v14M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>
  </svg>
);

const IcoInfo = () => (
  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" strokeWidth={1.8}/>
    <path strokeLinecap="round" strokeWidth={1.8} d="M12 16v-4M12 8h.01"/>
  </svg>
);

const IcoUser = () => (
  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4" strokeWidth={1.8}/>
  </svg>
);

const IcoClock = () => (
  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" strokeWidth={1.8}/>
    <polyline points="12 6 12 12 16 14" strokeWidth={1.8} strokeLinecap="round"/>
  </svg>
);

const IcoPlay = () => (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
);

const IcoShare = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="18" cy="5" r="3" strokeWidth={1.8}/><circle cx="6" cy="12" r="3" strokeWidth={1.8}/><circle cx="18" cy="19" r="3" strokeWidth={1.8}/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" strokeWidth={1.8}/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" strokeWidth={1.8}/>
  </svg>
);

const IcoBell = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.268 21a2 2 0 0 0 3.464 0M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>
  </svg>
);

const IcoChevron = () => (
  <svg className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 18l6-6-6-6"/>
  </svg>
);

const IcoDefaultSubject = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 7v14M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>
  </svg>
);

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Sk = ({ className }) => <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  if (status === 'live') return (
    <span className="absolute top-2 right-2 flex items-center gap-1 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping absolute" />
      <span className="w-1.5 h-1.5 bg-white rounded-full relative" />
      LIVE
    </span>
  );
  if (status === 'ended') return (
    <span className="absolute top-2 right-2 bg-gray-800/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">Recorded</span>
  );
  if (status === 'cancelled') return (
    <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">Cancelled</span>
  );
  return (
    <span className="absolute top-2 right-2 bg-white/90 text-gray-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-gray-200">UPCOMING</span>
  );
}

// ─── Live Class Card ──────────────────────────────────────────────────────────
function LiveCard({ cls, batchId, router }) {
  const status = getClassStatus(cls);
  const cancelled = status === 'cancelled';
  const thumb = cls.videoDetails?.image || cls.thumbnail || '';
  const subject = cls.subjectId?.name || cls.subject || '';
  const teacher = cls.teachers?.[0]?.name || cls.teacher || '';
  const findKey = cls.videoDetails?.findKey || cls.videoId || cls._id || '';
  const subjectId = cls.subjectId?._id || cls.subjectId || '';
  const time = cls.startTime
    ? new Date(cls.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    : '';
  const isUpcoming = status === 'upcoming' || cancelled;

  const handleClick = () => {
    if (cancelled) return;
    if (status === 'live' || status === 'upcoming') {
      // Use /live for live streams
      router.push(`/live?batch_id=${batchId}&schedule_id=${cls._id}&video_id=${findKey}&subject_id=${encodeURIComponent(subjectId)}&subject_slug=${encodeURIComponent(subject)}&title=${encodeURIComponent(cls.topic || 'Live Class')}`);
    } else {
      router.push(`/player?video_id=${findKey}&batch_id=${batchId}&schedule_id=${cls._id}&subject_id=${encodeURIComponent(subjectId)}&title=${encodeURIComponent(cls.topic || 'Recording')}`);
    }
  };

  return (
    <div className="flex-shrink-0 w-[220px] bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={handleClick}>
      <div className="relative w-full aspect-video bg-gray-100 overflow-hidden">
        {thumb
          ? <img src={thumb} alt={cls.topic} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
          : <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/>
                <rect x="2" y="6" width="14" height="12" rx="2" strokeWidth={1.5}/>
              </svg>
            </div>
        }
        <StatusBadge status={status} />
      </div>
      <div className="p-3 flex flex-col gap-1">
        {subject && <p className="text-[11px] font-semibold text-indigo-600 truncate">{subject}</p>}
        <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-snug">{cls.topic || 'Class'}</p>
        <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
          {teacher && <span className="flex items-center gap-1 truncate max-w-[110px]"><IcoUser />{teacher}</span>}
          {time && <span className="flex items-center gap-1"><IcoClock />{time}</span>}
        </div>
        <button
          disabled={!!isUpcoming}
          className={`mt-2 w-full py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
            isUpcoming ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {isUpcoming ? (
            <><IcoClock />Upcoming</>
          ) : (
            <><IcoPlay />Play Now</>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Today's Classes ──────────────────────────────────────────────────────────
function TodayClasses({ classes, batchId, router, loading }) {
  const count = classes.filter(c => getClassStatus(c) !== 'cancelled').length;
  return (
    <section className="px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <IcoCalendar />
          <h2 className="text-base font-bold text-gray-900">Today's Classes</h2>
        </div>
        {!loading && count > 0 && (
          <span className="text-xs text-gray-500">{count} {count === 1 ? 'class' : 'classes'}</span>
        )}
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex-shrink-0 w-[220px] rounded-xl border border-gray-100 overflow-hidden">
              <Sk className="w-full aspect-video rounded-none" />
              <div className="p-3 space-y-2">
                <Sk className="h-3 w-1/2" /><Sk className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 bg-white rounded-xl border border-gray-200">
          <svg className="w-10 h-10 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth={1.5}/><path strokeLinecap="round" strokeWidth={1.5} d="M8 2v4M16 2v4M3 10h18"/>
          </svg>
          <p className="text-gray-500 text-sm font-medium">No live classes scheduled for today.</p>
          <p className="text-gray-400 text-xs mt-1">Check back later for updates</p>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {classes.map((cls, i) => (
            <LiveCard key={cls._id || i} cls={cls} batchId={batchId} router={router} />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Subjects List ────────────────────────────────────────────────────────────
function SubjectsList({ subjects, loading, onSelect }) {
  return (
    <section className="py-3">
      <div className="flex items-center justify-between px-4 mb-2">
        <div className="flex items-center gap-2">
          <IcoBook />
          <h2 className="text-base font-bold text-gray-900">Subjects</h2>
        </div>
        {!loading && subjects.length > 0 && (
          <span className="text-xs text-gray-500">{subjects.length}</span>
        )}
      </div>

      {loading ? (
        <div className="bg-white">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-gray-100">
              <Sk className="w-9 h-9 rounded-lg flex-shrink-0" />
              <Sk className="h-4 flex-1" />
              <Sk className="w-4 h-4 rounded flex-shrink-0" />
            </div>
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">No subjects found.</div>
      ) : (
        <div className="bg-white">
          {subjects.map((sub, idx) => (
            <div
              key={sub._id || idx}
              onClick={() => onSelect(sub)}
              className="flex items-center gap-4 px-4 py-3.5 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
                {sub.icon
                  ? <img
                      src={sub.icon}
                      alt={sub.subject || sub.name}
                      className="w-full h-full object-cover"
                      onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                    />
                  : null
                }
                <span className={`${sub.icon ? 'hidden' : 'flex'} w-full h-full items-center justify-center`}>
                  <IcoDefaultSubject />
                </span>
              </div>
              <p className="flex-1 text-sm font-medium text-gray-800 group-hover:text-indigo-600 transition-colors">
                {sub.subject || sub.name}
              </p>
              <IcoChevron />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── About Batch ──────────────────────────────────────────────────────────────
function AboutBatch({ description }) {
  if (!description) return null;
  return (
    <section className="px-4 py-3">
      <div className="flex items-center gap-2 mb-3">
        <IcoInfo />
        <h2 className="text-base font-bold text-gray-900">About Batch</h2>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="text-sm text-gray-700 prose prose-sm max-w-full" dangerouslySetInnerHTML={{ __html: description }} />
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function BatchDetail() {
  const router = useRouter();
  const { batchId, name } = router.query;

  const [subjects, setSubjects]       = useState([]);
  const [liveClasses, setLiveClasses] = useState([]);
  const [batchName, setBatchName]     = useState('');
  const [description, setDescription] = useState('');
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingLive, setLoadingLive]         = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async (id) => {
    setLoadingSubjects(true);
    setError('');
    try {
      const d = await api(`/api/batchdetails?batchId=${id}`);
      const data = d?.data || d;
      setSubjects(data?.subjects || []);
      if (data?.name) setBatchName(data.name);
      if (data?.description) setDescription(data.description);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingSubjects(false);
    }

    setLoadingLive(true);
    try {
      const live = await api(`/api/live?batchId=${id}`);
      const arr = live?.data || live || [];
      setLiveClasses(Array.isArray(arr) ? arr : []);
    } catch (_) {
      setLiveClasses([]);
    } finally {
      setLoadingLive(false);
    }
  }, []);

  useEffect(() => {
    if (batchId) fetchData(batchId);
  }, [batchId, fetchData]);

  const title = batchName || (name ? decodeURIComponent(name) : 'Batch');

  const handleSubjectClick = (sub) => {
    const slug  = sub.slug || sub.subjectSlug || sub._id;
    const sId   = sub._id || sub.subjectId || slug;
    const sName = encodeURIComponent(sub.subject || sub.name || '');
    router.push(`/batch/${batchId}/${slug}?subjectName=${sName}&subjectId=${encodeURIComponent(sId)}`);
  };

  const handleShare = () => {
    const text = `Check out this batch: ${title} ${window.location.href}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <>
      <Head><title>{title}</title></Head>

      <div className="min-h-screen bg-gray-50">
        {/* Black top nav */}
        <header className="sticky top-0 z-50 bg-black text-white flex items-center h-14 px-4 gap-3 shadow-sm">
          <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800 transition text-xl">
            ←
          </button>
          <h1 className="flex-1 font-semibold text-base truncate">{title}</h1>
        </header>

        {/* Share + Announcements */}
        <div className="sticky top-14 z-40 bg-white border-b border-gray-100 px-4 py-2 flex gap-3">
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            <IcoShare />Share
          </button>
          <button
            onClick={() => router.push(`/batch/${batchId}/announcements?name=${encodeURIComponent(title)}`)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            <IcoBell />Announcements
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-center">
            <p className="text-red-600 font-medium text-sm">Failed to load batch details</p>
            <p className="text-red-400 text-xs mt-1">{error}</p>
            <button onClick={() => fetchData(batchId)} className="mt-3 px-4 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition">
              Retry
            </button>
          </div>
        )}

        {/* Today's Classes */}
        <TodayClasses classes={liveClasses} batchId={batchId} router={router} loading={loadingLive} />

        {/* Subjects */}
        <SubjectsList subjects={subjects} loading={loadingSubjects} onSelect={handleSubjectClick} />

        {/* About Batch */}
        <AboutBatch description={description} />

        <div className="h-8" />
      </div>
    </>
  );
}
