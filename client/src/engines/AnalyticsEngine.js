const ANALYTICS_KEY = 'updown_analytics';
const BATCH_SIZE = 10;

const getStored = () => {
  try { return JSON.parse(localStorage.getItem(ANALYTICS_KEY)) || []; } catch { return []; }
};

const store = (data) => localStorage.setItem(ANALYTICS_KEY, JSON.stringify(data));

export const trackPageView = (page) => {
  const events = getStored();
  events.push({ type: 'pageview', page, timestamp: Date.now() });
  store(events);
  if (events.length >= BATCH_SIZE) flushAnalytics();
};

export const trackEvent = (category, action, label) => {
  const events = getStored();
  events.push({ type: 'event', category, action, label, timestamp: Date.now() });
  store(events);
  if (events.length >= BATCH_SIZE) flushAnalytics();
};

export const flushAnalytics = () => {
  const events = getStored();
  if (events.length === 0) return;
  navigator.sendBeacon('/api/analytics', JSON.stringify(events));
  store([]);
};
