import { useState } from 'react';
import { FiX, FiLoader } from 'react-icons/fi';

const ImagePreview = ({ src, onRemove, uploading }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative inline-block">
      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg z-10">
          <FiLoader className="animate-spin text-white" size={24} />
        </div>
      )}
      <img src={src} alt="" className={`max-h-48 rounded-lg ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity`} onLoad={() => setLoaded(true)} />
      {onRemove && !uploading && (
        <button onClick={onRemove} className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1 text-white hover:bg-red-700 shadow-lg">
          <FiX size={14} />
        </button>
      )}
    </div>
  );
};

export default ImagePreview;
