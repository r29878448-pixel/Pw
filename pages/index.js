import { useState, useEffect, useCallback, useRef } from 'react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { getApiUrl, getCustomBatches, getBatchWithEdits } from '../lib/apiConfig';

// ─── API ──────────────────────────────────────────────────────────────────────

// API calls through Vercel routes (handles CORS properly)
const api = async (endpoint) => {
  console.log('🌐 API Call:', endpoint);
  
  const r = await fetch(endpoint);
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json();
};

// ─── Constants ────────────────────────────────────────────────────────────────

const GRADIENTS = [
  'from-violet-500 to-purple-700', 'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600', 'from-orange-500 to-red-600',
  'from-pink-500 to-rose-600', 'from-yellow-500 to-amber-600',
  'from-indigo-500 to-blue-700', 'from-teal-500 to-green-600',
  'from-red-500 to-pink-600', 'from-cyan-500 to-blue-500',
];

const TABS = [
  { key: 'videos', label: '🎥 Lectures', ac: 'bg-blue-500 text-white', bd: 'bg-blue-100 text-blue-600', ic: 'bg-blue-50 text-blue-500' },
  { key: 'notes', label: '📄 Notes', ac: 'bg-emerald-500 text-white', bd: 'bg-emerald-100 text-emerald-600', ic: 'bg-emerald-50 text-emerald-500' },
  { key: 'dpp', label: '📝 DPP', ac: 'bg-purple-500 text-white', bd: 'bg-purple-100 text-purple-600', ic: 'bg-purple-50 text-purple-500' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractPdfs(item) {
  const pdfs = [];
  for (const hw of item.homeworkIds || []) {
    for (const att of hw.attachmentIds || []) {
      if (!att.key) continue;
      pdfs.push({
        url: (att.baseUrl || 'https://static.pw.live/') + att.key,
        name: att.name || hw.topic || 'document.pdf',
        topic: hw.topic || item.topic || 'Document',
        note: hw.note || '',
      });
    }
  }
  if (pdfs.length === 0 && (item.url || item.pdfUrl)) {
    pdfs.push({ url: item.url || item.pdfUrl, name: (item.topic || 'doc') + '.pdf', topic: item.topic || 'Document', note: '' });
  }
  return pdfs;
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

const Spin = () => (
  <div className="flex justify-center py-16">
    <div className="w-10 h-10 rounded-full border-[3px] border-orange-200 border-t-orange-500 animate-spin" />
  </div>
);

const Err = ({ msg, retry }) => (
  <div className="text-center py-12">
    <div className="text-5xl mb-3">😵</div>
    <p className="text-red-500 text-sm mb-4">{msg}</p>
    {retry && <button onClick={retry} className="px-5 py-2 bg-orange-500 text-white rounded-xl text-sm hover:bg-orange-600 transition">Retry</button>}
  </div>
);

const Empty = ({ t }) => (
  <div className="text-center py-16 text-gray-400">
    <div className="text-5xl mb-3">📭</div>
    <p>{t}</p>
  </div>
);

const Crumb = ({ trail }) => (
  <div className="flex flex-wrap items-center gap-1.5 text-xs mb-5">
    {trail.map((x, i) => (
      <span key={i} className="flex items-center gap-1.5">
        {i > 0 && <span className="text-gray-300">›</span>}
        {x.fn
          ? <button onClick={x.fn} className="text-orange-500 hover:text-orange-600 font-medium">{x.label}</button>
          : <span className="text-gray-800 font-semibold">{x.label}</span>}
      </span>
    ))}
  </div>
);

// ─── PDF Modal ────────────────────────────────────────────────────────────────

function PdfModal({ pdf, onClose }) {
  const { url, name, topic } = pdf;
  const fname = encodeURIComponent(name || 'document.pdf');
  const viewUrl = `/api/pdfproxy?url=${encodeURIComponent(url)}&filename=${fname}`;
  const dlUrl = `/api/pdfproxy?url=${encodeURIComponent(url)}&filename=${fname}&dl=1`;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span>📄</span>
            <p className="font-semibold text-gray-800 text-sm truncate">{topic || name}</p>
          </div>
          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
            <a href={dlUrl} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs rounded-lg font-medium transition">⬇ Download</a>
            <a href={url} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-lg font-medium transition">🔗 Open</a>
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-lg text-2xl leading-none transition-colors">×</button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <iframe src={viewUrl} className="w-full h-full border-0" title={topic} />
        </div>
      </div>
    </div>
  );
}

// ─── Note Item ────────────────────────────────────────────────────────────────

function AutoOpen({ onMount }) {
  useEffect(() => { onMount(); }, [onMount]);
  return null;
}

function NoteItem({ item, batchId, subjectId, tabColor }) {
  const [pdfs, setPdfs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selPdf, setSelPdf] = useState(null);

  const staticPdfs = extractPdfs(item);

  const fetchPdfs = async () => {
    if (pdfs !== null || loading) return;
    setLoading(true);
    try {
      const r = await api(`/api/pdfurl?batchId=${batchId}&subjectId=${encodeURIComponent(subjectId)}&scheduleId=${item._id}`);
      setPdfs(r.pdfs || []);
    } catch (_) {
      setPdfs([]);
    } finally {
      setLoading(false);
    }
  };

  const allPdfs = staticPdfs.length > 0 ? staticPdfs : (pdfs || []);
  const title = item.topic || item.homeworkIds?.[0]?.topic || 'Document';
  const date = item.date ? new Date(item.date).toLocaleDateString('en-IN') : '';

  return (
    <>
      <div
        onClick={staticPdfs.length > 0 ? () => setSelPdf(staticPdfs[0]) : fetchPdfs}
        className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-emerald-200 hover:shadow-md cursor-pointer transition-all group"
      >
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${tabColor.ic}`}>
          {loading ? <span className="w-4 h-4 rounded-full border-2 border-emerald-300 border-t-emerald-600 animate-spin" /> : '📄'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate group-hover:text-emerald-600 transition-colors">{title}</p>
          <div className="flex gap-2 mt-0.5 text-xs text-gray-400 flex-wrap">
            {date && <span>📅 {date}</span>}
            {pdfs !== null && pdfs.length === 0 && <span className="text-red-400">PDF unavailable</span>}
            {allPdfs.length > 1 && <span className="text-emerald-500">{allPdfs.length} files</span>}
          </div>
        </div>
        {allPdfs.length > 0 && (
          <span className={`text-xs px-2.5 py-1 rounded-full flex-shrink-0 font-medium ${tabColor.bd}`}>👁 View</span>
        )}
      </div>

      {pdfs !== null && pdfs.length > 1 && (
        <div className="ml-4 space-y-1 mt-1">
          {pdfs.map((pdf, i) => (
            <div key={i} onClick={() => setSelPdf(pdf)}
              className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-emerald-50 cursor-pointer transition-all group">
              <span className="text-sm">📄</span>
              <p className="text-xs text-gray-700 truncate group-hover:text-emerald-600 flex-1">{pdf.topic || pdf.name}</p>
              <span className="text-xs text-emerald-500">View</span>
            </div>
          ))}
        </div>
      )}

      {pdfs !== null && pdfs.length === 1 && !selPdf && (
        <AutoOpen onMount={() => setSelPdf(pdfs[0])} />
      )}

      {selPdf && <PdfModal pdf={selPdf} onClose={() => setSelPdf(null)} />}
    </>
  );
}

// ─── Content View ─────────────────────────────────────────────────────────────

function ContentView({ batchId, subjectSlug, subjectId, topic, trail }) {
  const [tab, setTab] = useState('videos');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const topicSlug = topic.slug || topic._id || '';
  const isAllContent = topicSlug === '__all__';

  const load = useCallback(async (t) => {
    setLoading(true); setErr(''); setItems([]);
    try {
      let list = [];
      if (isAllContent) {
        const td = await api(`/api/topics?batchId=${batchId}&subjectSlug=${encodeURIComponent(subjectSlug)}`);
        const allTopics = td?.data || td?.topics || td || [];
        const results = await Promise.allSettled(
          allTopics.slice(0, 20).map(tp =>
            api(`/api/content?batchId=${batchId}&subjectSlug=${encodeURIComponent(subjectSlug)}&topicSlug=${encodeURIComponent(tp.slug || tp._id)}&contentType=${t}`)
              .then(d => {
                const items = d?.data || d?.content || d?.items || d || [];
                return Array.isArray(items) ? items.map(item => ({ ...item, _actualTopicSlug: tp.slug || tp._id })) : [];
              })
              .catch(() => [])
          )
        );
        list = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
      } else {
        const d = await api(`/api/content?batchId=${batchId}&subjectSlug=${encodeURIComponent(subjectSlug)}&topicSlug=${encodeURIComponent(topicSlug)}&contentType=${t}`);
        list = d?.data || d?.content || d?.items || d || [];
      }
      setItems(Array.isArray(list) ? list : []);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }, [batchId, subjectSlug, topicSlug, isAllContent]);

  useEffect(() => { load(tab); }, [tab, load]);

  const cur = TABS.find(t => t.key === tab);
  const isVideo = tab === 'videos';

  return (
    <div>
      <Crumb trail={[...trail, { label: topic.name || topic.title }]} />

      <div className="flex items-start gap-3 mb-5 p-4 bg-orange-50 rounded-2xl border border-orange-100">
        <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white text-lg flex-shrink-0">📖</div>
        <div>
          <p className="text-xs text-orange-500 font-semibold uppercase tracking-wide">Chapter</p>
          <p className="font-bold text-gray-800">{topic.name || topic.title}</p>
          <div className="flex gap-3 mt-1 flex-wrap text-xs text-gray-400">
            {topic.lectureVideos > 0 && <span>🎥 {topic.lectureVideos} lectures</span>}
            {topic.notes > 0 && <span>📄 {topic.notes} notes</span>}
            {topic.exercises > 0 && <span>📝 {topic.exercises} DPP</span>}
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.key ? t.ac + ' shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <Spin />}
      {err && <Err msg={err} retry={() => load(tab)} />}

      {!loading && !err && isVideo && (
        items.length === 0
          ? <Empty t="Is chapter mein videos nahi hain" />
          : <div className="space-y-2">
            {items.map((item, idx) => {
              const vd = item.videoDetails || {};
              const title = item.topic || vd.name || `Video ${idx + 1}`;
              const thumb = vd.image || item.thumbnail;
              const duration = vd.duration || item.duration;
              const date = item.date ? new Date(item.date).toLocaleDateString('en-IN') : '';
              const findKey = vd.findKey || item._id || '';
              const scheduleId = item._id || findKey;
              const actualTopicSlug = item._actualTopicSlug || topicSlug;
              const playerUrl = `https://deltastudy.site/pw/drm/play?video_id=${findKey}&subject_slug=${encodeURIComponent(subjectSlug)}&batch_id=${batchId}&schedule_id=${scheduleId}&subject_id=${encodeURIComponent(subjectId || '')}&topicSlug=${encodeURIComponent(actualTopicSlug)}`;

              return (
                <div key={item._id || idx}
                  onClick={() => window.open(playerUrl, '_blank')}
                  className="bg-white rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all overflow-hidden cursor-pointer">
                  <div className="flex items-center gap-3 p-3 group">
                    {thumb ? (
                      <div className="w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                        <img src={thumb} alt={title} loading="lazy" className="w-full h-full object-cover"
                          onError={e => { e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center text-xl bg-blue-50">🎥</div>'; }} />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 bg-blue-50 text-blue-500">🎥</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-600 transition-colors">{title}</p>
                      <div className="flex gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
                        {duration && <span>⏱ {duration}</span>}
                        {date && <span>📅 {date}</span>}
                        {item.isFree && <span className="text-green-500 font-medium">FREE</span>}
                      </div>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full flex-shrink-0 font-medium bg-blue-100 text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors">▶ Watch</span>
                  </div>
                </div>
              );
            })}
          </div>
      )}

      {!loading && !err && !isVideo && (
        items.length === 0
          ? <Empty t={`Is chapter mein ${tab} nahi hain`} />
          : <div className="space-y-2">
            {items.map((item, idx) => (
              <NoteItem
                key={item._id || idx}
                item={item}
                batchId={batchId}
                subjectId={subjectSlug}
                tabColor={cur}
              />
            ))}
          </div>
      )}
    </div>
  );
}

// ─── Topics View ──────────────────────────────────────────────────────────────

function TopicsView({ batchId, subject, trail }) {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [sel, setSel] = useState(null);
  const [search, setSearch] = useState('');

  const subjectSlug = subject.slug || subject.subjectSlug;

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const d = await api(`/api/topics?batchId=${batchId}&subjectSlug=${encodeURIComponent(subjectSlug)}`);
      const list = d?.data || d?.topics || d || [];
      setTopics(Array.isArray(list) ? list : []);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }, [batchId, subjectSlug]);

  useEffect(() => { load(); }, [load]);

  if (sel) {
    return (
      <ContentView
        batchId={batchId}
        subjectSlug={subjectSlug}
        subjectId={subject._id || subject.subjectId || subjectSlug}
        topic={sel}
        trail={[...trail, { label: subject.subject || subject.name, fn: () => setSel(null) }]}
      />
    );
  }

  const filtered = topics.filter(t => (t.name || '').toLowerCase().includes(search.toLowerCase()));
  const ALL_TOPIC = { _id: '__all__', name: '📋 All Content', slug: '__all__', displayOrder: 0, lectureVideos: '∞', notes: '∞' };

  return (
    <div>
      <Crumb trail={[...trail, { label: subject.subject || subject.name }]} />

      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0 shadow-md bg-gray-100">
          {subject.icon
            ? <img src={subject.icon} alt={subject.subject} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
            : <div className="w-full h-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-2xl">📚</div>
          }
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Subject</p>
          <h2 className="text-xl font-bold text-gray-900">{subject.subject || subject.name}</h2>
          {subject.lectureCount > 0 && <p className="text-xs text-gray-400">{subject.lectureCount} lectures</p>}
        </div>
      </div>

      {topics.length > 5 && (
        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Chapter search karo..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-gray-50" />
        </div>
      )}

      {loading && <Spin />}
      {err && <Err msg={err} retry={load} />}
      {!loading && !err && filtered.length === 0 && <Empty t="Koi chapter nahi mila" />}

      {!loading && !err && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div onClick={() => setSel(ALL_TOPIC)}
            className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white cursor-pointer hover:shadow-lg transition-all col-span-full">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              📋
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-snug">All Content</p>
              <p className="text-xs text-white/70 mt-0.5">Saare topics ka content ek jagah</p>
            </div>
            <span className="text-white/70 text-xl">›</span>
          </div>

          {filtered.map((topic, idx) => (
            <div key={topic._id || idx} onClick={() => setSel(topic)}
              className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-orange-300 hover:shadow-md cursor-pointer transition-all group">
              <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
                {topic.displayOrder || idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 group-hover:text-orange-600 transition-colors leading-snug">{topic.name}</p>
                <div className="flex gap-3 mt-0.5 text-xs text-gray-400">
                  {topic.lectureVideos > 0 && <span>🎥 {topic.lectureVideos}</span>}
                  {topic.notes > 0 && <span>📄 {topic.notes}</span>}
                  {topic.exercises > 0 && <span>📝 {topic.exercises}</span>}
                </div>
              </div>
              <span className="text-gray-300 group-hover:text-orange-400 transition-colors text-xl">›</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Subjects View ────────────────────────────────────────────────────────────

function SubjectsView({ batchId, batch, subjects, trail }) {
  const [sel, setSel] = useState(null);

  const batchTitle = batch?.batchName || batch?.name || `Batch ${batchId}`;
  const batchThumb = batch?.batchImage || batch?.image || batch?.thumbnail;

  if (sel) {
    return (
      <TopicsView
        batchId={batchId}
        subject={sel}
        trail={[...trail, { label: batchTitle, fn: () => setSel(null) }]}
      />
    );
  }

  return (
    <div>
      <Crumb trail={[...trail, { label: batchTitle }]} />

      <div className="relative rounded-2xl overflow-hidden mb-6 bg-gradient-to-r from-orange-500 to-red-600 p-5 text-white shadow-lg min-h-[100px]">
        {batchThumb && (
          <img src={batchThumb} alt={batchTitle}
            className="absolute inset-0 w-full h-full object-cover opacity-20"
            onError={e => { e.target.style.display = 'none'; }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-600/50 to-red-700/50" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-200 mb-1">Batch</p>
          <h2 className="text-2xl font-bold leading-tight">{batchTitle}</h2>
          <p className="text-xs text-orange-200 mt-1 font-mono opacity-60">ID: {batchId}</p>
        </div>
      </div>

      <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">
        📚 Subjects ({subjects.length})
      </p>

      {subjects.length === 0
        ? <Empty t="Is batch mein koi subject nahi mila" />
        : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {subjects.map((sub, idx) => (
              <div key={sub._id || idx} onClick={() => setSel(sub)}
                className={`bg-gradient-to-br ${GRADIENTS[idx % GRADIENTS.length]} p-5 rounded-2xl text-white cursor-pointer hover:scale-[1.04] hover:shadow-xl transition-all shadow-md`}>
                {sub.icon
                  ? <img src={sub.icon} alt={sub.subject} loading="lazy" className="w-10 h-10 rounded-lg object-cover mb-3 bg-white/20" onError={e => { e.target.style.display = 'none'; }} />
                  : <div className="text-3xl mb-3">📚</div>
                }
                <p className="font-bold text-sm leading-tight">{sub.subject || sub.name}</p>
                {sub.lectureCount > 0 && <p className="text-xs mt-1 text-white/70">{sub.lectureCount} lectures</p>}
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}

// ─── Featured Batches ─────────────────────────────────────────────────────────

const DEFAULT_BATCHES = [
  { batchId: '698ad3519549b300a5e1cc6a', batchName: 'Arjuna JEE 2027', batchImage: 'https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/arjuna-jee-2027.png', _tag: 'JEE' },
  { batchId: '69897f0ad7c19b7b2f7cc35f', batchName: 'Arjuna NEET 2027', batchImage: 'https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/arjuna-neet-2027.png', _tag: 'NEET' },
  { batchId: '699434fe5423bd3d67b049b6', batchName: 'UDAAN 2.0 2027 (Class 10th)', batchImage: 'https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/udaan-2027.png', _tag: '10th' },
  { batchId: '67790151518b938bc630052d', batchName: 'Udaan 2027 (Class 10th)', batchImage: 'https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/udaan-2027.png', _tag: '10th' },
];

function BatchesGrid({ onSelect }) {
  const [batches, setBatches] = useState([]);
  const [apiConfigured, setApiConfigured] = useState(false);

  useEffect(() => {
    async function loadBatches() {
      // Check if API is configured
      try {
        const apiUrl = await getApiUrl();
        setApiConfigured(!!apiUrl);
      } catch (e) {
        console.error('Error loading API URL:', e);
      }

      // Load custom batches and merge with defaults
      const customBatches = getCustomBatches();
      const allBatches = [...customBatches, ...DEFAULT_BATCHES];
      
      // Apply edits to all batches
      const batchesWithEdits = allBatches.map(batch => getBatchWithEdits(batch));
      
      console.log('📦 Loaded batches:', batchesWithEdits.map(b => ({ 
        name: b.batchName, 
        image: b.batchImage 
      })));
      
      setBatches(batchesWithEdits);
    }
    
    loadBatches();
  }, []);
  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl text-3xl shadow-lg mb-4">⚡</div>
        <h1 className="text-3xl font-bold text-gray-900">Physics Wallah</h1>
        <p className="text-gray-500 text-sm mt-2">Apna batch choose karo</p>
      </div>

      {!apiConfigured && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-center">
          <p className="text-red-800 text-sm font-medium">
            😔 Sorry! Server is temporarily down. Please try again later.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 max-w-5xl mx-auto">
        {batches.map((batch, idx) => {
          const tagColors = ['from-blue-500 to-indigo-600', 'from-emerald-500 to-teal-600', 'from-purple-500 to-violet-600', 'from-orange-500 to-red-600'];
          const thumbnail = batch.batchImage || batch.previewImage || batch.thumbnail;
          
          return (
            <div key={batch.batchId} onClick={() => onSelect(batch.batchId, batch)}
              className="group relative bg-white rounded-2xl overflow-hidden cursor-pointer hover:shadow-2xl transition-all hover:-translate-y-2 shadow-lg border border-gray-100">
              
              {/* Thumbnail Image */}
              {thumbnail ? (
                <div className="relative h-40 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                  <img 
                    src={thumbnail} 
                    alt={batch.batchName}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'flex';
                    }}
                  />
                  {/* Fallback icon if image fails */}
                  <div className="hidden absolute inset-0 items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
                    <span className="text-6xl">
                      {batch._custom ? '⭐' : idx === 0 ? '🔬' : idx === 1 ? '🧬' : idx === 2 ? '📚' : '📖'}
                    </span>
                  </div>
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  {/* Tag badge */}
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-gray-800 text-xs px-2.5 py-1 rounded-full font-bold shadow-sm">
                    {batch._tag}
                  </div>
                </div>
              ) : (
                // No thumbnail - show gradient with icon
                <div className={`relative h-40 bg-gradient-to-br ${tagColors[idx]} flex items-center justify-center`}>
                  <span className="text-6xl">
                    {batch._custom ? '⭐' : idx === 0 ? '🔬' : idx === 1 ? '🧬' : idx === 2 ? '📚' : '📖'}
                  </span>
                  <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full font-bold">
                    {batch._tag}
                  </div>
                </div>
              )}
              
              {/* Content */}
              <div className="p-4">
                <p className="font-bold text-gray-900 text-base leading-snug line-clamp-2 mb-2">
                  {batch.batchName}
                </p>
                <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                  <span>{batch._custom ? 'Custom Batch' : 'Open Batch'}</span>
                  <span>→</span>
                </div>
              </div>
              
              {/* Hover effect */}
              <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 transition-all pointer-events-none" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const [view, setView] = useState({ screen: 'batches', batchId: null, batch: null, subjects: [] });
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginMode, setLoginMode] = useState('google');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const authCheckTimeout = useRef(null);

  useEffect(() => {
    console.log('[Home] Setting up auth');
    
    authCheckTimeout.current = setTimeout(() => {
      console.log('[Home] Timeout - stopping loading');
      setAuthLoading(false);
    }, 3000);
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('[Home] Auth state:', currentUser?.email || 'No user');
      if (authCheckTimeout.current) clearTimeout(authCheckTimeout.current);
      setUser(currentUser);
      setAuthLoading(false);
    });
    
    return () => {
      if (authCheckTimeout.current) clearTimeout(authCheckTimeout.current);
      unsubscribe();
    };
  }, []);

  const handleGoogleLogin = async () => {
    setLoginError('');
    try {
      await signInWithPopup(auth, googleProvider);
      setShowLoginModal(false);
    } catch (err) {
      setLoginError(err.message || 'Login failed');
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password.trim());
      setShowLoginModal(false);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        try {
          await createUserWithEmailAndPassword(auth, email.trim(), password.trim());
          setShowLoginModal(false);
        } catch (createErr) {
          setLoginError(createErr.message || 'Failed to create account');
        }
      } else {
        setLoginError(err.message || 'Login failed');
      }
    }
  };

  const goHome = () => setView({ screen: 'batches', batchId: null, batch: null, subjects: [] });

  const handleBatchSelect = async (batchId, batch) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    setLoadingBatch(true);
    let subjects = [];
    try {
      const d = await api(`/api/batchdetails?batchId=${batchId}`);
      subjects = d?.data?.subjects || d?.subjects || [];
    } catch (_) {}
    setLoadingBatch(false);
    setView({ screen: 'subjects', batchId, batch, subjects });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-[3px] border-orange-200 border-t-orange-500 animate-spin" />
          <p className="text-gray-700 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={goHome} className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center text-white font-bold shadow hover:scale-105 transition-transform">
            ⚡
          </button>
          <span className="font-bold text-gray-900">Physics Wallah</span>
          {view.batch && (
            <span className="text-gray-400 text-xs ml-auto truncate max-w-[200px]">
              {view.batch.batchName || view.batch.name}
            </span>
          )}
          {!user ? (
            <button
              onClick={() => setShowLoginModal(true)}
              className="ml-auto px-4 py-1.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg text-sm font-semibold hover:shadow-lg transition"
            >
              Login
            </button>
          ) : (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-gray-600">{user.email}</span>
              <button
                onClick={() => auth.signOut()}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-300 transition"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowLoginModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                🔐
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Login Required</h2>
              <p className="text-gray-500 text-sm mt-2">Login karo content dekhne ke liye</p>
            </div>

            {loginError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {loginError}
              </div>
            )}

            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setLoginMode('google')}
                className={`flex-1 py-2 rounded-lg font-medium transition ${
                  loginMode === 'google'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                🔍 Google
              </button>
              <button
                onClick={() => setLoginMode('email')}
                className={`flex-1 py-2 rounded-lg font-medium transition ${
                  loginMode === 'email'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                📧 Email
              </button>
            </div>

            {loginMode === 'google' ? (
              <button
                onClick={handleGoogleLogin}
                className="w-full bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Login with Google
              </button>
            ) : (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition"
                >
                  Login
                </button>
              </form>
            )}

            <button
              onClick={() => setShowLoginModal(false)}
              className="w-full mt-4 text-gray-500 text-sm hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loadingBatch && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full border-[3px] border-orange-200 border-t-orange-500 animate-spin" />
            <p className="text-gray-700 font-semibold">Batch load ho raha hai...</p>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 min-h-[500px]">
          {view.screen === 'batches' && <BatchesGrid onSelect={handleBatchSelect} />}
          {view.screen === 'subjects' && (
            <SubjectsView
              batchId={view.batchId}
              batch={view.batch}
              subjects={view.subjects}
              trail={[{ label: '⚡ PW', fn: goHome }]}
            />
          )}
        </div>
      </main>
    </div>
  );
}
