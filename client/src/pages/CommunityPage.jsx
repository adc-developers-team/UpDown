import BottomNav from '../components/BottomNav';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { FiHeart, FiMessageSquare, FiShare2, FiSend, FiImage, FiX, FiMoreHorizontal } from 'react-icons/fi';

const CommunityPage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState({});

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => { fetchPosts(); }, []);

  const fetchPosts = async () => {
    try {
      const { data } = await axios.get('https://updown-hms5.onrender.com/api/posts', config);
      setPosts(Array.isArray(data) ? data : []);
    } catch (err) { setPosts([]); } finally { setLoading(false); }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    try {
      await axios.post('https://updown-hms5.onrender.com/api/posts', { text: newPost }, config);
      setNewPost('');
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

  const formatTime = (d) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  if (loading) return <div className="min-h-screen bg-chat-bg flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div></div>;

  return (
    <div className="min-h-screen bg-chat-bg text-primary pb-16">
      <header className="h-16 sm:h-[72px] flex items-center px-4 bg-dark-blue border-b border-border-light/50 sticky top-0 z-20">
        <h2 className="text-xl font-bold"><span className="text-primary">UpDown</span> Community</h2>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Post Composer */}
        <form onSubmit={handleCreatePost} className="bg-surface rounded-2xl p-4 border border-border-light shadow-1 space-y-3">
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full bg-transparent outline-none text-sm text-primary placeholder-text-muted resize-none"
            rows={3}
          />
          <div className="flex items-center justify-between">
            <button type="button" className="p-2 hover:bg-gray-100 dark:hover:bg-surface rounded-full"><FiImage size={20} className="text-text-secondary" /></button>
            <button type="submit" disabled={!newPost.trim()} className="bg-primary text-primary px-5 py-2 rounded-full text-sm font-semibold disabled:opacity-50">Post</button>
          </div>
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
                {/* Post Header (Themed) */}
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

                {/* Post Content */}
                <div className="px-4 pb-3">
                  <p className="text-sm leading-relaxed">{post.text}</p>
                  {post.image && <img src={post.image} className="rounded-xl mt-2 max-w-full" alt="" />}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 px-4 py-2 border-t border-border-light">
                  <button onClick={() => handleLike(post._id)} className={`flex items-center gap-1.5 text-sm ${post.likes?.includes(user._id) ? 'text-danger' : 'text-text-secondary hover:text-danger'} transition`}>
                    <FiHeart size={16} className={post.likes?.includes(user._id) ? 'fill-current' : ''} />
                    <span>{post.likes?.length || 0}</span>
                  </button>
                  <button onClick={() => setCommentText(prev => ({ ...prev, [post._id]: prev[post._id] === undefined ? '' : prev[post._id] }))} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition">
                    <FiMessageSquare size={16} />
                    <span>{post.comments?.length || 0}</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition">
                    <FiShare2 size={16} />
                  </button>
                </div>

                {/* Comments Section */}
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
    </div>
  );
};

    <BottomNav />
export default CommunityPage;
