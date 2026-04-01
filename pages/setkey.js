import { useEffect, useState } from 'react';

export default function SetKey() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Generate delta-access-key exactly like deltastudy.site/deltakeydone
    const key = `delta-key-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    const expiry = (Date.now() + 864e5).toString(); // 24 hours

    try {
      localStorage.setItem('delta-access-key', key);
      localStorage.setItem('delta-key-expiration', expiry);
      console.log('✅ delta-access-key set:', key);
      setDone(true);

      // Auto close after 1s
      setTimeout(() => window.close(), 1000);
    } catch (e) {
      console.error('Failed to set key:', e);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center text-white p-8">
        {done ? (
          <>
            <div className="text-5xl mb-4">✅</div>
            <p className="text-xl font-bold">Key Set Successfully!</p>
            <p className="text-gray-400 text-sm mt-2">Window closing...</p>
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full border-[3px] border-orange-200 border-t-orange-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-300">Setting access key...</p>
          </>
        )}
      </div>
    </div>
  );
}
