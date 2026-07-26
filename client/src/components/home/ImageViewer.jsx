import { FiX, FiDownload, FiShare2 } from 'react-icons/fi';
const ImageViewer = ({ src, onClose }) => (
  <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={onClose}>
    <img src={src} className="max-h-full max-w-full object-contain" alt="" />
    <button className="absolute top-4 right-4 text-white p-2" onClick={onClose}><FiX size={28} /></button>
    <div className="absolute bottom-4 flex gap-4">
      <a href={src} download className="text-white p-2"><FiDownload size={24} /></a>
      <button onClick={() => { navigator.clipboard.writeText(src); alert('Link copied'); }} className="text-white p-2"><FiShare2 size={24} /></button>
    </div>
  </div>
);
export default ImageViewer;
