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
                // Check admin
                const isAdmin = () => {
                  try {
                    return localStorage.getItem('pw_admin_access') === 'adityaghoghari01@gmail.com';
                  } catch { return false; }
                };
                
                if (isAdmin()) return;
                
                // Block DevTools
                const block = () => {
                  document.body.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);font-family:sans-serif;color:white;text-align:center;padding:20px"><div style="font-size:80px;margin-bottom:20px">👊</div><h1 style="font-size:48px;margin:0 0 20px 0;font-weight:bold">चालाकी मत कर!</h1><h2 style="font-size:32px;margin:0 0 30px 0">तेरा बाप हूं मैं!</h2><p style="font-size:18px;opacity:0.9;max-width:500px">DevTools detect ho gaya hai. Ye site inspect nahi kar sakte.</p><button onclick="window.location.reload()" style="margin-top:30px;padding:15px 40px;font-size:18px;background:white;color:#667eea;border:none;border-radius:50px;cursor:pointer;font-weight:bold;box-shadow:0 4px 15px rgba(0,0,0,0.2)">🔄 Reload Page</button></div>';
                  throw new Error('Blocked');
                };
                
                // Disable shortcuts
                document.addEventListener('keydown', (e) => {
                  if (e.keyCode === 123 || (e.ctrlKey && e.shiftKey && [73,74,67].includes(e.keyCode)) || (e.ctrlKey && [85,83].includes(e.keyCode))) {
                    e.preventDefault();
                    block();
                    return false;
                  }
                });
                
                // Disable right-click
                document.addEventListener('contextmenu', (e) => {
                  e.preventDefault();
                  return false;
                });
                
                // Detect DevTools
                setInterval(() => {
                  const threshold = 160;
                  if (window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold) {
                    block();
                  }
                }, 100);
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
