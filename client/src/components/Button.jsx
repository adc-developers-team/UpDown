export default function Button({ children, variant = 'primary', disabled = false, loading = false, onClick, className = '', type = 'button' }) {
  const base = "inline-flex items-center justify-center gap-2 font-medium rounded-[16px] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-[var(--color-primary)] text-white hover:bg-[#1E293B] py-3 px-6",
    secondary: "border border-[var(--color-primary-action)] text-[var(--color-primary-action)] bg-transparent hover:bg-[var(--color-primary-action)]/5 py-3 px-6",
    ghost: "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 py-2 px-4",
    danger: "bg-[var(--color-danger)] text-white hover:bg-red-600 py-3 px-6",
  };

  return (
    <button type={type} disabled={disabled || loading} onClick={onClick} className={`${base} ${variants[variant] || variants.primary} ${className}`}>
      {loading && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
      {children}
    </button>
  );
}
