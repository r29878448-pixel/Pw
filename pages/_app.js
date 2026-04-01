import { useEffect } from 'react';
import { initDevToolsProtection } from '../lib/devToolsProtection';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // Initialize DevTools protection
    initDevToolsProtection();
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;
