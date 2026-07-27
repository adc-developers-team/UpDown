import { FiUser } from 'react-icons/fi';

const sizes = { 32: 'w-8 h-8', 40: 'w-10 h-10', 44: 'w-11 h-11', 52: 'w-13 h-13', 56: 'w-14 h-14', 72: 'w-18 h-18', 96: 'w-24 h-24' };
const textSizes = { 32: 'text-xs', 40: 'text-sm', 44: 'text-base', 52: 'text-lg', 56: 'text-xl', 72: 'text-2xl', 96: 'text-3xl' };

export default function Avatar({ src, alt = '', name = '', size = 40, online = false, className = '' }) {
  const sizeClass = sizes[size] || sizes[40];
  const textClass = textSizes[size] || textSizes[40];
  const initials = name ? name.charAt(0).toUpperCase() : '';

  return (
    <div className={`relative inline-flex flex-shrink-0 ${className}`}>
      <div className={`${sizeClass} rounded-full bg-[var(--color-primary)] overflow-hidden flex items-center justify-center text-white font-semibold ${textClass}`}>
        {src ? <img src={src} alt={alt} className="w-full h-full object-cover" /> : (initials || <FiUser className="opacity-60" />)}
      </div>
      {online && <span className="absolute bottom-0 right-0 w-3 h-3 bg-[var(--color-success)] rounded-full border-2 border-[var(--color-surface)]" />}
    </div>
  );
}
