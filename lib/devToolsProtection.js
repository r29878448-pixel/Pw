/**
 * DevTools Protection for PW App
 * Ultra Tagada Level - Blocks inspect, devtools, console
 */

// Admin email - full access
const ADMIN_EMAIL = 'adityaghoghari01@gmail.com';

// Check if user is admin
const isAdmin = () => {
  if (typeof window === 'undefined') return false;
  try {
    const adminFlag = localStorage.getItem('pw_admin_access');
    return adminFlag === ADMIN_EMAIL;
  } catch {
    return false;
  }
};

// Redirect to blank page with message
const blockAccess = () => {
  if (isAdmin()) return;
  
  document.body.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: white;
      text-align: center;
      padding: 20px;
    ">
      <div style="font-size: 80px; margin-bottom: 20px;">👊</div>
      <h1 style="font-size: 48px; margin: 0 0 20px 0; font-weight: bold;">चालाकी मत कर!</h1>
      <h2 style="font-size: 32px; margin: 0 0 30px 0;">तेरा बाप हूं मैं!</h2>
      <p style="font-size: 18px; opacity: 0.9; max-width: 500px;">
        DevTools detect ho gaya hai. Ye site inspect nahi kar sakte.
      </p>
      <button onclick="window.location.reload()" style="
        margin-top: 30px;
        padding: 15px 40px;
        font-size: 18px;
        background: white;
        color: #667eea;
        border: none;
        border-radius: 50px;
        cursor: pointer;
        font-weight: bold;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
      ">
        🔄 Reload Page
      </button>
    </div>
  `;
  
  // Stop all scripts
  throw new Error('DevTools blocked');
};

// DevTools detection
const detectDevTools = () => {
  if (isAdmin()) return;
  
  const threshold = 160;
  const widthThreshold = window.outerWidth - window.innerWidth > threshold;
  const heightThreshold = window.outerHeight - window.innerHeight > threshold;
  
  if (widthThreshold || heightThreshold) {
    blockAccess();
  }
};

// Console detection
const detectConsole = () => {
  if (isAdmin()) return;
  
  const element = new Image();
  Object.defineProperty(element, 'id', {
    get: function() {
      blockAccess();
    }
  });
  console.log(element);
};

// Debugger trap
const debuggerTrap = () => {
  if (isAdmin()) return;
  
  setInterval(() => {
    const before = new Date();
    debugger;
    const after = new Date();
    if (after - before > 100) {
      blockAccess();
    }
  }, 1000);
};

// Initialize protection
export const initDevToolsProtection = () => {
  if (typeof window === 'undefined') return;
  if (isAdmin()) {
    console.log('🔓 Admin access granted - DevTools protection disabled');
    return;
  }
  
  console.log('🔒 DevTools protection active');
  
  // Disable right-click
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });
  
  // Disable keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // F12
    if (e.keyCode === 123) {
      e.preventDefault();
      blockAccess();
      return false;
    }
    
    // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U
    if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
      e.preventDefault();
      blockAccess();
      return false;
    }
    
    // Ctrl+U (view source)
    if (e.ctrlKey && e.keyCode === 85) {
      e.preventDefault();
      blockAccess();
      return false;
    }
    
    // Ctrl+S (save)
    if (e.ctrlKey && e.keyCode === 83) {
      e.preventDefault();
      return false;
    }
  });
  
  // Disable text selection
  document.addEventListener('selectstart', (e) => {
    e.preventDefault();
    return false;
  });
  
  // Disable copy
  document.addEventListener('copy', (e) => {
    e.preventDefault();
    return false;
  });
  
  // Detect DevTools - ultra fast (every 100ms)
  setInterval(detectDevTools, 100);
  
  // Console detection
  setInterval(detectConsole, 1000);
  
  // Debugger trap
  debuggerTrap();
  
  // Clear console every 50ms
  setInterval(() => {
    if (!isAdmin()) {
      console.clear();
    }
  }, 50);
  
  // Override console methods
  if (!isAdmin()) {
    const noop = () => {};
    console.log = noop;
    console.warn = noop;
    console.error = noop;
    console.info = noop;
    console.debug = noop;
  }
};

// Set admin access (call this after admin login)
export const setAdminAccess = (email) => {
  if (email === ADMIN_EMAIL) {
    localStorage.setItem('pw_admin_access', email);
    console.log('✅ Admin access granted');
    // DON'T reload - let React handle the state
  }
};

// Remove admin access
export const removeAdminAccess = () => {
  localStorage.removeItem('pw_admin_access');
  console.log('🔒 Admin access removed');
  // DON'T reload - let React handle the state
};
