/**
 * API Configuration Service for PW App
 * Manages admin-configured API Base URL
 * Stored in Firebase Firestore
 */

import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Default API URL - fallback if not configured
const DEFAULT_API_URL = 'https://adc.onrender.app';

// API Base URL - cached in memory
let BASE_URL = '';
let isLoading = false;
let loadPromise = null;

// Load API URL from Firebase
const loadApiUrl = async () => {
  if (typeof window === 'undefined') return DEFAULT_API_URL;
  
  // If already loading, return the existing promise
  if (isLoading && loadPromise) {
    return loadPromise;
  }
  
  isLoading = true;
  loadPromise = (async () => {
    try {
      const docRef = doc(db, 'config', 'api');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        BASE_URL = data.baseUrl || DEFAULT_API_URL;
        console.log('✅ API Base URL loaded from Firebase:', BASE_URL);
        return BASE_URL;
      } else {
        // No config in Firebase, use default and save it
        BASE_URL = DEFAULT_API_URL;
        console.log('ℹ️ No API config in Firebase, using default:', DEFAULT_API_URL);
        
        // Save default to Firebase
        try {
          await setDoc(docRef, { baseUrl: DEFAULT_API_URL, updatedAt: new Date().toISOString() });
          console.log('✅ Default API URL saved to Firebase');
        } catch (saveError) {
          console.error('❌ Error saving default API URL:', saveError);
        }
        
        return BASE_URL;
      }
    } catch (error) {
      console.error('❌ Error loading API URL from Firebase:', error);
      // Fallback to default on error
      BASE_URL = DEFAULT_API_URL;
      return DEFAULT_API_URL;
    } finally {
      isLoading = false;
    }
  })();
  
  return loadPromise;
};

// Update BASE_URL and persist to Firebase (admin only)
export const setApiUrl = async (newUrl) => {
  if (!newUrl || typeof newUrl !== 'string') {
    throw new Error('Invalid API URL');
  }
  
  // Validate URL format
  try {
    new URL(newUrl);
  } catch (e) {
    throw new Error('Invalid URL format');
  }
  
  BASE_URL = newUrl.trim();
  
  // Save to Firebase
  try {
    const docRef = doc(db, 'config', 'api');
    await setDoc(docRef, { 
      baseUrl: BASE_URL,
      updatedAt: new Date().toISOString()
    });
    console.log('✅ API Base URL saved to Firebase:', BASE_URL);
  } catch (error) {
    console.error('❌ Error saving API URL to Firebase:', error);
    throw new Error('Failed to save API URL to Firebase');
  }
};

// Get current BASE_URL (async)
export const getApiUrl = async () => {
  if (!BASE_URL) {
    BASE_URL = await loadApiUrl();
  }
  return BASE_URL;
};

// Get current BASE_URL (sync - returns cached or default)
export const getApiUrlSync = () => {
  return BASE_URL || DEFAULT_API_URL;
};

// Validate that BASE_URL is configured
export const validateApiUrl = async () => {
  const url = await getApiUrl();
  if (!url || url.trim() === '') {
    throw new Error('API not configured. Please contact admin.');
  }
  return url;
};

// Custom Batches Management (localStorage)
export const getCustomBatches = () => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem('pw_custom_batches');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('❌ Error loading custom batches:', error);
    return [];
  }
};

export const saveCustomBatches = (batches) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('pw_custom_batches', JSON.stringify(batches));
    console.log('✅ Custom batches saved');
  } catch (error) {
    console.error('❌ Error saving custom batches:', error);
    throw new Error('Failed to save custom batches');
  }
};

export const addCustomBatch = (batch) => {
  const batches = getCustomBatches();
  
  // Validate batch
  if (!batch.batchId || !batch.batchName) {
    throw new Error('Batch ID and Name are required');
  }
  
  // Check for duplicates
  const exists = batches.find(b => b.batchId === batch.batchId);
  if (exists) {
    throw new Error('Batch ID already exists');
  }
  
  batches.push({
    batchId: batch.batchId,
    batchName: batch.batchName,
    batchImage: batch.batchImage || '',
    _tag: batch._tag || 'Custom',
    _custom: true
  });
  
  saveCustomBatches(batches);
  return batches;
};

export const removeCustomBatch = (batchId) => {
  const batches = getCustomBatches();
  const filtered = batches.filter(b => b.batchId !== batchId);
  saveCustomBatches(filtered);
  return filtered;
};

export const updateCustomBatch = (batchId, updates) => {
  const batches = getCustomBatches();
  const index = batches.findIndex(b => b.batchId === batchId);
  
  if (index === -1) {
    throw new Error('Batch not found');
  }
  
  batches[index] = { ...batches[index], ...updates };
  saveCustomBatches(batches);
  return batches;
};

// Get all batches (custom + default) for editing
export const getAllBatchesForEdit = () => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem('pw_all_batches_edits');
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('❌ Error loading batch edits:', error);
    return {};
  }
};

// Save batch edits (for both custom and default batches)
export const saveBatchEdit = (batchId, edits) => {
  if (typeof window === 'undefined') return;
  
  try {
    const allEdits = getAllBatchesForEdit();
    allEdits[batchId] = { ...allEdits[batchId], ...edits };
    localStorage.setItem('pw_all_batches_edits', JSON.stringify(allEdits));
    console.log('✅ Batch edits saved');
  } catch (error) {
    console.error('❌ Error saving batch edits:', error);
    throw new Error('Failed to save batch edits');
  }
};

// Get edited batch data
export const getBatchWithEdits = (batch) => {
  const edits = getAllBatchesForEdit();
  const batchEdits = edits[batch.batchId];
  
  if (!batchEdits) return batch;
  
  return {
    ...batch,
    batchName: batchEdits.batchName || batch.batchName,
    batchImage: batchEdits.batchImage || batch.batchImage,
    _tag: batchEdits._tag || batch._tag
  };
};
