import { useState, useEffect, useRef, useMemo } from 'react';

// ✅ Virtual Scroll Engine – already correct
const useVirtualScroll = (items, rowHeight, containerHeight) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);
  const totalHeight = items.length * rowHeight;
  const startIndex = Math.floor(scrollTop / rowHeight);
  const visibleCount = Math.ceil(containerHeight / rowHeight) + 2;
  const visibleItems = items.slice(startIndex, startIndex + visibleCount);
  const offsetY = startIndex * rowHeight;
  const onScroll = (e) => setScrollTop(e.target.scrollTop);
  return { containerRef, visibleItems, totalHeight, offsetY, onScroll };
};

// ✅ Lazy Image Engine – already correct
const LazyImage = ({ src, alt, className }) => {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = new Image();
          img.src = src;
          img.onload = () => setLoaded(true);
          observer.unobserve(entry.target);
        }
      });
    });
    if (imgRef.current) observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [src]);
  return (
    <div ref={imgRef} className={className}>
      {loaded ? <img src={src} alt={alt} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-700 animate-pulse" />}
    </div>
  );
};

// 🆕 Debounce Engine – needed for search, resize, etc.
export const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
};

// 🆕 Throttle Engine – needed for scroll, resize events
export const useThrottle = (callback, delay = 200) => {
  const lastRan = useRef(Date.now());
  return (...args) => {
    const now = Date.now();
    if (now - lastRan.current >= delay) {
      callback(...args);
      lastRan.current = now;
    }
  };
};

// 🆕 Memo Engine – skips re‑renders for expensive calculations
export const useMemoCompare = (value, compareFn) => {
  const ref = useRef(null);
  if (!compareFn(ref.current, value)) {
    ref.current = value;
  }
  return ref.current;
};

export { useVirtualScroll, LazyImage };
