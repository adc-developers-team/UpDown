import BottomNav from '../components/BottomNav';
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  FiArrowLeft, FiSearch, FiUserPlus, FiUserCheck, FiUserX, FiClock,
  FiUsers, FiX, FiChevronRight
} from 'react-icons/fi';

const RECENT_KEY = 'updown_recent_searches';

const AddFriendsPage = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all'); // all | requests | sent | suggested
  const [allUsers, setAllUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentSearches, setRecentSearches] = useState([]);

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      setRecentSearches(stored);
    } catch { setRecentSearches([]); }
  }, []);

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, friendsRes, sentRes, recvRes] = await Promise.all([
          axios.get('https://updown-hms5.onrender.com/api/auth/users', config),
          axios.get('https://updown-hms5.onrender.com/api/friends', config),
          axios.get('https://updown-hms5.onrender.com/api/friends/requests/sent', config),
          axios.get('https://updown-hms5.onrender.com/api/friends/requests/received', config),
        ]);
        const usersExceptMe = (Array.isArray(usersRes.data) ? usersRes.data : []).filter(u => u._id !== user._id);
        setAllUsers(usersExceptMe);
        setFriends(Array.isArray(friendsRes.data) ? friendsRes.data.map(f => f._id) : []);
        setSentRequests(Array.isArray(sentRes.data) ? sentRes.data : []);
        setReceivedRequests(Array.isArray(recvRes.data) ? recvRes.data : []);
      } catch (err) {
        setAllUsers([]); setFriends([]); setSentRequests([]); setReceivedRequests([]);
      } finally { setLoading(false); }
    };
    fetchData();
  }, [user._id]);

  // Save recent search
  const addRecentSearch = (term) => {
    if (!term.trim()) return;
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  };

  // Friend action handlers
  const sendFriendRequest = async (userId) => {
    try {
      await axios.post('https://updown-hms5.onrender.com/api/friends/request', { to: userId }, config);
      setSentRequests(prev => [...prev, { to: { _id: userId }, _id: Date.now() }]);
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  const cancelRequest = async (requestId) => {
    try {
      await axios.delete(`https://updown-hms5.onrender.com/api/friends/request/${requestId}`, config);
      setSentRequests(prev => prev.filter(r => r._id !== requestId));
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  const handleAccept = async (requestId) => {
    try {
      await axios.put(`https://updown-hms5.onrender.com/api/friends/request/${requestId}`, { action: 'accept' }, config);
      setReceivedRequests(prev => prev.filter(r => r._id !== requestId));
      const acceptedUser = receivedRequests.find(r => r._id === requestId)?.from;
      if (acceptedUser) setFriends(prev => [...prev, acceptedUser._id]);
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  const handleDecline = async (requestId) => {
    try {
      await axios.put(`https://updown-hms5.onrender.com/api/friends/request/${requestId}`, { action: 'decline' }, config);
      setReceivedRequests(prev => prev.filter(r => r._id !== requestId));
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  // Compute "suggested" users: mutual friends (simplified: all non-friends)
  const suggestedUsers = allUsers.filter(u => !friends.includes(u._id) && !sentRequests.some(r => (r.to?._id || r.to) === u._id) && !receivedRequests.some(r => (r.from?._id || r.from) === u._id));

  // Search results filtered by search term
  const filteredUsers = search.trim()
    ? allUsers.filter(u => {
        const name = (u.fullName || u.username || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const keyword = search.toLowerCase();
        return name.includes(keyword) || email.includes(keyword);
      })
    : [];

  const getStatus = (u) => {
    if (friends.includes(u._id)) return 'friend';
    if (sentRequests.some(r => (r.to?._id || r.to) === u._id)) return 'pending_sent';
    if (receivedRequests.some(r => (r.from?._id || r.from) === u._id)) return 'pending_received';
    return 'none';
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) addRecentSearch(search);
  };

  return (
    <div className="min-h-screen bg-chat-bg text-white flex flex-col pb-16">
      {/* Header */}
      <header className="h-16 sm:h-[72px] flex items-center gap-4 px-4 bg-dark-blue border-b border-gray-700/50 sticky top-0 z-20">
        <Link to="/" className="text-white hover:text-primary p-1"><FiArrowLeft size={22} /></Link>
        <h2 className="font-semibold text-lg">Add Friends</h2>
      </header>

      {/* Search Bar */}
      <div className="px-4 py-3 bg-sidebar-bg">
        <form onSubmit={handleSearch} className="flex items-center bg-bg-input rounded-full h-12 px-4 border border-gray-700/50 focus-within:border-primary focus-within:shadow-md transition">
          <FiSearch className="text-text-muted flex-shrink-0" size={18} />
          <input
            type="text"
            placeholder="Search by name, username or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ml-3 bg-transparent outline-none flex-1 text-sm text-white placeholder-text-muted"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="p-1 hover:bg-gray-700 rounded-full"><FiX size={16} className="text-text-muted" /></button>
          )}
        </form>
      </div>

      {/* Tabs */}
      <div className="flex bg-sidebar-bg border-b border-gray-700/50 overflow-x-auto">
        {['all', 'requests', 'sent', 'suggested'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-3 text-sm font-medium capitalize whitespace-nowrap border-b-2 transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-white'}`}>
            {t === 'all' ? 'Search' : t === 'requests' ? `Requests (${receivedRequests.length})` : t === 'sent' ? `Sent (${sentRequests.length})` : 'Suggested'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-gray-700" />
                <div className="flex-1 space-y-2"><div className="h-4 bg-gray-700 rounded w-1/3" /><div className="h-3 bg-gray-700 rounded w-2/3" /></div>
              </div>
            ))}
          </div>
        )}

        {!loading && tab === 'all' && (
          <>
            {/* Recent Searches */}
            {!search && recentSearches.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Recent Searches</p>
                {recentSearches.map((term, i) => (
                  <button key={i} onClick={() => { setSearch(term); addRecentSearch(term); }} className="flex items-center gap-2 text-sm text-text-secondary hover:text-white transition w-full">
                    <FiClock size={14} /> {term}
                  </button>
                ))}
              </div>
            )}

            {/* Search Results */}
            {search && filteredUsers.length === 0 && (
              <div className="text-center text-text-muted mt-10">
                <FiUsers size={40} className="mx-auto mb-3 opacity-50" />
                <p className="font-semibold">No users found</p>
                <p className="text-sm">Try a different name or username</p>
              </div>
            )}
            {filteredUsers.map(u => (
              <UserCard key={u._id} user={u} status={getStatus(u)} onAdd={() => sendFriendRequest(u._id)} onAccept={() => {}} onDecline={() => {}} />
            ))}
          </>
        )}

        {tab === 'requests' && (
          receivedRequests.length === 0 ? (
            <EmptyState icon={<FiUserCheck size={40} />} title="No friend requests" subtitle="When someone adds you, they'll appear here" />
          ) : (
            receivedRequests.map(r => (
              <UserCard key={r._id} user={r.from} status="pending_received" onAccept={() => handleAccept(r._id)} onDecline={() => handleDecline(r._id)} />
            ))
          )
        )}

        {tab === 'sent' && (
          sentRequests.length === 0 ? (
            <EmptyState icon={<FiUserPlus size={40} />} title="No sent requests" subtitle="Requests you've sent will appear here" />
          ) : (
            sentRequests.map(r => (
              <UserCard key={r._id} user={r.to} status="pending_sent" onCancel={() => cancelRequest(r._id)} />
            ))
          )
        )}

        {tab === 'suggested' && (
          suggestedUsers.length === 0 ? (
            <EmptyState icon={<FiUsers size={40} />} title="No suggestions" subtitle="Add more friends to see suggestions" />
          ) : (
            suggestedUsers.map(u => (
              <UserCard key={u._id} user={u} status="none" onAdd={() => sendFriendRequest(u._id)} />
            ))
          )
        )}
      </div>
    </div>
  );
};

// Sub-components
const UserCard = ({ user: u, status, onAdd, onAccept, onDecline, onCancel }) => (
  <div className="flex items-center gap-4 p-3 bg-surface rounded-xl border border-border-light shadow-1 hover:border-primary/30 transition">
    <div className="relative flex-shrink-0">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
        {u.profilePic ? <img src={u.profilePic} className="w-full h-full object-cover" alt="" /> : <span className="text-lg font-bold text-primary">{u.fullName?.[0] || u.username?.[0]?.toUpperCase()}</span>}
      </div>
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="font-semibold text-sm truncate">{u.fullName || u.username}</h3>
      <p className="text-xs text-text-secondary truncate">@{u.username}</p>
      {u.bio && <p className="text-xs text-text-muted truncate mt-0.5">{u.bio}</p>}
    </div>
    <div className="flex-shrink-0">
      {status === 'friend' && <span className="text-xs font-medium text-success flex items-center gap-1"><FiUserCheck size={14} /> Friend</span>}
      {status === 'pending_sent' && (
        <button onClick={onCancel} className="text-xs font-medium text-warning bg-warning/10 px-3 py-1 rounded-full hover:bg-warning/20 transition">Cancel</button>
      )}
      {status === 'pending_received' && (
        <div className="flex gap-2">
          <button onClick={onAccept} className="p-1.5 bg-success/10 text-success rounded-full hover:bg-success/20"><FiUserCheck size={16} /></button>
          <button onClick={onDecline} className="p-1.5 bg-danger/10 text-danger rounded-full hover:bg-danger/20"><FiX size={16} /></button>
        </div>
      )}
      {status === 'none' && (
        <button onClick={onAdd} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-full text-xs font-medium hover:bg-primary-dark transition"><FiUserPlus size={14} /> Add</button>
      )}
    </div>
  </div>
);

const EmptyState = ({ icon, title, subtitle }) => (
  <div className="flex flex-col items-center justify-center py-10 text-text-muted">
    <div className="mb-3 opacity-40">{icon}</div>
    <p className="font-semibold">{title}</p>
    <p className="text-sm">{subtitle}</p>
  </div>
);

    <BottomNav />
export default AddFriendsPage;
