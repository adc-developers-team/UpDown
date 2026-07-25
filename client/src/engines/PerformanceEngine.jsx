import { useState, useEffect, useRef } from 'react';

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

export { useVirtualScroll, LazyImage };
