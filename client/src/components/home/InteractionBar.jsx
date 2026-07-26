import { FiHeart, FiMessageSquare, FiShare2, FiBookmark } from 'react-icons/fi';
const InteractionBar = ({ isLiked, likesCount, commentsCount, onLike, onComment, onShare, onSave }) => (
  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border-light">
    <button onClick={onLike} className={`flex items-center gap-1.5 text-sm transition-colors ${isLiked ? 'text-danger' : 'text-text-secondary hover:text-danger'}`}><FiHeart size={18} className={isLiked ? 'fill-current animate-like-pop' : ''} /><span>{likesCount}</span></button>
    <button onClick={onComment} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition-colors"><FiMessageSquare size={18} /><span>{commentsCount}</span></button>
    <button onClick={onShare} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition-colors"><FiShare2 size={18} /></button>
    <button onClick={onSave} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition-colors ml-auto"><FiBookmark size={18} /></button>
  </div>
);
export default InteractionBar;
