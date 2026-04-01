import { useState, useEffect } from 'react';
import { auth, googleProvider, ADMIN_EMAIL, ADMIN_PASSWORD, isAdmin } from '../lib/firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getApiUrl, setApiUrl, getCustomBatches, addCustomBatch, removeCustomBatch, updateCustomBatch, getAllBatchesForEdit, saveBatchEdit } from '../lib/apiConfig';
import { setAdminAccess, removeAdminAccess } from '../lib/devToolsProtection';

export default function AdminPanel() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginMode, setLoginMode] = useState('email'); // 'email' or 'google'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [apiUrl, setApiUrlState] = useState('');
  const [customBatches, setCustomBatches] = useState([]);
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [newBatch, setNewBatch] = useState({
    batchId: '',
    batchName: '',
    batchImage: '',
    _tag: ''
  });
  
  // Default batches for editing
  const [defaultBatches] = useState([
    { batchId: '698ad3519549b300a5e1cc6a', batchName: 'Arjuna JEE 2027', batchImage: 'https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/arjuna-jee-2027.png', _tag: 'JEE' },
    { batchId: '69897f0ad7c19b7b2f7cc35f', batchName: 'Arjuna NEET 2027', batchImage: 'https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/arjuna-neet-2027.png', _tag: 'NEET' },
    { batchId: '699434fe5423bd3d67b049b6', batchName: 'UDAAN 2.0 2027 (Class 10th)', batchImage: 'https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/udaan-2027.png', _tag: '10th' },
    { batchId: '67790151518b938bc630052d', batchName: 'Udaan 2027 (Class 10th)', batchImage: 'https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/udaan-2027.png', _tag: '10th' },
  ]);

  useEffect(() => {
    let mounted = true;
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (!mounted) return;
      
      if (currentUser && isAdmin(currentUser.email)) {
        setUser(currentUser);
        setAdminAccess(ADMIN_EMAIL);
        setError('');
        loadData();
      } else if (currentUser) {
        setError('Only admin can access this panel');
        auth.signOut();
        setUser(null);
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const loadData = () => {
    const url = getApiUrl();
    setApiUrlState(url || '');
    
    const batches = getCustomBatches();
    setCustomBatches(batches);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (!isAdmin(result.user.email)) {
        setError('Only admin can access this panel');
        await auth.signOut();
        setUser(null);
      } else {
        // Auth state listener will handle setting user
        setError('');
      }
    } catch (err) {
      console.error('Google login error:', err);
      setError(err.message || 'Login failed');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Trim inputs and check admin credentials
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    
    if (trimmedEmail === ADMIN_EMAIL && trimmedPassword === ADMIN_PASSWORD) {
      try {
        await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
        // Auth state listener will handle setting user
        setError('');
      } catch (err) {
        // If user doesn't exist, create account
        if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
          try {
            await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
            // Auth state listener will handle setting user
            setError('');
          } catch (createErr) {
            console.error('Create user error:', createErr);
            setError(createErr.message || 'Failed to create account');
          }
        } else {
          console.error('Login error:', err);
          setError(err.message || 'Login failed');
        }
      }
    } else {
      setError('Invalid admin credentials');
    }
    setLoading(false);
  };

  const handleSaveApiUrl = () => {
    try {
      setApiUrl(apiUrl);
      alert('✅ API URL saved successfully!');
    } catch (error) {
      alert('❌ Error: ' + error.message);
    }
  };

  const handleAddBatch = () => {
    try {
      addCustomBatch(newBatch);
      setCustomBatches(getCustomBatches());
      setNewBatch({ batchId: '', batchName: '', batchImage: '', _tag: '' });
      setShowAddBatch(false);
      alert('✅ Batch added successfully!');
    } catch (error) {
      alert('❌ Error: ' + error.message);
    }
  };

  const handleRemoveBatch = (batchId) => {
    if (confirm('Are you sure you want to remove this batch?')) {
      removeCustomBatch(batchId);
      setCustomBatches(getCustomBatches());
      alert('✅ Batch removed!');
    }
  };

  const handleEditBatch = (batch) => {
    const edits = getAllBatchesForEdit();
    const batchEdits = edits[batch.batchId] || {};
    
    setEditingBatch({
      batchId: batch.batchId,
      batchName: batchEdits.batchName || batch.batchName,
      batchImage: batchEdits.batchImage || batch.batchImage,
      _tag: batchEdits._tag || batch._tag,
      _isCustom: batch._custom || false
    });
  };

  const handleSaveEdit = () => {
    try {
      saveBatchEdit(editingBatch.batchId, {
        batchName: editingBatch.batchName,
        batchImage: editingBatch.batchImage,
        _tag: editingBatch._tag
      });
      
      // If it's a custom batch, also update in custom batches
      if (editingBatch._isCustom) {
        updateCustomBatch(editingBatch.batchId, {
          batchName: editingBatch.batchName,
          batchImage: editingBatch.batchImage,
          _tag: editingBatch._tag
        });
        setCustomBatches(getCustomBatches());
      }
      
      setEditingBatch(null);
      alert('✅ Batch updated successfully!');
    } catch (error) {
      alert('❌ Error: ' + error.message);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-[3px] border-orange-200 border-t-orange-500 animate-spin" />
          <p className="text-gray-700 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
              🔐
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-gray-500 text-sm mt-2">Login to continue</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2 mb-6">
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
          </div>

          {loginMode === 'email' ? (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Admin email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          ) : (
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {loading ? 'Logging in...' : 'Login with Google'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center text-white text-xl">
              ⚡
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">PW Admin Panel</h1>
              <p className="text-xs text-gray-500">Manage API & Batches</p>
            </div>
          </div>
          <button
            onClick={() => {
              auth.signOut();
              setUser(null);
              removeAdminAccess();
            }}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* API Configuration */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🔌 API Configuration</h2>
          <p className="text-gray-600 text-sm mb-4">
            Set the base API URL. All API requests will use this URL.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Base URL
              </label>
              <input
                type="url"
                value={apiUrl}
                onChange={(e) => setApiUrlState(e.target.value)}
                placeholder="https://your-api-server.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={handleSaveApiUrl}
              className="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 transition"
            >
              Save API URL
            </button>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2 text-sm">ℹ️ Required API Endpoints</h3>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• <code>/api/pw/batches</code> - Get all batches</li>
              <li>• <code>/api/pw/batchdetails</code> - Get batch details</li>
              <li>• <code>/api/pw/topics</code> - Get topics</li>
              <li>• <code>/api/pw/datacontent</code> - Get content</li>
              <li>• <code>/api/pw/videonew</code> - Get video URL</li>
              <li>• <code>/api/pw/otp</code> - Get DRM keys</li>
            </ul>
          </div>
        </div>

        {/* Edit Batch Modal */}
        {editingBatch && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-gray-900 mb-4">✏️ Edit Batch</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Batch ID (Read-only)</label>
                  <input
                    type="text"
                    value={editingBatch.batchId}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Batch Name</label>
                  <input
                    type="text"
                    value={editingBatch.batchName}
                    onChange={(e) => setEditingBatch({ ...editingBatch, batchName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Thumbnail URL</label>
                  <input
                    type="url"
                    value={editingBatch.batchImage}
                    onChange={(e) => setEditingBatch({ ...editingBatch, batchImage: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tag</label>
                  <input
                    type="text"
                    value={editingBatch._tag}
                    onChange={(e) => setEditingBatch({ ...editingBatch, _tag: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setEditingBatch(null)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-400 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Default Batches - Edit Only */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900">🎯 Default Batches</h2>
            <p className="text-gray-600 text-sm mt-1">
              Edit thumbnail and title of default batches
            </p>
          </div>

          <div className="space-y-3">
            {defaultBatches.map((batch) => {
              const edits = getAllBatchesForEdit();
              const batchEdits = edits[batch.batchId] || {};
              const displayName = batchEdits.batchName || batch.batchName;
              const displayImage = batchEdits.batchImage || batch.batchImage;
              const displayTag = batchEdits._tag || batch._tag;
              
              return (
                <div
                  key={batch.batchId}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-orange-300 transition"
                >
                  {displayImage ? (
                    <img
                      src={displayImage}
                      alt={displayName}
                      className="w-16 h-16 rounded-lg object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center text-2xl">
                      📚
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{displayName}</p>
                    <p className="text-sm text-gray-500">ID: {batch.batchId}</p>
                    {displayTag && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full font-medium">
                        {displayTag}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleEditBatch(batch)}
                    className="text-orange-600 hover:text-orange-700 font-medium text-sm"
                  >
                    ✏️ Edit
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom Batches */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">📚 Custom Batches</h2>
              <p className="text-gray-600 text-sm mt-1">
                Add and manage custom batches
              </p>
            </div>
            <button
              onClick={() => setShowAddBatch(!showAddBatch)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition text-sm"
            >
              {showAddBatch ? 'Cancel' : '+ Add Batch'}
            </button>
          </div>

          {/* Add Batch Form */}
          {showAddBatch && (
            <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">Add New Batch</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={newBatch.batchId}
                  onChange={(e) => setNewBatch({ ...newBatch, batchId: e.target.value })}
                  placeholder="Batch ID (required)"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <input
                  type="text"
                  value={newBatch.batchName}
                  onChange={(e) => setNewBatch({ ...newBatch, batchName: e.target.value })}
                  placeholder="Batch Name (required)"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <input
                  type="url"
                  value={newBatch.batchImage}
                  onChange={(e) => setNewBatch({ ...newBatch, batchImage: e.target.value })}
                  placeholder="Thumbnail URL (optional)"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <input
                  type="text"
                  value={newBatch._tag}
                  onChange={(e) => setNewBatch({ ...newBatch, _tag: e.target.value })}
                  placeholder="Tag (e.g., JEE, NEET)"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleAddBatch}
                className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition"
              >
                Add Batch
              </button>
            </div>
          )}

          {/* Batches List */}
          {customBatches.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-5xl mb-3">📭</div>
              <p>No custom batches added yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {customBatches.map((batch) => {
                const edits = getAllBatchesForEdit();
                const batchEdits = edits[batch.batchId] || {};
                const displayName = batchEdits.batchName || batch.batchName;
                const displayImage = batchEdits.batchImage || batch.batchImage;
                const displayTag = batchEdits._tag || batch._tag;
                
                return (
                  <div
                    key={batch.batchId}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-orange-300 transition"
                  >
                    {displayImage ? (
                      <img
                        src={displayImage}
                        alt={displayName}
                        className="w-16 h-16 rounded-lg object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center text-2xl">
                        📚
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{displayName}</p>
                      <p className="text-sm text-gray-500">ID: {batch.batchId}</p>
                      {displayTag && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full font-medium">
                          {displayTag}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditBatch({ ...batch, _custom: true })}
                        className="text-orange-600 hover:text-orange-700 font-medium text-sm"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleRemoveBatch(batch.batchId)}
                        className="text-red-600 hover:text-red-700 font-medium text-sm"
                      >
                        🗑️ Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
