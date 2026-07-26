import { useState, useRef, useEffect } from 'react';

const SearchEngine = ({ data = [], searchFields = ['name', 'email'], onResults, placeholder = 'Search...' }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!query.trim()) {
        setResults([]);
        if (onResults) onResults([]);
        return;
      }
      const filtered = data.filter(item =>
        searchFields.some(field =>
          (item[field] || '').toLowerCase().includes(query.toLowerCase())
        )
      );
      setResults(filtered);
      if (onResults) onResults(filtered);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, data]);

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-bg-input rounded-full px-4 py-2 outline-none text-primary border border-border-light focus:border-accent transition text-sm"
      />
      {query && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">
          {results.length} results
        </span>
      )}
    </div>
  );
};

export default SearchEngine;
