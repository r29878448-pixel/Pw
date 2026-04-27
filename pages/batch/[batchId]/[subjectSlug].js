import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const api = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json();
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const IconVideo = () => (
  <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
    <rect x="2" y="6" width="14" height="12" rx="2" strokeWidth={1.8} />
  </svg>
);

const IconPen = () => (
  <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m18 13-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.879a1 1 0 0 0 .776.746L13 18" />
    <circle cx="11" cy="11" r="2" strokeWidth={1.8} />
  </svg>
);

const IconFile = () => (
  <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8" />
  </svg>
);

const IconBook = () => (
  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 7v14M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
  </svg>
);

const IconSparkle = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
  </svg>
);

const IconChevron = () => (
  <svg className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 18l6-6-6-6" />
  </svg>
);

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Sk = ({ className }) => <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;

// ─── Dot separator ────────────────────────────────────────────────────────────
const Dot = () => <span className="text-gray-300 hidden sm:inline">•</span>;

// ─── Topic Row ────────────────────────────────────────────────────────────────
function TopicRow({ topic, onClick }) {
  const isAll = topic._id === 'all-contents';
  const videos = topic.videos || topic.lectureVideos || 0;
  const exercises = topic.exercises || 0;
  const notes = topic.notes || 0;
  const hasContent = videos > 0 || exercises > 0 || notes > 0;

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 px-5 py-4 bg-white border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors group"
    >
      {/* Left colored bar */}
      <div className={`w-1.5 h-10 rounded-full flex-shrink-0 transition-all duration-300 group-hover:h-12 ${isAll ? 'bg-indigo-600' : 'bg-gray-300 group-hover:bg-indigo-500'}`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors leading-snug">
            {topic.name}
          </h3>
          {isAll && (
            <span className="flex items-center gap-1 text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
              <IconSparkle />
              Overview
            </span>
          )}
        </div>

        <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
          {isAll ? (
            <>
              <span className="flex items-center gap-1.5"><IconVideo />All Videos</span>
              <Dot />
              <span className="flex items-center gap-1.5"><IconPen />All Exercises</span>
              <Dot />
              <span className="flex items-center gap-1.5"><IconFile />All Notes</span>
            </>
          ) : hasContent ? (
            <>
              {videos > 0 && (
                <span className="flex items-center gap-1.5">
                  <IconVideo />{videos} {videos === 1 ? 'Video' : 'Videos'}
                </span>
              )}
              {videos > 0 && exercises > 0 && <Dot />}
              {exercises > 0 && (
                <span className="flex items-center gap-1.5">
                  <IconPen />{exercises} {exercises === 1 ? 'Exercise' : 'Exercises'}
                </span>
              )}
              {(videos > 0 || exercises > 0) && notes > 0 && <Dot />}
              {notes > 0 && (
                <span className="flex items-center gap-1.5">
                  <IconFile />{notes} {notes === 1 ? 'Note' : 'Notes'}
                </span>
              )}
            </>
          ) : (
            <span className="text-gray-400 italic text-xs">No content yet</span>
          )}
        </div>
      </div>

      <IconChevron />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SubjectTopics() {
  const router = useRouter();
  const { batchId, subjectSlug, subjectName, subjectId } = router.query;

  const [topics, setTopics]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const title = subjectName ? decodeURIComponent(subjectName) : 'Subject';

  const fetchTopics = useCallback(async (bId, sSlug) => {
    setLoading(true);
    setError('');
    try {
      const d = await api(`/api/topics?batchId=${bId}&subjectSlug=${encodeURIComponent(sSlug)}`);
      const list = d?.data || d?.topics || d || [];
      const arr = Array.isArray(list) ? list : [];

      const allTopic = {
        _id: 'all-contents',
        name: 'All Contents',
        slug: 'all-contents',
        videos: arr.reduce((s, t) => s + (t.videos || t.lectureVideos || 0), 0),
        exercises: arr.reduce((s, t) => s + (t.exercises || 0), 0),
        notes: arr.reduce((s, t) => s + (t.notes || 0), 0),
      };

      setTopics([allTopic, ...arr]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (batchId && subjectSlug) fetchTopics(batchId, subjectSlug);
  }, [batchId, subjectSlug, fetchTopics]);

  const handleTopicClick = (topic) => {
    const sId = subjectId || subjectSlug;
    router.push(
      `/batch/${batchId}/${subjectSlug}/${topic.slug || topic._id}?topicName=${encodeURIComponent(topic.name)}&topicId=${topic._id}&subjectId=${encodeURIComponent(sId)}&subjectName=${encodeURIComponent(title)}`
    );
  };

  const topicCount = topics.filter(t => t._id !== 'all-contents').length;

  return (
    <>
      <Head><title>{title}</title></Head>

      <div className="min-h-screen bg-gray-50">
        {/* Black header */}
        <header className="sticky top-0 z-50 bg-black text-white flex items-center h-14 px-4 gap-3">
          <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800 transition text-xl">
            ←
          </button>
          <h1 className="flex-1 font-semibold text-base truncate">{title}</h1>
        </header>

        {/* Subject info bar */}
        {!loading && !error && topics.length > 0 && (
          <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl flex-shrink-0">
              <IconBook />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">{title}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-500">{topicCount} {topicCount === 1 ? 'topic' : 'topics'}</span>
                <span className="flex items-center gap-1 text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">
                  <IconSparkle />All Contents
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="m-4 p-5 bg-red-50 border border-red-200 rounded-xl text-center">
            <p className="text-red-600 font-semibold mb-1">Failed to load topics</p>
            <p className="text-red-500 text-sm mb-3">{error}</p>
            <button onClick={() => fetchTopics(batchId, subjectSlug)} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition">
              Try Again
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-white mt-2">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-100">
                <Sk className="w-1.5 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Sk className="h-4 w-3/4" />
                  <Sk className="h-3 w-1/2" />
                </div>
                <Sk className="w-4 h-4 rounded flex-shrink-0" />
              </div>
            ))}
          </div>
        )}

        {/* Topics list */}
        {!loading && !error && topics.length > 0 && (
          <div className="bg-white mt-2 shadow-sm">
            {topics.map((topic, i) => (
              <TopicRow key={topic._id || i} topic={topic} onClick={() => handleTopicClick(topic)} />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && topics.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
            </svg>
            <p className="font-medium">No topics available</p>
            <p className="text-sm mt-1">Check back later for updates</p>
          </div>
        )}

        <div className="h-8" />
      </div>
    </>
  );
}
