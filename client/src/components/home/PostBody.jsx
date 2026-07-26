import { useState } from 'react';
import { FiPlay, FiMaximize } from 'react-icons/fi';
const getYouTubeId = (url) => { const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/); return m ? m[1] : null; };
const PostBody = ({ post, onImageClick }) => {
  const [sensitive, setSensitive] = useState(post.isSensitive);
  return (
    <div className="space-y-3">
      {post.text && <div className="text-[15px] leading-relaxed">{post.text}</div>}
      {post.image && (
        sensitive ? (
          <div className="relative rounded-xl overflow-hidden cursor-pointer" onClick={() => setSensitive(false)}>
            <img src={post.image} className="w-full max-h-96 object-cover blur-xl" alt="" />
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white"><FiMaximize size={32} /><p className="text-sm font-semibold mt-2">Sensitive Content</p><p className="text-xs">Tap to view</p></div>
          </div>
        ) : (
          <img src={post.image} className="rounded-xl w-full max-h-96 object-cover cursor-pointer" onClick={() => onImageClick(post.image)} alt="" />
        )
      )}
      {post.video && (
        <div className="relative rounded-xl overflow-hidden bg-black cursor-pointer" onClick={() => window.open(post.video, '_blank')}>
          {getYouTubeId(post.video) ? (
            <><img src={`https://img.youtube.com/vi/${getYouTubeId(post.video)}/0.jpg`} className="w-full" alt="" /><div className="absolute inset-0 flex items-center justify-center bg-black/30"><div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center"><FiPlay size={28} className="text-white ml-1" /></div></div></>
          ) : (
            <div className="p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-xl">▶️</div><div className="flex-1"><p className="text-sm font-semibold">Watch video</p><p className="text-xs text-text-secondary truncate">{post.video}</p></div></div>
          )}
        </div>
      )}
    </div>
  );
};
export default PostBody;
