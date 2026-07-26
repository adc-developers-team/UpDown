import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  FiHeart, FiMessageSquare, FiShare2, FiSend, FiImage, FiX,
  FiMoreHorizontal, FiVideo, FiRefreshCw, FiTrash2
} from 'react-icons/fi';
import BottomNav from '../components/BottomNav';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const API = 'https://updown-hms5.onrender.com';

const Homepage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [newText, setNewText] = useState('');
  const [newImage, setNewImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [commentText, setCommentText] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [viewerImage, setViewerImage] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const feedRef = useRef(null);
  const startY = useRef(0);
  const pulling = useRef(false);

  const fetchPosts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const { data } = await axios.get(`${API}/api/posts`, config);
      setPosts(Array.isArray(data) ? data : []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Simple pull-to-refresh
  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;

    const onTouchStart = (e) => {
      if (el.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      }
    };

    const onTouchMove = (e) => {
      if (!pulling.current) return;
      const diff = e.touches[0].clientY - startY.current;
      if (diff > 80 && !refreshing) {
        pulling.current = false;
        fetchPosts(true);
      }
    };

    const onTouchEnd = () => {
      pulling.current = false;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [refreshing, fetchPosts]);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE) {
      alert('Image too large (max 10 MB)');
      return;
    }
    setNewImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setNewImage(null);
    setImagePreview(null);
  };

  const uploadImage = async (file) => {
    const reader = new FileReader();
    const base64 = await new Promise((resolve) => {
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
    const { data } = await axios.post(`${API}/api/upload/image`, { image: base64 }, config);
    return data.imageUrl;
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if ((!newText.trim() && !newImage && !newVideoUrl.trim()) || posting) return;

    setPosting(true);
    let imageUrl = '';
    let video = '';

    try {
      if (newImage) {
        imageUrl = await uploadImage(newImage);
      }
      if (newVideoUrl.trim()) {
        video = newVideoUrl.trim();
      }

      await axios.post(`${API}/api/posts`, {
        text: newText.trim(),
        image: imageUrl,
        video,
      }, config);

      setNewText('');
      removeImage();
      setNewVideoUrl('');
      await fetchPosts();
    } catch {
      alert('Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId) => {
    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => {
        if (p._id !== postId) return p;
        const liked = p.likes?.includes(user._id);
        return {
          ...p,
          likes: liked
            ? p.likes.filter((id) => id !== user._id)
            : [...(p.likes || []), user._id],
        };
      })
    );

    try {
      await axios.put(`\( {API}/api/posts/ \){postId}/like`, {}, config);
    } catch {
      // Revert on failure
      fetchPosts();
    }
  };

  const handleComment = async (postId) => {
    const text = commentText[postId]?.trim();
    if (!text) return;

    try {
      await axios.post(`\( {API}/api/posts/ \){postId}/comment`, { text }, config);
      setCommentText((prev) => ({ ...prev, [postId]: '' }));
      fetchPosts();
    } catch {
      alert('Failed to comment');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('Delete this post permanently?')) return;
    setMenuOpen(null);
    try {
      await axios.delete(`\( {API}/api/posts/ \){postId}`, config);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    } catch {
      alert('Failed to delete post');
    }
  };

  const handleShare = (postId) => {
    const url = `\( {window.location.origin}/post/ \){postId}`;
    if (navigator.share) {
      navigator.share({ title: 'UpDown Post', url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard');
    }
  };

  const formatTime = (d) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(d).toLocaleDateString();
  };

  const getYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : null;
  };

  const toggleComments = (postId) => {
    setExpandedComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
    if (commentText[postId] === undefined) {
      setCommentText((prev) => ({ ...prev, [postId]: '' }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-chat-bg pb-20">
        <header className="h-16 sm:h-[72px] flex items-center px-4 bg-surface border-b border-border-light sticky top-0 z-20">
          <h2 className="text-xl font-bold text-primary">UpDown Community</h2>
        </header>
        <div className="max-w-2xl mx-auto p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface rounded-2xl border border-border-light p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                </div>
              </div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-4" />
              <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            </div>
          ))}
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-chat-bg text-primary pb-20" ref={feedRef}>
      {/* Header */}
      <header className="h-16 sm:h-[72px] flex items-center justify-between px-4 bg-surface border-b border-border-light sticky top-0 z-20">
        <h2 className="text-xl font-bold">
          <span className="text-primary">UpDown</span> Community
        </h2>
        <button
          onClick={() => fetchPosts(true)}
          disabled={refreshing}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          aria-label="Refresh feed"
        >
          <FiRefreshCw
            size={20}
            className={`text-text-secondary ${refreshing ? 'animate-spin' : ''}`}
          />
        </button>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-5">
        {/* Composer */}
        <form
          onSubmit={handleCreatePost}
          className="bg-surface rounded-2xl border border-border-light shadow-sm overflow-hidden"
        >
          <div className="flex gap-3 p-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex-shrink-0 overflow-hidden flex items-center justify-center">
              {user?.profilePic ? (
                <img src={user.profilePic} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-primary">
                  {user?.fullName?.[0] || user?.username?.[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="What's on your mind?"
              className="flex-1 bg-transparent outline-none text-sm text-primary placeholder-text-muted resize-none min-h-[60px]"
              rows={2}
            />
          </div>

          {/* Image Preview */}
          {imagePreview && (
            <div className="relative mx-4 mb-3">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full max-h-64 object-cover rounded-xl"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white"
              >
                <FiX size={16} />
              </button>
            </div>
          )}

          <div className="px-4 pb-3 flex items-center gap-2">
            <label className="cursor-pointer p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              <FiImage size={20} className="text-text-secondary" />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </label>

            <div className="flex-1 flex items-center bg-bg-input rounded-full px-3 py-2 border border-border-light focus-within:border-primary transition">
              <FiVideo size={16} className="text-text-secondary mr-2 flex-shrink-0" />
              <input
                type="text"
                placeholder="YouTube, Vimeo or MP4 link"
                value={newVideoUrl}
                onChange={(e) => setNewVideoUrl(e.target.value)}
                className="bg-transparent outline-none text-sm text-primary flex-1 placeholder-text-muted"
              />
              {newVideoUrl && (
                <button type="button" onClick={() => setNewVideoUrl('')} className="p-1">
                  <FiX size={14} className="text-text-muted" />
                </button>
              )}
            </div>
          </div>

          {(newText.trim() || newImage || newVideoUrl.trim()) && (
            <div className="px-4 pb-4">
              <button
                type="submit"
                disabled={posting}
                className="w-full bg-primary text-white py-2.5 rounded-full font-semibold hover:bg-primary-dark transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {posting ? 'Posting...' : 'Post'}
              </button>
            </div>
          )}
        </form>

        {/* Feed */}
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="text-center py-16 text-text-muted">
              <p className="text-lg font-semibold mb-1">No posts yet</p>
              <p className="text-sm">Be the first to share something with the community</p>
            </div>
          ) : (
            posts.map((post) => {
              const isLiked = post.likes?.includes(user._id);
              const youtubeId = getYouTubeId(post.video);
              const comments = post.comments || [];
              const showAllComments = expandedComments[post._id];
              const visibleComments = showAllComments ? comments : comments.slice(-2);

              return (
                <article
                  key={post._id}
                  className="bg-surface rounded-2xl border border-border-light shadow-sm overflow-hidden"
                >
                  {/* Author */}
                  <div className="flex items-center gap-3 p-4 pb-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {post.author?.profilePic ? (
                        <img
                          src={post.author.profilePic}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-bold text-primary">
                          {post.author?.fullName?.[0] || post.author?.username?.[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">
                        {post.author?.fullName || post.author?.username}
                      </h3>
                      <p className="text-xs text-text-secondary">{formatTime(post.createdAt)}</p>
                    </div>

                    {post.author?._id === user._id && (
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpen(menuOpen === post._id ? null : post._id)}
                          className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-text-muted"
                        >
                          <FiMoreHorizontal size={18} />
                        </button>
                        {menuOpen === post._id && (
                          <div className="absolute right-0 top-8 bg-surface border border-border-light rounded-xl shadow-lg py-1 z-10 min-w-[120px]">
                            <button
                              onClick={() => handleDeletePost(post._id)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                              <FiTrash2 size={14} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="px-4 pb-3 space-y-3">
                    {post.text && (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.text}</p>
                    )}

                    {post.image && !post.video && (
                      <img
                        src={post.image}
                        alt=""
                        className="rounded-xl w-full cursor-pointer object-cover max-h-[420px]"
                        onClick={() => setViewerImage(post.image)}
                      />
                    )}

                    {post.video && (
                      <div className="rounded-xl overflow-hidden bg-black">
                        {youtubeId ? (
                          <div className="relative aspect-video">
                            <iframe
                              src={`https://www.youtube.com/embed/${youtubeId}`}
                              title="YouTube video"
                              className="absolute inset-0 w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        ) : (
                          <a
                            href={post.video}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-4 hover:bg-black/80 transition"
                          >
                            <FiVideo size={24} className="text-primary flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white">Watch video</p>
                              <p className="text-xs text-gray-400 truncate">{post.video}</p>
                            </div>
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 px-2 py-1 border-t border-border-light">
                    <button
                      onClick={() => handleLike(post._id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition ${
                        isLiked
                          ? 'text-red-500'
                          : 'text-text-secondary hover:text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <FiHeart size={18} className={isLiked ? 'fill-current' : ''} />
                      <span>{post.likes?.length || 0}</span>
                    </button>

                    <button
                      onClick={() => toggleComments(post._id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    >
                      <FiMessageSquare size={18} />
                      <span>{comments.length}</span>
                    </button>

                    <button
                      onClick={() => handleShare(post._id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    >
                      <FiShare2 size={18} />
                    </button>
                  </div>

                  {/* Comments */}
                  {(commentText[post._id] !== undefined || comments.length > 0) && (
                    <div className="px-4 pb-4 space-y-2 border-t border-border-light pt-3">
                      {comments.length > 2 && !showAllComments && (
                        <button
                          onClick={() => toggleComments(post._id)}
                          className="text-xs text-primary font-medium"
                        >
                          View all {comments.length} comments
                        </button>
                      )}

                      {visibleComments.map((c) => (
                        <div key={c._id} className="flex gap-2 text-sm">
                          <span className="font-semibold text-primary flex-shrink-0">
                            {c.author?.fullName || c.author?.username}
                          </span>
                          <span className="text-text-secondary break-words">{c.text}</span>
                        </div>
                      ))}

                      {showAllComments && comments.length > 2 && (
                        <button
                          onClick={() => toggleComments(post._id)}
                          className="text-xs text-text-muted"
                        >
                          Show less
                        </button>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="Write a comment..."
                          value={commentText[post._id] || ''}
                          onChange={(e) =>
                            setCommentText((prev) => ({ ...prev, [post._id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleComment(post._id);
                          }}
                          className="flex-1 bg-bg-input rounded-full px-4 py-2 text-sm outline-none border border-border-light focus:border-primary transition"
                        />
                        <button
                          onClick={() => handleComment(post._id)}
                          disabled={!commentText[post._id]?.trim()}
                          className="p-2 text-primary disabled:opacity-40"
                        >
                          <FiSend size={18} />
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </div>

      {/* Fullscreen Image Viewer */}
      {viewerImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setViewerImage(null)}
        >
          <img
            src={viewerImage}
            alt=""
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 p-2 text-white bg-black/40 rounded-full"
            onClick={() => setViewerImage(null)}
          >
            <FiX size={24} />
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Homepage;
