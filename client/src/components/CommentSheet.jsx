import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  FiX, FiHeart, FiMessageSquare, FiMoreHorizontal, FiSend, FiSmile, FiChevronUp
} from 'react-icons/fi';

const QUICK_EMOJIS = ['❤️','😂','👍','😮','😢','🔥'];

const CommentSheet = ({ postId, onClose }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [totalComments, setTotalComments] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null); // comment object to reply to
  const [replyingTo, setReplyingTo] = useState(null); // comment object currently replying
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const sheetRef = useRef(null);
  const inputRef = useRef(null);

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const fetchComments = useCallback(async (pageNum = 1, sortOrder = 'newest') => {
    setLoading(true);
    try {
      const { data } = await axios.get(
        `https://updown-hms5.onrender.com/api/posts/${postId}/comments?page=${pageNum}&sort=${sortOrder}`,
        config
      );
      if (pageNum === 1) {
        setComments(data.comments);
      } else {
        setComments(prev => [...prev, ...data.comments]);
      }
      setTotalComments(data.totalComments);
      setHasMore(data.hasMore);
      setPage(pageNum);
      setSort(sortOrder);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [postId, config]);

  useEffect(() => {
    fetchComments(1, 'newest');
  }, [fetchComments]);

  const handleLoadMore = () => {
    if (hasMore && !loading) fetchComments(page + 1, sort);
  };

  const handleAddComment = async (text, parentId = null) => {
    if (!text.trim()) return;
    try {
      const { data } = await axios.post(
        `https://updown-hms5.onrender.com/api/posts/${postId}/comments`,
        { text: text.trim(), parentCommentId: parentId },
        config
      );
      if (parentId) {
        // Add reply to the parent comment's replies array
        setComments(prev => prev.map(c => {
          if (c._id === parentId) {
            return {
              ...c,
              replies: [...(c.replies || []), data],
              replyCount: (c.replyCount || 0) + 1,
            };
          }
          return c;
        }));
      } else {
        setComments(prev => [data, ...prev]);
        setTotalComments(prev => prev + 1);
      }
      setCommentText('');
      setReplyTo(null);
      setReplyingTo(null);
    } catch (err) {
      alert('Failed to add comment');
    }
  };

  const handleLikeComment = async (commentId) => {
    try {
      const { data } = await axios.put(
        `https://updown-hms5.onrender.com/api/posts/comments/${commentId}/like`,
        {},
        config
      );
      setComments(prev => prev.map(c => {
        if (c._id === commentId) return { ...c, likes: data.likes };
        if (c.replies) {
          return {
            ...c,
            replies: c.replies.map(r => r._id === commentId ? { ...r, likes: data.likes } : r),
          };
        }
        return c;
      }));
    } catch (err) {}
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await axios.delete(`https://updown-hms5.onrender.com/api/posts/comments/${commentId}`, config);
      setComments(prev => prev.filter(c => c._id !== commentId));
      setTotalComments(prev => prev - 1);
    } catch (err) {
      alert('Failed to delete comment');
    }
    setDeleteConfirm(null);
  };

  const handleReply = (comment) => {
    setReplyingTo(comment);
    setReplyTo(comment);
    setCommentText('');
    if (inputRef.current) inputRef.current.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setReplyTo(null);
  };

  const formatTime = (d) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      {/* Sheet */}
      <div
        ref={sheetRef}
        className="relative w-full max-w-2xl bg-chat-bg rounded-t-3xl shadow-3 flex flex-col overflow-hidden"
        style={{ maxHeight: '85vh' }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1.5 bg-gray-400 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-light">
          <div>
            <h3 className="font-semibold text-lg">Comments</h3>
            <p className="text-xs text-text-secondary">{totalComments} comments</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
            <FiX size={20} />
          </button>
        </div>

        {/* Sort Tabs */}
        <div className="flex gap-2 px-5 py-2 border-b border-border-light overflow-x-auto">
          {['newest', 'oldest', 'top'].map(s => (
            <button
              key={s}
              onClick={() => fetchComments(1, s)}
              className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition ${
                sort === s ? 'bg-primary text-white' : 'bg-bg-input text-text-secondary hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
          {loading && comments.length === 0 && (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/3" />
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-2/3" />
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && comments.length === 0 && (
            <div className="text-center py-12 text-text-muted">
              <p className="text-lg font-semibold">No comments yet</p>
              <p className="text-sm">Be the first to comment.</p>
            </div>
          )}

          {comments.map(comment => (
            <CommentCard
              key={comment._id}
              comment={comment}
              user={user}
              onLike={handleLikeComment}
              onReply={handleReply}
              onDelete={handleDeleteComment}
              formatTime={formatTime}
              deleteConfirm={deleteConfirm}
              setDeleteConfirm={setDeleteConfirm}
            />
          ))}

          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="w-full py-2 text-sm text-primary hover:underline disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load more comments'}
            </button>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-border-light px-4 py-3 bg-sidebar-bg">
          {replyingTo && (
            <div className="flex items-center gap-2 mb-2 text-sm text-text-secondary">
              <span>Replying to <span className="font-medium text-primary">@{replyingTo.author?.username}</span></span>
              <button onClick={cancelReply} className="text-xs text-danger">Cancel</button>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
              {user?.profilePic ? (
                <img src={user.profilePic} className="w-full h-full object-cover" alt="" />
              ) : (
                <span className="text-sm font-bold text-primary">{user?.fullName?.[0] || user?.username?.[0]?.toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 flex items-center bg-bg-input rounded-full px-4 h-11 border border-border-light focus-within:border-primary transition">
              <input
                ref={inputRef}
                type="text"
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment(commentText, replyingTo?._id || null);
                  }
                }}
                className="flex-1 bg-transparent outline-none text-sm text-primary placeholder-text-muted"
              />
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-text-secondary hover:text-primary p-1"
              >
                <FiSmile size={18} />
              </button>
            </div>
            <button
              onClick={() => handleAddComment(commentText, replyingTo?._id || null)}
              disabled={!commentText.trim()}
              className="text-primary hover:text-primary-dark disabled:opacity-40 p-1"
            >
              <FiSend size={20} />
            </button>
          </div>
          {showEmojiPicker && (
            <div className="flex gap-2 mt-2 overflow-x-auto py-1">
              {QUICK_EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => {
                    setCommentText(prev => prev + e);
                    setShowEmojiPicker(false);
                  }}
                  className="text-xl hover:scale-125 transition-transform"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CommentCard = ({ comment, user, onLike, onReply, onDelete, formatTime, deleteConfirm, setDeleteConfirm }) => {
  const isOwn = comment.author?._id === user._id;
  const liked = comment.likes?.includes(user._id);

  return (
    <div className="space-y-2">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
          {comment.author?.profilePic ? (
            <img src={comment.author.profilePic} className="w-full h-full object-cover" alt="" />
          ) : (
            <span className="text-sm font-bold text-primary">{comment.author?.fullName?.[0] || comment.author?.username?.[0]?.toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{comment.author?.fullName || comment.author?.username}</span>
            <span className="text-xs text-text-secondary">@{comment.author?.username}</span>
            <span className="text-xs text-text-muted">{formatTime(comment.createdAt)}</span>
          </div>
          <p className="text-sm mt-1">{comment.text}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-text-secondary">
            <button
              onClick={() => onLike(comment._id)}
              className={`flex items-center gap-1 transition ${liked ? 'text-primary' : 'hover:text-primary'}`}
            >
              <FiHeart size={14} className={liked ? 'fill-current' : ''} />
              <span>{comment.likes?.length || 0}</span>
            </button>
            <button onClick={() => onReply(comment)} className="flex items-center gap-1 hover:text-primary">
              <FiMessageSquare size={14} />
              <span>Reply</span>
            </button>
            {isOwn && (
              <button
                onClick={() => setDeleteConfirm(comment._id)}
                className="text-text-muted hover:text-danger"
              >
                <FiMoreHorizontal size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {comment.replies?.length > 0 && (
        <div className="ml-8 pl-4 border-l-2 border-border-light space-y-3">
          {comment.replies.map(reply => (
            <div key={reply._id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {reply.author?.profilePic ? (
                  <img src={reply.author.profilePic} className="w-full h-full object-cover" alt="" />
                ) : (
                  <span className="text-xs font-bold text-primary">{reply.author?.fullName?.[0] || reply.author?.username?.[0]?.toUpperCase()}</span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{reply.author?.fullName || reply.author?.username}</span>
                  <span className="text-xs text-text-secondary">@{reply.author?.username}</span>
                  <span className="text-xs text-text-muted">{formatTime(reply.createdAt)}</span>
                </div>
                <p className="text-sm mt-1">{reply.text}</p>
                <div className="flex items-center gap-4 mt-1 text-xs text-text-secondary">
                  <button
                    onClick={() => onLike(reply._id)}
                    className={`flex items-center gap-1 transition ${reply.likes?.includes(user._id) ? 'text-primary' : 'hover:text-primary'}`}
                  >
                    <FiHeart size={12} className={reply.likes?.includes(user._id) ? 'fill-current' : ''} />
                    <span>{reply.likes?.length || 0}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
          {comment.replyCount > comment.replies.length && (
            <button className="text-xs text-primary hover:underline ml-10">
              View {comment.replyCount - comment.replies.length} more replies
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CommentSheet;
