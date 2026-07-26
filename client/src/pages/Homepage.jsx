import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  FiHeart, FiMessageSquare, FiShare2, FiSend, FiImage, FiX, FiMoreHorizontal,
  FiVideo, FiMaximize, FiSearch, FiBell
} from 'react-icons/fi';
import BottomNav from '../components/BottomNav';
import { Link } from 'react-router-dom';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const Homepage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [newText, setNewText] = useState('');
  const [newImage, setNewImage] = useState(null);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState({});
  const [viewerImage, setViewerImage] = useState(null);
  const [search, setSearch] = useState('');

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => { fetchPosts(); }, []);

  const fetchPosts = async () => {
    try {
      const { data } = await axios.get('https://updown-hms5.onrender.com/api/posts', config);
      setPosts(Array.isArray(data) ? data : []);
    } catch (err) { setPosts([]); } finally { setLoading(false); }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE) return alert('Image too large (max 10 MB)');
    setNewImage(file);
  };

  const uploadImage = async (file) => {
    const reader = new FileReader();
    const base64 = await new Promise((resolve) => {
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
    const { data } = await axios.post('https://updown-hms5.onrender.com/api/upload/image', { image: base64 }, config);
    return data.imageUrl;
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newText.trim() && !newImage && !newVideoUrl.trim()) return;
    let imageUrl = '';
    let video = '';
    if (newImage) {
      try { imageUrl = await uploadImage(newImage); } catch (err) { alert('Image upload failed'); return; }
    }
    if (newVideoUrl.trim()) video = newVideoUrl.trim();
    try {
      await axios.post('https://updown-hms5.onrender.com/api/posts', {
        text: newText, image: imageUrl, video: video,
      }, config);
      setNewText(''); setNewImage(null); setNewVideoUrl('');
      fetchPosts();
    } catch (err) { alert('Failed to create post'); }
  };

  const handleLike = async (postId) => {
    try {
      await axios.put(`https://updown-hms5.onrender.com/api/posts/${postId}/like`, {}, config);
      fetchPosts();
    } catch (err) {}
  };

  const handleComment = async (postId, text) => {
    if (!text.trim()) return;
    try {
      await axios.post(`https://updown-hms5.onrender.com/api/posts/${postId}/comment`, { text }, config);
      setCommentText(prev => ({ ...prev, [postId]: '' }));
      fetchPosts();
    } catch (err) {}
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('Delete this post?')) return;
    try {
      await axios.delete(`https://updown-hms5.onrender.com/api/posts/${postId}`, config);
      fetchPosts();
    } catch (err) { alert('Failed to delete'); }
  };

  const handleShare = (postId) => {
    const url = `${window.location.origin}/post/${postId}`;
    if (navigator.share) {
      navigator.share({ title: 'Check this post', url });
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied!');
    }
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

  const getYouTubeId = (url) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  };

  if (loading) return <div className="min-h-screen bg-chat-bg flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div></div>;

  return (
    <div className="min-h-screen bg-chat-bg text-white pb-20">
      {/* Header – Social Media Style */}
      <header className="h-16 sm:h-[72px] flex items-center justify-between px-4 bg-dark-blue border-b border-border-light sticky top-0 z-20">
        <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight">
          <span className="text-primary">Up</span>Down
        </h1>
        <div className="flex items-center gap-3">
          <Link to="/chats" className="p-1.5 hover:bg-primary/10 rounded-full transition">
            <FiMessageSquare size={22} />
          </Link>
          <Link to="/notifications" className="relative p-1.5 hover:bg-primary/10 rounded-full transition">
            <FiBell size={22} />
            {/* pending count could be added here if needed */}
          </Link>
          <Link to="/profile" className="p-0.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden ring-2 ring-primary/20 hover:ring-primary transition">
              {user?.profilePic ? (
                <img src={user.profilePic} className="w-full h-full object-cover" alt="" />
              ) : (
                <span className="text-sm font-bold text-primary">{user?.fullName?.[0] || user?.username?.[0]?.toUpperCase()}</span>
              )}
            </div>
          </Link>
        </div>
      </header>

      {/* Search Bar */}
      <div className="px-4 py-3 bg-sidebar-bg border-b border-border-light">
        <div className="flex items-center bg-bg-input rounded-full h-10 px-4 border border-border-light focus-within:border-primary transition">
          <FiSearch className="text-text-muted flex-shrink-0" size={18} />
          <input
            type="text"
            placeholder="Search posts, friends, groups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ml-3 bg-transparent outline-none flex-1 text-sm text-white placeholder-text-muted"
          />
          {search && (
            <button onClick={() => setSearch('')} className="p-1 hover:bg-gray-700 rounded-full"><FiX size={16} className="text-text-muted" /></button>
          )}
        </div>
      </div>

      {/* Main Content – Feed */}
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Post Composer */}
        <form onSubmit={handleCreatePost} className="bg-surface rounded-2xl p-4 border border-border-light shadow-1 space-y-3">
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full bg-transparent outline-none text-sm text-primary placeholder-text-muted resize-none"
            rows={3}
          />
          <div className="flex items-center gap-2">
            <label className="cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
              <FiImage size={20} className="text-text-secondary" />
              <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            </label>
            <div className="flex-1 flex items-center bg-bg-input rounded-full px-3 py-1 border border-border-light">
              <FiVideo size={16} className="text-text-secondary mr-2" />
              <input
                type="text"
                placeholder="Video link (YouTube, Vimeo, MP4)"
                value={newVideoUrl}
                onChange={(e) => setNewVideoUrl(e.target.value)}
                className="bg-transparent outline-none text-sm text-primary flex-1 placeholder-text-muted"
              />
              {newVideoUrl && <button type="button" onClick={() => setNewVideoUrl('')} className="p-1"><FiX size={14} className="text-text-muted" /></button>}
            </div>
          </div>
          {(newText || newImage || newVideoUrl) && (
            <button type="submit" className="w-full bg-primary text-white py-2 rounded-full font-semibold hover:bg-primary-dark transition">
              Post
            </button>
          )}
        </form>

        {/* Posts Feed */}
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="text-center py-10 text-text-muted">
              <p className="text-lg font-semibold">No posts yet</p>
              <p className="text-sm">Be the first to share something!</p>
            </div>
          ) : (
            posts.map(post => (
              <div key={post._id} className="bg-surface rounded-2xl border border-border-light shadow-1 overflow-hidden">
                <div className="flex items-center gap-3 p-4 pb-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                    {post.author?.profilePic ? <img src={post.author.profilePic} className="w-full h-full object-cover" alt="" /> : <span className="text-lg font-bold text-primary">{post.author?.fullName?.[0] || post.author?.username?.[0]?.toUpperCase()}</span>}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{post.author?.fullName || post.author?.username}</h3>
                    <p className="text-xs text-text-secondary">{formatTime(post.createdAt)}</p>
                  </div>
                  {post.author?._id === user._id && (
                    <button onClick={() => handleDeletePost(post._id)} className="text-text-muted hover:text-danger"><FiMoreHorizontal size={16} /></button>
                  )}
                </div>
                <div className="px-4 pb-3 space-y-2">
                  {post.text && <p className="text-sm leading-relaxed">{post.text}</p>}
                  {post.image && !post.video && (
                    <img
                      src={post.image}
                      className="rounded-xl w-full cursor-pointer"
                      onClick={() => setViewerImage(post.image)}
                      alt=""
                    />
                  )}
                  {post.video && (
                    <div className="relative rounded-xl overflow-hidden bg-black">
                      {getYouTubeId(post.video) ? (
                        <div className="cursor-pointer" onClick={() => window.open(post.video, '_blank')}>
                          <img src={`https://img.youtube.com/vi/${getYouTubeId(post.video)}/0.jpg`} className="w-full" alt="" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <FiVideo size={40} className="text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => window.open(post.video, '_blank')}>
                          <FiVideo size={24} className="text-primary" />
                          <div>
                            <p className="text-sm font-medium">Watch video</p>
                            <p className="text-xs text-text-secondary truncate">{post.video}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 px-4 py-2 border-t border-border-light">
                  <button onClick={() => handleLike(post._id)} className={`flex items-center gap-1.5 text-sm ${post.likes?.includes(user._id) ? 'text-primary' : 'text-text-secondary hover:text-primary'} transition`}>
                    <FiHeart size={16} className={post.likes?.includes(user._id) ? 'fill-current' : ''} />
                    <span>{post.likes?.length || 0}</span>
                  </button>
                  <button onClick={() => setCommentText(prev => ({ ...prev, [post._id]: prev[post._id] === undefined ? '' : prev[post._id] }))} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition">
                    <FiMessageSquare size={16} />
                    <span>{post.comments?.length || 0}</span>
                  </button>
                  <button onClick={() => handleShare(post._id)} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition">
                    <FiShare2 size={16} />
                  </button>
                </div>
                {commentText[post._id] !== undefined && (
                  <div className="px-4 pb-3 space-y-2">
                    {post.comments?.slice(-3).map(comment => (
                      <div key={comment._id} className="flex items-start gap-2 text-sm">
                        <span className="font-semibold text-primary">{comment.author?.fullName || comment.author?.username}</span>
                        <span className="text-text-secondary">{comment.text}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="text"
                        placeholder="Write a comment..."
                        value={commentText[post._id] || ''}
                        onChange={(e) => setCommentText(prev => ({ ...prev, [post._id]: e.target.value }))}
                        className="flex-1 bg-bg-input rounded-full px-3 py-1.5 text-sm outline-none border border-border-light focus:border-primary"
                      />
                      <button onClick={() => handleComment(post._id, commentText[post._id])} className="text-primary p-1"><FiSend size={16} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Full Screen Image Viewer */}
      {viewerImage && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={() => setViewerImage(null)}>
          <img src={viewerImage} className="max-h-full max-w-full object-contain" alt="" />
          <button className="absolute top-4 right-4 text-white p-2" onClick={() => setViewerImage(null)}><FiX size={28} /></button>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Homepage;
