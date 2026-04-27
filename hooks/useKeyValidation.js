import { useState, useEffect } from 'react';
import { ENABLE_KEY_VALIDATION, STORAGE_KEY, KEY_EXPIRATION_KEY } from '@/lib/constants';

export const useKeyValidation = () => {
  const [isKeyValid, setIsKeyValid] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If key validation is disabled, allow access
    if (!ENABLE_KEY_VALIDATION) {
      setIsKeyValid(true);
      setLoading(false);
      return;
    }

    // Check for stored key and expiration
    const storedKey = localStorage.getItem(STORAGE_KEY);
    const expirationTime = localStorage.getItem(KEY_EXPIRATION_KEY);

    if (storedKey && expirationTime) {
      const expiration = parseInt(expirationTime, 10);
      const now = new Date().getTime();

      if (now < expiration) {
        setIsKeyValid(true);
      } else {
        // Key expired, remove from storage
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(KEY_EXPIRATION_KEY);
        setIsKeyValid(false);
      }
    } else {
      setIsKeyValid(false);
    }

    setLoading(false);
  }, []);

  return { isKeyValid, loading };
};
