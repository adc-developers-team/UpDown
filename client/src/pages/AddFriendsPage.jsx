import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { FiArrowLeft, FiSearch, FiUserPlus, FiX } from 'react-icons/fi';

const AddFriendsPage = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null); // track which sent request is being cancelled

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, friendsRes, sentRes, recvRes] = await Promise.all([
          axios.get('http://192.168.0.102:5000/api/auth/users', config),
          axios.get('http://192.168.0.102:5000/api/friends', config),
          axios.get('http://192.168.0.102:5000/api/friends/requests/sent', config),
          axios.get('http://192.168.0.102:5000/api/friends/requests/received', config),
        ]);
        const usersExceptMe = usersRes.data.filter(u => u._id !== user._id);
        setAllUsers(usersExceptMe);
        setFriends(friendsRes.data.map(f => f._id));
        setSentRequests(sentRes.data.map(r => r.to._id)); // keep only to._id for quick lookup
        setReceivedRequests(recvRes.data.map(r => r.from._id));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user._id, token]);

  const sendFriendRequest = async (userId) => {
    try {
      await axios.post('http://192.168.0.102:5000/api/friends/request', { to: userId }, config);
      setSentRequests(prev => [...prev, userId]);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send request');
    }
  };

  const cancelRequest = async (userId) => {
    try {
      // Find the request object from server
      const { data: sentReqs } = await axios.get('http://192.168.0.102:5000/api/friends/requests/sent', config);
      const req = sentReqs.find(r => r.to._id === userId);
      if (!req) return;
      await axios.delete(`http://192.168.0.102:5000/api/friends/request/${req._id}`, config);
      setSentRequests(prev => prev.filter(id => id !== userId));
      setCancellingId(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel request');
    }
  };

  const filteredUsers = allUsers.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const getButtonStatus = (u) => {
    if (friends.includes(u._id)) return 'friend';
    if (sentRequests.includes(u._id)) return 'sent';
    if (receivedRequests.includes(u._id)) return 'received';
    return 'none';
  };

  return (
    <div className="min-h-screen bg-chat-bg text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-4 px-4 py-3 bg-dark-blue border-b border-gray-700">
        <Link to="/" className="text-white hover:text-light-blue">
          <FiArrowLeft size={22} />
        </Link>
        <h2 className="font-semibold text-lg">Add Friends</h2>
      </header>

      {/* Search Bar */}
      <div className="px-4 py-3 bg-sidebar-bg">
        <div className="flex items-center bg-gray-800 rounded-full px-4 py-2">
          <FiSearch className="text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ml-2 bg-transparent outline-none flex-1 text-sm text-white placeholder-gray-400"
          />
        </div>
      </div>

      {/* Results */}
      <div className="p-4 space-y-3 overflow-y-auto flex-1">
        {loading && <p className="text-center text-gray-400">Loading...</p>}
        {!loading && filteredUsers.length === 0 && (
          <p className="text-center text-gray-400">No users found</p>
        )}
        {filteredUsers.map(u => {
          const status = getButtonStatus(u);
          const isCancelling = cancellingId === u._id;
          return (
            <div key={u._id} className={`flex items-center gap-4 bg-sidebar-bg p-3 rounded-xl transition-colors ${isCancelling ? 'ring-2 ring-red-500' : 'hover:bg-gray-700'}`}>
              <div className="w-12 h-12 rounded-full bg-light-blue flex items-center justify-center text-lg font-semibold flex-shrink-0">
                {u.username[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium">{u.username}</h3>
                <p className="text-sm text-gray-400 truncate">{u.email}</p>
              </div>
              <div>
                {status === 'friend' && (
                  <span className="px-3 py-1 rounded-full bg-green-600/20 text-green-400 text-sm font-medium">
                    Your Friend
                  </span>
                )}
                {status === 'sent' && !isCancelling && (
                  <button
                    onClick={() => setCancellingId(u._id)}
                    className="px-3 py-1 rounded-full bg-yellow-600/20 text-yellow-400 text-sm font-medium hover:bg-yellow-600/30 transition"
                  >
                    Request Sent
                  </button>
                )}
                {status === 'sent' && isCancelling && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => cancelRequest(u._id)}
                      className="px-3 py-1 rounded-full bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition flex items-center gap-1"
                    >
                      <FiX size={14} />
                      Cancel?
                    </button>
                    <button
                      onClick={() => setCancellingId(null)}
                      className="px-2 py-1 rounded-full bg-gray-600 text-white text-xs hover:bg-gray-500"
                    >
                      No
                    </button>
                  </div>
                )}
                {status === 'received' && (
                  <span className="px-3 py-1 rounded-full bg-blue-600/20 text-blue-400 text-sm">
                    Request Received
                  </span>
                )}
                {status === 'none' && (
                  <button
                    onClick={() => sendFriendRequest(u._id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-light-blue hover:bg-blue-600 text-white rounded-full text-sm font-medium transition-colors"
                  >
                    <FiUserPlus size={16} />
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
