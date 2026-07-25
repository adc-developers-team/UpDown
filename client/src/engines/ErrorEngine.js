const ERROR_KEY = 'updown_errors';

export const initErrorReporting = () => {
  window.onerror = (message, source, lineno, colno, error) => {
    const errorObj = {
      message, source, lineno, colno,
      stack: error?.stack,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
    const stored = JSON.parse(localStorage.getItem(ERROR_KEY) || '[]');
    stored.push(errorObj);
    localStorage.setItem(ERROR_KEY, JSON.stringify(stored.slice(-20)));

    try {
      navigator.sendBeacon('/api/errors', JSON.stringify(errorObj));
    } catch {}
  };

  const originalConsoleError = console.error;
  console.error = (...args) => {
    originalConsoleError.apply(console, args);
    const errorObj = {
      message: args.map(a => (a?.message || a?.toString())).join(' '),
      stack: args[0]?.stack,
      timestamp: Date.now(),
      url: window.location.href,
    };
    try {
      navigator.sendBeacon('/api/errors', JSON.stringify(errorObj));
    } catch {}
  };
};
