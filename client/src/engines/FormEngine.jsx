import { useState } from 'react';
import { FiLoader } from 'react-icons/fi';

export const FormField = ({ label, type = 'text', value, onChange, error, placeholder, required, disabled }) => (
  <div className="space-y-1">
    {label && <label className="block text-sm font-medium text-text-secondary">{label}{required && '*'}</label>}
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full bg-bg-input rounded-xl px-4 py-3 outline-none text-primary border transition ${error ? 'border-red-500' : 'border-border-light focus:border-accent'} disabled:opacity-50`}
    />
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

export const FormSubmit = ({ loading, children }) => (
  <button
    type="submit"
    disabled={loading}
    className="w-full py-3 bg-accent text-black rounded-full font-semibold hover:bg-accent-hover transition disabled:opacity-50 flex items-center justify-center gap-2"
  >
    {loading && <FiLoader className="animate-spin" size={16} />}
    {loading ? 'Saving...' : children}
  </button>
);
