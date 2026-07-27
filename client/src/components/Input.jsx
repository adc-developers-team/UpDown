import { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';

export default function Input({ label, type = 'text', placeholder, value, onChange, required, error, success, icon: Icon, className = '' }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (show ? 'text' : 'password') : type;

  return (
    <div className="w-full">
      {label && <label className="block text-sm text-[var(--color-text-secondary)] mb-1">{label}</label>}
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />}
        <input
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          className={`w-full bg-[var(--color-background)] border rounded-[16px] px-4 py-3 h-11 outline-none focus:ring-2 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] transition-all ${
            Icon ? 'pl-10' : ''
          } ${
            error ? 'border-red-500 ring-2 ring-red-500' : success ? 'border-green-500 ring-2 ring-green-500' : 'border-[var(--color-border)] focus:ring-[var(--color-primary-action)]'
          } ${className}`}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {show ? <FiEyeOff size={18} /> : <FiEye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
}
