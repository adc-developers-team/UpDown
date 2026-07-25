import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import axios from 'axios';
import { FiSearch, FiBell, FiPlus, FiUsers, FiMessageSquare, FiX } from 'react-icons/fi';

/* ---------- helpers ---------- */
const formatLastMessageTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString), now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDays = Math.floor(diffHr / 24);
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
  const [fabOpen, setFabOpen] = useState(false);

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
        setUsers([]); setGroups([]);
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
    const keyword = search.toLowerCase();
    return name.includes(keyword);
  });

  const safeGroups = Array.isArray(groups) ? groups : [];
  const filteredGroups = safeGroups.filter(g => {
    const name = (g.name || '').toLowerCase();
    const keyword = search.toLowerCase();
    return name.includes(keyword);
  });

  return (
    <div className="h-screen flex flex-col bg-chat-bg text-white w-full">
      {/* ===== App Bar (h-16 sm:h-[72px]) ===== */}
      <header className="h-16 sm:h-[72px] flex items-center justify-between px-4 bg-dark-blue sticky top-0 z-20 backdrop-blur-sm">
        <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight">
          <span className="text-accent">Up</span>Down
        </h1>
        <div className="flex items-center gap-3">
          <Link to="/notifications" className="relative p-1.5 hover:bg-primary-10 rounded-full transition">
            <FiBell size={22} />
            {pendingCount > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-danger rounded-full text-[10px] flex items-center justify-center font-bold ring-2 ring-dark-blue">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </Link>
          <Link to="/profile" className="p-0.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary-10 flex items-center justify-center overflow-hidden ring-2 ring-primary/20 hover:ring-primary transition">
              {user?.profilePic ? (
                <img src={user.profilePic} className="w-full h-full object-cover" alt="" />
              ) : (
                <span className="text-sm font-bold text-accent">{user?.fullName?.[0] || user?.username?.[0]?.toUpperCase()}</span>
              )}
            </div>
          </Link>
        </div>
      </header>

      {/* ===== Pill Tabs ===== */}
      <div className="flex bg-sidebar-bg border-b border-gray-700/50 px-4 gap-2 py-2">
        <button onClick={() => setActiveTab('chats')} className={`flex-1 py-2.5 rounded-full text-sm font-semibold tracking-wide transition-all duration-200 ${activeTab === 'chats' ? 'bg-accent text-white shadow-lg shadow-primary/20' : 'text-text-secondary hover:text-white hover:bg-gray-800'}`}>Chats</button>
        <button onClick={() => setActiveTab('groups')} className={`flex-1 py-2.5 rounded-full text-sm font-semibold tracking-wide transition-all duration-200 ${activeTab === 'groups' ? 'bg-accent text-white shadow-lg shadow-primary/20' : 'text-text-secondary hover:text-white hover:bg-gray-800'}`}>Groups</button>
      </div>

      {/* ===== Search Bar (h-12) ===== */}
      <div className="px-4 py-3 bg-sidebar-bg">
        <div className="flex items-center bg-bg-input rounded-full h-12 px-4 border border-gray-700/50 shadow-sm focus-within:border-accent focus-within:shadow-md transition">
          <FiSearch className="text-text-muted flex-shrink-0" size={18} />
          <input type="text" placeholder="Search chats..." value={search} onChange={(e) => setSearch(e.target.value)} className="ml-3 bg-transparent outline-none flex-1 text-sm text-white placeholder-text-muted" />
          {search && <button onClick={() => setSearch('')} className="p-1 hover:bg-gray-700 rounded-full"><FiX size={16} className="text-text-muted" /></button>}
        </div>
      </div>

      {/* ===== Chat List (with skeleton / empty / content) ===== */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-1 p-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                <div className="w-14 h-14 rounded-full bg-gray-700" />
                <div className="flex-1 space-y-2.5">
                  <div className="h-4 bg-gray-700 rounded w-1/3" />
                  <div className="h-3.5 bg-gray-700 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'chats' ? (
          filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-muted px-4 text-center">
              <div className="w-24 h-24 rounded-full bg-primary-10 flex items-center justify-center mb-6">
                <FiMessageSquare size={40} className="text-primary/50" />
              </div>
              <p className="text-xl font-semibold text-white mb-2">No chats yet</p>
              <p className="text-sm mb-6">Start your first conversation</p>
              <Link to="/add-friends" className="bg-accent text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-primary-dark transition shadow-lg shadow-primary/20">Tap + to chat</Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-800/30">
              {filteredUsers.map(u => {
                const lastMsg = lastMessages[u._id];
                const unread = unreadCounts[u._id] || 0;
                return (
                  <Link key={u._id} to={`/chat/${u._id}`} className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-800/20 transition-colors active:scale-[0.99]">
                    <div className="relative flex-shrink-0">
                      <div className="w-14 h-14 rounded-full bg-primary-10 flex items-center justify-center overflow-hidden ring-2 ring-primary/10">
                        {u.profilePic ? <img src={u.profilePic} className="w-full h-full object-cover" alt="" /> : <span className="text-xl font-bold text-accent">{u.fullName?.[0] || u.username[0].toUpperCase()}</span>}
                      </div>
                      {onlineUsers.includes(u._id) && <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-success rounded-full ring-2 ring-sidebar-bg" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-semibold text-[15px] truncate">{u.fullName || u.username}</h3>
                        {lastMsg && <span className="text-xs text-text-muted ml-2 flex-shrink-0 font-medium">{formatLastMessageTime(lastMsg.createdAt)}</span>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <p className="text-[13px] text-text-secondary truncate flex-1">{lastMsg ? (lastMsg.text || (lastMsg.image ? '📷 Media' : '')) : 'No messages yet'}</p>
                        {unread > 0 && <span className="flex-shrink-0 w-5 h-5 bg-accent rounded-full text-[10px] flex items-center justify-center font-bold text-white">{unread > 99 ? '99+' : unread}</span>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )
        ) : filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted px-4 text-center">
            <div className="w-24 h-24 rounded-full bg-primary-10 flex items-center justify-center mb-6">
              <FiUsers size={40} className="text-primary/50" />
            </div>
            <p className="text-xl font-semibold text-white mb-2">No groups yet</p>
            <p className="text-sm mb-6">Create a group to chat together</p>
            <Link to="/create-group" className="bg-accent text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-primary-dark transition shadow-lg shadow-primary/20">Create Group</Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/30">
            {filteredGroups.map(g => {
              const members = Array.isArray(g.members) ? g.members : [];
              return (
                <Link key={g._id} to={`/group-chat/${g._id}`} className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-800/20 transition-colors active:scale-[0.99]">
                  <div className="w-14 h-14 rounded-full bg-primary-10 flex items-center justify-center ring-2 ring-primary/10">
                    <span className="text-xl font-bold text-accent">{g.name?.[0]?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[15px] truncate">{g.name}</h3>
                    <p className="text-[13px] text-text-secondary mt-1">{members.length} members</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== Expandable FAB ===== */}
      <div className="absolute bottom-6 right-6 flex flex-col-reverse items-end gap-3 z-10">
        {fabOpen && (
          <>
            <Link to="/create-group" className="flex items-center gap-2 bg-surface border border-border-light rounded-full px-4 py-2.5 shadow-2 hover:scale-105 active:scale-95 transition-all animate-fade-in">
              <FiUsers size={18} /><span className="text-sm font-medium">New Group</span>
            </Link>
            <Link to="/add-friends" className="flex items-center gap-2 bg-surface border border-border-light rounded-full px-4 py-2.5 shadow-2 hover:scale-105 active:scale-95 transition-all animate-fade-in">
              <FiPlus size={18} /><span className="text-sm font-medium">New Chat</span>
            </Link>
          </>
        )}
        <button onClick={() => setFabOpen(!fabOpen)} className={`w-14 h-14 rounded-full flex items-center justify-center shadow-3 transition-all duration-300 ${fabOpen ? 'bg-gray-700 rotate-45' : 'bg-accent text-white'}`}>
          <FiPlus size={26} />
        </button>
      </div>
    </div>
  );
};

export default Homepage;
