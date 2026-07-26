import { useState } from 'react';
import PostHeader from './PostHeader';
import PostBody from './PostBody';
import InteractionBar from './InteractionBar';
import CommentPreview from './CommentPreview';
const PostCard = ({ post, currentUser, onLike, onComment, onShare, onSave, onReport, onDelete, onPin, onUserTap }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const isLiked = post.likes?.some(id => id === currentUser?._id);
  const isOwner = post.author?._id === currentUser?._id;
  return (
    <div className="bg-surface rounded-card shadow-2 p-4 mb-3 border border-border-light hover:shadow-3 transition-all duration-200 relative">
      <PostHeader post={post} onUserTap={onUserTap} onMenuToggle={() => setMenuOpen(!menuOpen)} />
      <PostBody post={post} onImageClick={() => {}} />
      <InteractionBar isLiked={isLiked} likesCount={post.likes?.length||0} commentsCount={post.comments?.length||0} onLike={() => onLike(post._id)} onComment={() => onComment(post._id)} onShare={() => onShare(post._id)} onSave={() => onSave(post._id)} />
      {post.comments?.length > 0 && <CommentPreview comment={post.comments[0]} />}
      {menuOpen && (
        <div className="absolute right-4 top-12 bg-surface rounded-xl shadow-3 border border-border-light py-1 z-50 w-40 text-sm">
          {isOwner && <button onClick={() => onPin(post._id)} className="w-full text-left px-4 py-2 hover:bg-gray-50">{post.isPinned ? 'Unpin' : 'Pin'}</button>}
          {isOwner && <button onClick={() => onDelete(post._id)} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-danger">Delete</button>}
          <button onClick={() => onReport(post._id)} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-danger">Report</button>
        </div>
      )}
    </div>
  );
};
export default PostCard;
