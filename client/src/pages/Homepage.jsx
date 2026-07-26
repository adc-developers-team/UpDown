import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { FiSearch, FiBell, FiPlus, FiMessageSquare, FiX, FiRefreshCw, FiWifiOff } from 'react-icons/fi';
import BottomNav from '../components/BottomNav';
import FeedFilter from '../components/home/FeedFilter';
import PostCard from '../components/home/PostCard';
import SkeletonCard from '../components/shared/SkeletonCard';
import ReportSheet from '../components/home/ReportSheet';
import ImageViewer from '../components/home/ImageViewer';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const Homepage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState('latest');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [newText, setNewText] = useState('');
  const [newImage, setNewImage] = useState(null);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [commentText, setCommentText] = useState({});
  const [reportPostId, setReportPostId] = useState(null);
  const [viewerImage, setViewerImage] = useState(null);
  const [showComposer, setShowComposer] = useState(false);

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const fetchPosts = useCallback(async (pageNum = 1, append = false) => {
    try {
      const { data } = await axios.get(`https://updown-hms5.onrender.com/api/posts`, {
        ...config,
        params: { filter, page: pageNum, limit: 10 },
      });
      if (append) {
        setPosts(prev => [...prev, ...data]);
      } else {
        setPosts(data);
      }
      setHasMore(data.length === 10);
    } catch (err) {
      if (!append) setPosts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { setLoading(true); fetchPosts(1); }, [fetchPosts]);

  const handleRefresh = () => { setRefreshing(true); fetchPosts(1); };
  const loadMore = () => { if (!loading && hasMore) { setPage(prev => prev + 1); fetchPosts(page + 1, true); } };

  const uploadImage = async (file) => {
    const reader = new FileReader();
    const base64 = await new Promise(resolve => { reader.onload = () => resolve(reader.result); reader.readAsDataURL(file); });
    const { data } = await axios.post('https://updown-hms5.onrender.com/api/upload/image', { image: base64 }, config);
    return data.imageUrl;
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newText.trim() && !newImage && !newVideoUrl.trim()) return;
    let imageUrl = '';
    if (newImage) {
      try { imageUrl = await uploadImage(newImage); } catch (err) { alert('Image upload failed'); return; }
    }
    try {
      await axios.post('https://updown-hms5.onrender.com/api/posts', {
        text: newText, image: imageUrl, video: newVideoUrl.trim() || '', privacy,
      }, config);
      setNewText(''); setNewImage(null); setNewVideoUrl(''); setShowComposer(false);
      fetchPosts(1);
    } catch (err) { alert('Failed to create post'); }
  };

  const handleLike = async (postId) => {
    try {
      await axios.put(`https://updown-hms5.onrender.com/api/posts/${postId}/like`, {}, config);
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, likes: p.likes?.includes(user._id) ? p.likes.filter(id => id !== user._id) : [...(p.likes||[]), user._id] } : p));
    } catch (err) {}
  };

  const handleComment = async (postId, text) => {
    if (!text.trim()) return;
    try {
      await axios.post(`https://updown-hms5.onrender.com/api/posts/${postId}/comment`, { text }, config);
      setCommentText(prev => ({ ...prev, [postId]: '' }));
      fetchPosts(1);
    } catch (err) {}
  };

  const handleDelete = async (postId) => {
    if (!confirm('Delete this post?')) return;
    try {
      await axios.delete(`https://updown-hms5.onrender.com/api/posts/${postId}`, config);
      setPosts(prev => prev.filter(p => p._id !== postId));
    } catch (err) { alert('Failed to delete'); }
  };

  const handleReport = async (postId, reason) => {
    try {
      await axios.post(`https://updown-hms5.onrender.com/api/posts/${postId}/report`, { reason }, config);
      alert('Report submitted');
    } catch (err) { alert(err.response?.data?.message || 'Failed to report'); }
  };

  const handleShare = (postId) => {
    const url = `${window.location.origin}/post/${postId}`;
    navigator.clipboard.writeText(url);
    alert('Link copied!');
  };

  const handlePin = async (postId) => {
    try {
      await axios.put(`https://updown-hms5.onrender.com/api/posts/${postId}/pin`, {}, config);
      fetchPosts(1);
    } catch (err) {}
  };

  const handleUserTap = (userId) => {
    // Profile preview sheet logic (simplified: navigate to profile)
    window.location.href = `/profile/${userId}`;
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
        loadMore();
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, hasMore]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-chat-bg text-white pb-20">
      {isOffline && (
        <div className="bg-warning/20 text-warning text-xs text-center py-1.5 flex items-center justify-center gap-2">
          <FiWifiOff size={14} /> You are offline. Pull to refresh when connected.
        </div>
      )}

      <header className="h-16 sm:h-[72px] flex items-center justify-between px-4 bg-dark-blue border-b border-border-light sticky top-0 z-20">
        <h1 className="text-xl sm:text-[22px] font-extrabold tracking-tight">
          <span className="text-primary">Up</span>Down
        </h1>
        <div className="flex items-center gap-3">
          <button className="p-1.5 hover:bg-primary/10 rounded-full"><FiSearch size={20} /></button>
          <button className="p-1.5 hover:bg-primary/10 rounded-full relative">
            <FiBell size={20} />
            <span className="absolute top-0 right-0 w-2 h-2 bg-danger rounded-full" />
          </button>
          <button className="p-0.5">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden ring-2 ring-primary/20">
              {user?.profilePic ? <img src={user.profilePic} className="w-full h-full object-cover" alt="" /> : <span className="text-sm font-bold text-primary">{user?.fullName?.[0]?.toUpperCase()}</span>}
            </div>
          </button>
        </div>
      </header>

      <div className="px-4 py-3">
        <div className="bg-surface rounded-2xl p-4 border border-border-light shadow-1 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              {user?.profilePic ? <img src={user.profilePic} className="w-full h-full object-cover" alt="" /> : <span className="text-lg font-bold text-primary">{user?.fullName?.[0]?.toUpperCase()}</span>}
            </div>
            <textarea
              value={newText}
              onChange={e => setNewText(e.target.value)}
              placeholder="What's happening?"
              className="flex-1 bg-transparent outline-none text-sm text-primary placeholder-text-muted resize-none"
              rows={2}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
              <FiImage size={20} className="text-text-secondary" />
              <input type="file" accept="image/*" onChange={e => setNewImage(e.target.files[0])} className="hidden" />
            </label>
            <div className="flex-1 flex items-center bg-bg-input rounded-full px-3 py-1 border border-border-light">
              <FiSearch size={14} className="text-text-muted mr-1" />
              <input
                type="text"
                placeholder="Video link (YouTube, etc.)"
                value={newVideoUrl}
                onChange={e => setNewVideoUrl(e.target.value)}
                className="bg-transparent outline-none text-sm text-primary flex-1 placeholder-text-muted"
              />
            </div>
            <select
              value={privacy}
              onChange={e => setPrivacy(e.target.value)}
              className="bg-bg-input text-sm rounded-full px-3 py-1 border border-border-light outline-none"
            >
              <option value="public">Public</option>
              <option value="friends">Friends</option>
              <option value="followers">Followers</option>
              <option value="private">Private</option>
            </select>
            <button
              onClick={handleCreatePost}
              disabled={!newText.trim() && !newImage && !newVideoUrl.trim()}
              className="bg-primary text-white px-5 py-2 rounded-full text-sm font-semibold disabled:opacity-50"
            >
              Post
            </button>
          </div>
        </div>
      </div>

      <FeedFilter activeFilter={filter} onChange={setFilter} />

      <div className="px-4 mt-3 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-muted">
            <FiMessageSquare size={48} className="mb-3 opacity-40" />
            <p className="text-lg font-semibold text-white">No posts yet</p>
            <p className="text-sm">Be the first to share something!</p>
          </div>
        ) : (
          posts.map(post => (
            <PostCard
              key={post._id}
              post={post}
              currentUser={user}
              onLike={handleLike}
              onComment={(postId) => setCommentText(prev => ({ ...prev, [postId]: '' }))}
              onShare={handleShare}
              onSave={() => {}}
              onReport={(postId) => setReportPostId(postId)}
              onDelete={handleDelete}
              onPin={handlePin}
              onUserTap={handleUserTap}
            />
          ))
        )}
        {hasMore && !loading && (
          <div className="text-center py-4">
            <button onClick={loadMore} className="text-primary text-sm font-medium">Load more</button>
          </div>
        )}
      </div>

      {reportPostId && (
        <ReportSheet
          postId={reportPostId}
          onClose={() => setReportPostId(null)}
          onReport={handleReport}
        />
      )}

      {viewerImage && (
        <ImageViewer src={viewerImage} onClose={() => setViewerImage(null)} />
      )}

      <button
        onClick={() => setShowComposer(!showComposer)}
        className="fixed bottom-20 right-6 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-3 hover:scale-105 active:scale-95 transition-all z-20"
      >
        <FiPlus size={26} />
      </button>

      <BottomNav />
    </div>
  );
};

export default Homepage;
