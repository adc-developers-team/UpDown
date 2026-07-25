import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import axios from 'axios';
import { FiSearch, FiBell, FiPlus, FiUsers, FiMessageSquare, FiChevronDown } from 'react-icons/fi';
import SearchEngine from '../engines/SearchEngine';

const formatLastMessageTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString), now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return 'Just now';
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getDay()];
  return date.toLocaleDateString('en-US',{day:'numeric',month:'short'});
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
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [friendsRes, groupsRes] = await Promise.all([
          axios.get('https://updown-hms5.onrender.com/api/friends', config),
          axios.get('https://updown-hms5.onrender.com/api/groups', config)
        ]);
        setUsers(Array.isArray(friendsRes.data) ? friendsRes.data : []);
        setGroups(Array.isArray(groupsRes.data) ? groupsRes.data : []);
      } catch (err) {
        setUsers([]);
        setGroups([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user._id]);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const { data } = await axios.get('https://updown-hms5.onrender.com/api/friends/requests/received', config);
        setPendingCount(Array.isArray(data) ? data.length : 0);
      } catch (err) { setPendingCount(0); }
    };
    fetchPending();
    const interval = setInterval(fetchPending, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchMessageData = async () => {
      try {
        const [lastRes, unreadRes] = await Promise.all([
          axios.get(`https://updown-hms5.onrender.com/api/messages/last-messages/${user._id}`, config),
          axios.get(`https://updown-hms5.onrender.com/api/messages/unread-counts/${user._id}`, config)
        ]);
        const map = {};
        if (Array.isArray(lastRes.data)) {
          lastRes.data.forEach(msg => {
            const ids = msg.conversationId.split('_');
            const other = ids.find(id => id !== user._id);
            if (other) map[other] = msg;
          });
        }
        setLastMessages(map);
        setUnreadCounts(unreadRes.data || {});
      } catch (err) {}
    };
    fetchMessageData();
    const interval = setInterval(fetchMessageData, 5000);
    return () => clearInterval(interval);
  }, [user._id]);

  const safeUsers = Array.isArray(users) ? users : [];
  const filteredUsers = safeUsers.filter(u => {
    const name = (u.fullName || u.username || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const keyword = search.toLowerCase();
    return name.includes(keyword) || email.includes(keyword);
  });

  const safeGroups = Array.isArray(groups) ? groups : [];
  const filteredGroups = safeGroups.filter(g => {
    const name = (g.name || '').toLowerCase();
    const keyword = search.toLowerCase();
    return name.includes(keyword);
  });

  return (
    <div className="h-screen flex flex-col bg-chat-bg text-white w-full">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-dark-blue border-b border-gray-700 sticky top-0 z-20">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
          <span className="text-accent">Up</span>Down
        </h1>
        <div className="flex items-center gap-4">
          <Link to="/notifications" className="relative p-1.5 hover:bg-accent/10 rounded-full transition">
            <FiBell size={20} />
            {pendingCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold ring-2 ring-dark-blue">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </Link>
          <Link to="/profile" className="flex items-center gap-2 p-1.5 hover:bg-accent/10 rounded-full transition">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden ring-2 ring-transparent hover:ring-accent transition">
              {user?.profilePic ? (
                <img src={user.profilePic} className="w-full h-full object-cover" alt="" />
              ) : (
                <span className="text-sm font-bold text-accent">
                  {user?.fullName?.[0] || user?.username?.[0]?.toUpperCase()}
                </span>
              )}
            </div>
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex bg-sidebar-bg border-b border-gray-700">
        <button
          onClick={() => setActiveTab('chats')}
          className={`flex-1 py-3 text-sm font-semibold tracking-wide transition relative ${
            activeTab === 'chats' ? 'text-accent' : 'text-text-secondary hover:text-white'
          }`}
        >
          Chats
          {activeTab === 'chats' && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-accent rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex-1 py-3 text-sm font-semibold tracking-wide transition relative ${
            activeTab === 'groups' ? 'text-accent' : 'text-text-secondary hover:text-white'
          }`}
        >
          Groups
          {activeTab === 'groups' && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-accent rounded-full" />}
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-2 bg-sidebar-bg">
        <div className="flex items-center bg-bg-input rounded-full px-4 py-2 border border-gray-700 focus-within:border-accent transition">
          <FiSearch className="text-text-muted" size={16} />
          <input
            type="text"
            placeholder="Search chats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ml-2 bg-transparent outline-none flex-1 text-sm text-white placeholder-text-muted"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-1 p-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-700 rounded w-1/3" />
                  <div className="h-3 bg-gray-700 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'chats' ? (
          filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-muted px-4 text-center">
              <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                <FiMessageSquare size={36} className="text-accent/60" />
              </div>
              <p className="text-lg font-semibold text-white mb-1">No chats yet</p>
              <p className="text-sm mb-4">Add friends to start chatting</p>
              <Link to="/add-friends" className="bg-accent text-black px-5 py-2 rounded-full text-sm font-semibold hover:bg-accent-hover transition">
                Find Friends
              </Link>
            </div>
          ) : (
            filteredUsers.map(u => {
              const lastMsg = lastMessages[u._id];
              const unread = unreadCounts[u._id] || 0;
              return (
                <Link
                  key={u._id}
                  to={`/chat/${u._id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 border-b border-gray-800/50 transition-colors"
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden">
                      {u.profilePic ? (
                        <img src={u.profilePic} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <span className="text-lg font-bold text-accent">
                          {u.fullName?.[0] || u.username[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    {onlineUsers.includes(u._id) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-sidebar-bg" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-semibold text-sm truncate">{u.fullName || u.username}</h3>
                      {lastMsg && (
                        <span className="text-xs text-text-muted ml-2 flex-shrink-0">
                          {formatLastMessageTime(lastMsg.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <p className="text-xs text-text-secondary truncate flex-1">
                        {lastMsg ? (lastMsg.text || (lastMsg.image ? '📷 Media' : '')) : 'No messages yet'}
                      </p>
                      {unread > 0 && (
                        <span className="flex-shrink-0 w-5 h-5 bg-accent rounded-full text-[10px] flex items-center justify-center font-bold text-black">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })
          )
        ) : filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted px-4 text-center">
            <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mb-4">
              <FiUsers size={36} className="text-accent/60" />
            </div>
            <p className="text-lg font-semibold text-white mb-1">No groups yet</p>
            <p className="text-sm mb-4">Create a group to chat together</p>
            <Link to="/create-group" className="bg-accent text-black px-5 py-2 rounded-full text-sm font-semibold hover:bg-accent-hover transition">
              Create Group
            </Link>
          </div>
        ) : (
          filteredGroups.map(g => {
            const members = Array.isArray(g.members) ? g.members : [];
            return (
              <Link key={g._id} to={`/group-chat/${g._id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 border-b border-gray-800/50 transition-colors">
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                  <span className="text-lg font-bold text-accent">{g.name?.[0]?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{g.name}</h3>
                  <p className="text-xs text-text-secondary mt-0.5">{members.length} members</p>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Floating Buttons */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-3 z-10">
        <Link
          to="/create-group"
          className="w-12 h-12 bg-sidebar-bg border border-gray-700 rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
          title="Create Group"
        >
          <FiUsers size={20} />
        </Link>
        <Link
          to="/add-friends"
          className="w-14 h-14 bg-accent text-black rounded-full flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all animate-pulse-ring"
          title="Add Friends"
        >
          <FiPlus size={24} />
        </Link>
      </div>
    </div>
  );
};

export default Homepage;
