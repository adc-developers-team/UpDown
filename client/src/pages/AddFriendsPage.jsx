import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { FiArrowLeft, FiSearch, FiUserPlus, FiUserCheck, FiUsers } from 'react-icons/fi';

const AddFriendsPage = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

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
        setSentRequests(Array.isArray(sentRes.data) ? sentRes.data.map(r => r.to?._id || r._id) : []);
        setReceivedRequests(Array.isArray(recvRes.data) ? recvRes.data.map(r => r.from?._id || r._id) : []);
      } catch (err) {
        setAllUsers([]);
        setFriends([]);
        setSentRequests([]);
        setReceivedRequests([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user._id, token]);

  const sendFriendRequest = async (userId) => {
    try {
      await axios.post('https://updown-hms5.onrender.com/api/friends/request', { to: userId }, config);
      setSentRequests(prev => [...prev, userId]);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send request');
    }
  };

  // Filter users only when search query is not empty
  const filteredUsers = search.trim()
    ? allUsers.filter(u => {
        const name = (u.fullName || u.username || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const keyword = search.toLowerCase();
        return name.includes(keyword) || email.includes(keyword);
      })
    : [];

  const getButtonStatus = (u) => {
    if (friends.includes(u._id)) return 'friend';
    if (sentRequests.includes(u._id)) return 'sent';
    if (receivedRequests.includes(u._id)) return 'received';
    return 'none';
  };

  return (
    <div className="min-h-screen bg-chat-bg text-white flex flex-col">
      <header className="flex items-center gap-4 px-4 py-3 bg-dark-blue border-b border-gray-700">
        <Link to="/" className="text-white hover:text-accent"><FiArrowLeft size={22} /></Link>
        <h2 className="font-semibold text-lg">Add Friends</h2>
      </header>

      {/* Search Bar */}
      <div className="px-4 py-3 bg-sidebar-bg">
        <div className="flex items-center bg-bg-input rounded-full px-4 py-2 border border-gray-700 focus-within:border-accent transition">
          <FiSearch className="text-text-muted" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ml-2 bg-transparent outline-none flex-1 text-sm text-white placeholder-text-muted"
          />
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 p-4 overflow-y-auto">
        {loading && (
          <div className="text-center text-text-muted mt-10">Loading...</div>
        )}

        {!loading && !search.trim() && (
          <div className="flex flex-col items-center justify-center h-full text-text-muted mt-10">
            <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mb-4">
              <FiUsers size={36} className="text-accent/60" />
            </div>
            <p className="text-lg font-semibold text-white mb-1">Find your friends</p>
            <p className="text-sm">Search by name or email to connect</p>
          </div>
        )}

        {!loading && search.trim() && filteredUsers.length === 0 && (
          <div className="text-center text-text-muted mt-10">
            <p className="text-lg font-semibold text-white mb-1">No users found</p>
            <p className="text-sm">Try a different search term</p>
          </div>
        )}

        {filteredUsers.map(u => {
          const status = getButtonStatus(u);
          return (
            <div key={u._id} className="flex items-center gap-4 bg-sidebar-bg p-3 rounded-xl hover:bg-gray-800 transition-colors border border-gray-700 mb-2">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-lg font-semibold flex-shrink-0 overflow-hidden">
                {u.profilePic ? (
                  <img src={u.profilePic} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-accent font-bold">
                    {u.fullName?.[0] || u.username?.[0]?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{u.fullName || u.username}</h3>
                <p className="text-xs text-text-secondary truncate">{u.email}</p>
              </div>
              <div className="flex-shrink-0">
                {status === 'friend' && (
                  <span className="px-3 py-1 rounded-full bg-green-600/20 text-green-400 text-xs font-medium flex items-center gap-1">
                    <FiUserCheck size={12} /> Friend
                  </span>
                )}
                {status === 'sent' && (
                  <span className="px-3 py-1 rounded-full bg-yellow-600/20 text-yellow-400 text-xs">Request Sent</span>
                )}
                {status === 'received' && (
                  <span className="px-3 py-1 rounded-full bg-blue-600/20 text-blue-400 text-xs">Request Received</span>
                )}
                {status === 'none' && (
                  <button
                    onClick={() => sendFriendRequest(u._id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-accent hover:bg-accent-hover text-black rounded-full text-xs font-semibold transition-colors"
                  >
                    <FiUserPlus size={14} />
                    Add
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AddFriendsPage;
