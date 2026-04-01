/**
 * API Configuration Service for PW App
 * Manages admin-configured API Base URL
 * Stored in localStorage (can be upgraded to Firebase later)
 */

// API Base URL - loaded from localStorage
let BASE_URL = '';

// Load API URL from localStorage
const loadApiUrl = () => {
  if (typeof window === 'undefined') return '';
  
  try {
    const stored = localStorage.getItem('pw_api_base_url');
    if (stored) {
      BASE_URL = stored;
      console.log('✅ API Base URL loaded:', BASE_URL);
      return BASE_URL;
    }
  } catch (error) {
    console.error('❌ Error loading API URL:', error);
  }
  
  return '';
};

// Initialize on module load (browser only)
if (typeof window !== 'undefined') {
  loadApiUrl();
}

// Update BASE_URL and persist to localStorage (admin only)
export const setApiUrl = (newUrl) => {
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
  
  // Save to localStorage
  try {
    localStorage.setItem('pw_api_base_url', BASE_URL);
    console.log('✅ API Base URL saved:', BASE_URL);
  } catch (error) {
    console.error('❌ Error saving API URL:', error);
    throw new Error('Failed to save API URL');
  }
};

// Get current BASE_URL
export const getApiUrl = () => {
  if (!BASE_URL) {
    BASE_URL = loadApiUrl();
  }
  return BASE_URL;
};

// Validate that BASE_URL is configured
export const validateApiUrl = () => {
  const url = getApiUrl();
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
