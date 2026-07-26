import { useState, useRef } from 'react';
import { FiUploadCloud, FiFile, FiX, FiCheck } from 'react-icons/fi';

const FileUploader = ({ onUpload, accept = '*', maxSize = 10 * 1024 * 1024 }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = async (e) => {
    const selected = Array.from(e.target.files);
    const valid = selected.filter(f => f.size <= maxSize);
    if (valid.length !== selected.length) alert(`Some files exceed ${maxSize / 1024 / 1024}MB limit`);
    setFiles(prev => [...prev, ...valid]);
    if (onUpload) {
      setUploading(true);
      for (const file of valid) await onUpload(file);
      setUploading(false);
    }
  };

  const removeFile = (index) => setFiles(prev => prev.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      <div className="border-2 border-dashed border-border-light rounded-xl p-4 text-center hover:border-accent transition cursor-pointer" onClick={() => inputRef.current.click()}>
        <FiUploadCloud size={24} className="mx-auto text-text-muted mb-1" />
        <p className="text-sm text-text-muted">Drop files or click to upload</p>
        <input ref={inputRef} type="file" accept={accept} multiple onChange={handleFiles} className="hidden" />
      </div>
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-2 bg-bg-input rounded-lg px-3 py-2">
              <FiFile size={14} className="text-text-secondary" />
              <span className="text-sm flex-1 truncate">{file.name}</span>
              <span className="text-xs text-text-muted">{(file.size / 1024).toFixed(1)}KB</span>
              {uploading ? <FiCheck size={14} className="text-green-400" /> : <button onClick={() => removeFile(i)}><FiX size={14} className="text-red-400" /></button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUploader;
