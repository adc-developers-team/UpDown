import { useEffect, useRef } from 'react';

export const SkipToContent = () => (
  <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-accent text-black px-4 py-2 rounded-lg z-50">
    Skip to content
  </a>
);

export const FocusTrap = ({ children, active }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!active || !ref.current) return;
    const focusable = ref.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const handleTab = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    ref.current.addEventListener('keydown', handleTab);
    first?.focus();
    return () => ref.current?.removeEventListener('keydown', handleTab);
  }, [active]);

  return <div ref={ref}>{children}</div>;
};

export const useKeyboardNav = (onEnter, onEscape) => {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Enter') onEnter?.();
      if (e.key === 'Escape') onEscape?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onEnter, onEscape]);
};
