import { useState, useEffect, useCallback } from 'react';

// ─── API ──────────────────────────────────────────────────────────────────────

const api = async (path) => {
  const r = await fetch(path);
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

// Extract PDF list from a schedule item
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
