import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import axios from 'axios';
import { FiSearch, FiBell, FiPlus, FiUsers } from 'react-icons/fi';

const formatLastMessageTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHrs = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHrs / 24);
  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return weekdays[date.getDay()];
  }
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
};

const Homepage = () => {
  const { user } = useAuth();
  const { setUsers, users, onlineUsers } = useChat();
  const [search, setSearch] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastMessages, setLastMessages] = useState({});
  const [activeTab, setActiveTab] = useState('chats');
  const [groups, setGroups] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  // Fetch friends & groups
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [friendsRes, groupsRes] = await Promise.all([
          axios.get('http://192.168.0.102:5000/api/friends', config),
          axios.get('http://192.168.0.102:5000/api/groups', config)
        ]);
        setUsers(friendsRes.data);
        setGroups(groupsRes.data);
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    };
    fetchData();
  }, [user._id]);

  // Fetch pending count
  useEffect(() => {
    const fetchPending = async () => {
      try {
        const { data } = await axios.get('http://192.168.0.102:5000/api/friends/requests/received', config);
        setPendingCount(data.length);
      } catch (err) { console.error(err); }
    };
    fetchPending();
    const interval = setInterval(fetchPending, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch last messages and unread counts
  useEffect(() => {
    const fetchMessageData = async () => {
      try {
        const [lastRes, unreadRes] = await Promise.all([
          axios.get(`http://192.168.0.102:5000/api/messages/last-messages/${user._id}`, config),
          axios.get(`http://192.168.0.102:5000/api/messages/unread-counts/${user._id}`, config)
        ]);
        const map = {};
        lastRes.data.forEach(msg => {
          const ids = msg.conversationId.split('_');
          const other = ids.find(id => id !== user._id);
          if (other) map[other] = msg;
        });
        setLastMessages(map);
        setUnreadCounts(unreadRes.data);
      } catch (err) { console.error('Message data error:', err); }
    };
    fetchMessageData();
    const interval = setInterval(fetchMessageData, 5000);
    return () => clearInterval(interval);
  }, [user._id]);

  const filteredUsers = users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()));
  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-screen flex flex-col bg-chat-bg text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-dark-blue border-b border-gray-700">
        <h1 className="text-xl font-bold">UpDown</h1>
        <div className="flex items-center gap-5">
          <Link to="/notifications" className="relative text-2xl hover:text-light-blue">
            <FiBell strokeWidth={2} />
            {pendingCount > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-dark-blue"></span>}
          </Link>
          <Link to="/profile" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-light-blue flex items-center justify-center">
              {user?.profilePic ? (
                <img src={user.profilePic} className="w-full h-full object-cover" />
              ) : (
                <span className="font-semibold">{user?.username?.[0]?.toUpperCase()}</span>
              )}
            </div>
            <span className="hidden md:inline text-sm">{user?.username}</span>
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex bg-sidebar-bg border-b border-gray-700">
        <button onClick={() => setActiveTab('chats')} className={`flex-1 py-2 font-medium text-sm ${activeTab === 'chats' ? 'border-b-2 border-light-blue text-light-blue' : 'text-gray-400'}`}>
          Chats
        </button>
        <button onClick={() => setActiveTab('groups')} className={`flex-1 py-2 font-medium text-sm ${activeTab === 'groups' ? 'border-b-2 border-light-blue text-light-blue' : 'text-gray-400'}`}>
          Groups
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-2 bg-sidebar-bg">
        <div className="flex items-center bg-gray-800 rounded-full px-4 py-2">
          <FiSearch className="text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ml-2 bg-transparent outline-none flex-1 text-sm text-white placeholder-gray-400"
          />
        </div>
      </div>

      {/* Chat / Group List */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'chats' && filteredUsers.map(u => {
          const lastMsg = lastMessages[u._id];
          const unread = unreadCounts[u._id] || 0;
          return (
            <Link
              key={u._id}
              to={`/chat/${u._id}`}
              className="flex items-center gap-4 px-4 py-3 hover:bg-gray-800 border-b border-gray-800/50 transition-colors relative"
            >
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-light-blue overflow-hidden flex items-center justify-center">
                  {u.profilePic ? (
                    <img src={u.profilePic} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-semibold">{u.username[0].toUpperCase()}</span>
                  )}
                </div>
                {/* Online dot */}
                {onlineUsers.includes(u._id) && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-sidebar-bg" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <h3 className="font-medium truncate">{u.username}</h3>
                  {lastMsg && (
                    <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                      {formatLastMessageTime(lastMsg.createdAt)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <p className="text-sm text-gray-400 truncate flex-1">
                    {lastMsg ? (lastMsg.text || (lastMsg.image ? '📷 Image' : '')) : 'No messages yet'}
                  </p>
                  {unread > 0 && (
                    <span className="flex-shrink-0 w-5 h-5 bg-green-500 rounded-full text-xs flex items-center justify-center font-bold">
                      {unread}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}

        {activeTab === 'groups' && filteredGroups.map(g => (
          <Link key={g._id} to={`/group-chat/${g._id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-800 border-b border-gray-800/50 transition-colors">
            <div className="w-12 h-12 rounded-full bg-light-blue flex items-center justify-center text-lg font-semibold">
              {g.profilePic ? <img src={g.profilePic} className="w-full h-full object-cover" /> : g.name[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <h3 className="font-medium">{g.name}</h3>
              <p className="text-sm text-gray-400 truncate">{g.members.length} members</p>
            </div>
          </Link>
        ))}

        {activeTab === 'chats' && filteredUsers.length === 0 && (
          <div className="text-center text-gray-500 mt-10">No chats found</div>
        )}
        {activeTab === 'groups' && filteredGroups.length === 0 && (
          <div className="text-center text-gray-500 mt-10">No groups found</div>
        )}
      </div>

      {/* Floating Action Buttons */}
      <div className="absolute bottom-6 left-6 flex flex-col gap-3">
        <Link to="/add-friends" className="w-12 h-12 bg-light-blue rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-transform">
          <FiPlus size={22} />
        </Link>
        <Link to="/create-group" className="w-12 h-12 bg-light-blue rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-transform">
          <FiUsers size={22} />
        </Link>
      </div>
    </div>
  );
};

export default Homepage;
