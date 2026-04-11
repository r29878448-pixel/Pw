import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Inline DevTools Protection - First Line of Defense */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Skip ALL protection in dev mode
                if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return;

                const isAdmin = () => {
                  try { return localStorage.getItem('pw_admin_access') === 'adityaghoghari01@gmail.com'; }
                  catch { return false; }
                };
                if (isAdmin()) return;

                // Block DevTools — redirect instead of nuking DOM
                let blocked = false;
                const block = () => {
                  if (blocked) return;
                  blocked = true;
                  window.location.replace('about:blank');
                };

                // Disable inspect shortcuts
                document.addEventListener('keydown', (e) => {
                  if (e.keyCode === 123 ||
                      (e.ctrlKey && e.shiftKey && [73, 74, 67].includes(e.keyCode)) ||
                      (e.ctrlKey && [85].includes(e.keyCode))) {
                    e.preventDefault();
                    block();
                  }
                });

                // Disable right-click
                document.addEventListener('contextmenu', (e) => e.preventDefault());

                // Detect DevTools via size (production only, 2s debounce)
                let dtTimer = null;
                setInterval(() => {
                  const threshold = 160;
                  if (window.outerWidth - window.innerWidth > threshold ||
                      window.outerHeight - window.innerHeight > threshold) {
                    if (!dtTimer) dtTimer = setTimeout(block, 2000);
                  } else {
                    clearTimeout(dtTimer);
                    dtTimer = null;
                  }
                }, 500);
              })();
            `,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
