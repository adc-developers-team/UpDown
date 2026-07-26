import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  FiHeart, FiMessageSquare, FiShare2, FiSend, FiImage, FiX,
  FiMoreHorizontal, FiVideo, FiRefreshCw, FiTrash2
} from 'react-icons/fi';
import BottomNav from '../components/BottomNav';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
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
  const [showComments, setShowComments] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [viewerImage, setViewerImage] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

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
    try {
      let imageUrl = '';
      if (newImage) imageUrl = await uploadImage(newImage);

      await axios.post(`${API}/api/posts`, {
        text: newText.trim(),
        image: imageUrl,
        video: newVideoUrl.trim(),
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
      fetchPosts();
    }
  };

  const handleComment = async (postId) => {
    const text = commentText[postId]?.trim();
    if (!text) return;

    try {
      await axios.post(`\( {API}/api/posts/ \){postId}/comment`, { text }, config);
      setCommentText((prev) => ({ ...prev, [postId]: '' }));
      setShowComments((prev) => ({ ...prev, [postId]: true }));
      await fetchPosts();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to comment');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('Delete this post permanently?')) return;
    setMenuOpen(null);

    setPosts((prev) => prev.filter((p) => p._id !== postId));

    try {
      await axios.delete(`\( {API}/api/posts/ \){postId}`, config);
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
      fetchPosts();
    }
  };

  const handleShare = (postId) => {
    const url = `\( {window.location.origin}/post/ \){postId}`;
    if (navigator.share) {
      navigator.share({ title: 'UpDown Post', url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied');
    }
  };

  const formatTime = (d) => {
    if (!d) return '';
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return new Date(d).toLocaleDateString();
  };

  const getYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  };

  const toggleComments = (postId) => {
    setShowComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-chat-bg pb-20">
        <header className="h-16 flex items-center px-4 bg-surface border-b border-border-light sticky top-0 z-20">
          <h2 className="text-xl font-bold">UpDown Community</h2>
        </header>
        <div className="p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface rounded-2xl p-4 animate-pulse border border-border-light">
              <div className="flex gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-2 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
              <div className="h-40 bg-gray-200 rounded-xl" />
            </div>
          ))}
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-chat-bg text-primary pb-20">
      <header className="h-16 flex items-center justify-between px-4 bg-surface border-b border-border-light sticky top-0 z-20">
        <h2 className="text-xl font-bold">
          <span className="text-primary">UpDown</span> Community
        </h2>
        <button onClick={() => fetchPosts(true)} className="p-2 rounded-full hover:bg-gray-100">
          <FiRefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <form onSubmit={handleCreatePost} className="bg-surface rounded-2xl border border-border-light p-4 space-y-3">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center flex-shrink-0">
              {user?.profilePic ? (
                <img src={user.profilePic} className="w-full h-full object-cover" alt="" />
              ) : (
                <span className="font-bold text-primary">{user?.fullName?.[0] || user?.username?.[0]}</span>
              )}
            </div>
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="What's on your mind?"
              className="flex-1 bg-transparent outline-none text-sm resize-none min-h-[50px]"
              rows={2}
            />
          </div>

          {imagePreview && (
            <div className="relative">
              <img src={imagePreview} className="w-full max-h-56 object-cover rounded-xl" alt="" />
              <button type="button" onClick={removeImage} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white">
                <FiX size={16} />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <label className="p-2 rounded-full hover:bg-gray-100 cursor-pointer">
              <FiImage size={20} className="text-text-secondary" />
              <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            </label>
            <input
              type="text"
              placeholder="YouTube link..."
              value={newVideoUrl}
              onChange={(e) => setNewVideoUrl(e.target.value)}
              className="flex-1 bg-bg-input rounded-full px-4 py-2 text-sm outline-none border border-border-light"
            />
          </div>

          {(newText.trim() || newImage || newVideoUrl.trim()) && (
            <button
              type="submit"
              disabled={posting}
              className="w-full bg-primary text-white py-2.5 rounded-full font-semibold disabled:opacity-60"
            >
              {posting ? 'Posting...' : 'Post'}
            </button>
          )}
        </form>

        {posts.length === 0 ? (
          <div className="text-center py-16 text-text-muted">
            <p className="text-lg font-semibold">No posts yet</p>
            <p className="text-sm">Be the first to share something</p>
          </div>
        ) : (
          posts.map((post) => {
            const isLiked = post.likes?.includes(user._id);
            const youtubeId = getYouTubeId(post.video);
            const comments = post.comments || [];
            const isOpen = showComments[post._id];
            const isExpanded = expandedComments[post._id];
            const visible = isExpanded ? comments : comments.slice(0, 3);

            return (
              <div key={post._id} className="bg-surface rounded-2xl border border-border-light overflow-hidden">
                <div className="flex items-center gap-3 p-4 pb-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center">
                    {post.author?.profilePic ? (
                      <img src={post.author.profilePic} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <span className="font-bold text-primary">
                        {post.author?.fullName?.[0] || post.author?.username?.[0]}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {post.author?.fullName || post.author?.username}
                    </p>
                    <p className="text-xs text-text-secondary">{formatTime(post.createdAt)}</p>
                  </div>
                  {post.author?._id === user._id && (
                    <div className="relative">
                      <button onClick={() => setMenuOpen(menuOpen === post._id ? null : post._id)} className="p-1.5">
                        <FiMoreHorizontal size={18} className="text-text-muted" />
                      </button>
                      {menuOpen === post._id && (
                        <div className="absolute right-0 top-8 bg-surface border border-border-light rounded-xl shadow-lg py-1 z-10 w-36">
                          <button
                            onClick={() => handleDeletePost(post._id)}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-danger"
                          >
                            <FiTrash2 size={14} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="px-4 pb-3 space-y-2">
                  {post.text && <p className="text-sm whitespace-pre-wrap">{post.text}</p>}

                  {post.image && !post.video && (
                    <img
                      src={post.image}
                      className="rounded-xl w-full max-h-96 object-cover cursor-pointer"
                      onClick={() => setViewerImage(post.image)}
                      alt=""
                    />
                  )}

                  {post.video && (
                    <div className="rounded-xl overflow-hidden bg-black">
                      {youtubeId ? (
                        <div className="relative aspect-video">
                          <iframe
                            src={`https://www.youtube.com/embed/${youtubeId}`}
                            className="absolute inset-0 w-full h-full"
                            allowFullScreen
                            title="video"
                          />
                        </div>
                      ) : (
                        <a href={post.video} target="_blank" rel="noreferrer" className="block p-4 text-white text-sm">
                          Watch video
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {(post.likes?.length > 0 || comments.length > 0) && (
                  <div className="px-4 pb-2 flex justify-between text-xs text-text-secondary">
                    <span>{post.likes?.length > 0 ? `${post.likes.length} likes` : ''}</span>
                    <button onClick={() => toggleComments(post._id)}>
                      {comments.length > 0 ? `${comments.length} comments` : ''}
                    </button>
                  </div>
                )}

                <div className="flex border-t border-border-light">
                  <button
                    onClick={() => handleLike(post._id)}
                    className={`flex-1 py-2.5 flex items-center justify-center gap-2 text-sm font-medium ${
                      isLiked ? 'text-red-500' : 'text-text-secondary'
                    }`}
                  >
                    <FiHeart size={18} className={isLiked ? 'fill-current' : ''} /> Like
                  </button>
                  <button
                    onClick={() => toggleComments(post._id)}
                    className="flex-1 py-2.5 flex items-center justify-center gap-2 text-sm font-medium text-text-secondary"
                  >
                    <FiMessageSquare size={18} /> Comment
                  </button>
                  <button
                    onClick={() => handleShare(post._id)}
                    className="flex-1 py-2.5 flex items-center justify-center gap-2 text-sm font-medium text-text-secondary"
                  >
                    <FiShare2 size={18} /> Share
                  </button>
                </div>

                {isOpen && (
                  <div className="border-t border-border-light bg-gray-50 dark:bg-gray-900/40 px-4 py-3 space-y-3">
                    {comments.length > 3 && !isExpanded && (
                      <button
                        onClick={() => setExpandedComments((p) => ({ ...p, [post._id]: true }))}
                        className="text-sm text-text-secondary font-medium"
                      >
                        View all {comments.length} comments
                      </button>
                    )}

                    {visible.map((c) => (
                      <div key={c._id} className="flex gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center flex-shrink-0">
                          {c.author?.profilePic ? (
                            <img src={c.author.profilePic} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <span className="text-xs font-bold text-primary">
                              {c.author?.fullName?.[0] || c.author?.username?.[0]}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-3 py-2 inline-block">
                            <p className="text-sm font-semibold">{c.author?.fullName || c.author?.username}</p>
                            <p className="text-sm">{c.text}</p>
                          </div>
                          <div className="flex gap-3 mt-1 text-xs text-text-secondary ml-1">
                            <span>{formatTime(c.createdAt)}</span>
                            <button className="font-medium">Like</button>
                            <button className="font-medium">Reply</button>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center gap-2 pt-1">
                      <div className="w-8 h-8 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center flex-shrink-0">
                        {user?.profilePic ? (
                          <img src={user.profilePic} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <span className="text-xs font-bold text-primary">{user?.fullName?.[0]}</span>
                        )}
                      </div>
                      <div className="flex-1 flex items-center bg-white dark:bg-gray-800 rounded-full border border-border-light">
                        <input
                          type="text"
                          placeholder="Write a comment..."
                          value={commentText[post._id] || ''}
                          onChange={(e) => setCommentText((p) => ({ ...p, [post._id]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && handleComment(post._id)}
                          className="flex-1 bg-transparent px-4 py-2.5 text-sm outline-none"
                        />
                        <button
                          onClick={() => handleComment(post._id)}
                          disabled={!commentText[post._id]?.trim()}
                          className="pr-3 text-primary disabled:opacity-40"
                        >
                          <FiSend size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {viewerImage && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={() => setViewerImage(null)}>
          <img src={viewerImage} className="max-h-full max-w-full object-contain" alt="" />
          <button className="absolute top-4 right-4 p-2 text-white" onClick={() => setViewerImage(null)}>
            <FiX size={24} />
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Homepage;
