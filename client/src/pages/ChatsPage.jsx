import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import axios from 'axios';
import {
  FiSearch, FiBell, FiPlus, FiUsers, FiMessageSquare, FiX,
  FiRefreshCw, FiWifiOff, FiMoreHorizontal
} from 'react-icons/fi';
import BottomNav from '../components/BottomNav';

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

const ChatsPage = () => {
  const { user } = useAuth();
  const { setUsers, users, onlineUsers } = useChat();
  const [search, setSearch] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastMessages, setLastMessages] = useState({});
  const [activeTab, setActiveTab] = useState('all');
  const [groups, setGroups] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [refreshing, setRefreshing] = useState(false);

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const fetchData = useCallback(async () => {
    setRefreshing(true);
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
      setRefreshing(false);
    }
  }, [user._id]);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  const safeUsers = Array.isArray(users) ? users : [];
  const filteredUsers = safeUsers.filter(u => {
    if (activeTab === 'unread') return (unreadCounts[u._id] || 0) > 0;
    if (activeTab === 'groups') return false;
    return true;
  }).filter(u => {
    const name = (u.fullName || u.username || '').toLowerCase();
    const keyword = search.toLowerCase();
    return name.includes(keyword);
  });

  const safeGroups = Array.isArray(groups) ? groups : [];
  const filteredGroups = (activeTab === 'groups' ? safeGroups : []).filter(g => {
    const name = (g.name || '').toLowerCase();
    const keyword = search.toLowerCase();
    return name.includes(keyword);
  });

  const onlineCount = safeUsers.filter(u => onlineUsers.includes(u._id)).length;

  const tabs = ['all', 'unread', 'groups'];

  return (
    <div className="h-screen flex flex-col bg-chat-bg text-white w-full pb-16">
      {isOffline && (
        <div className="bg-warning/20 text-warning text-xs text-center py-1.5 flex items-center justify-center gap-2">
          <FiWifiOff size={14} /> You are offline. Messages will sync when connected.
        </div>
      )}

      {/* Header – only Chats title + search + overflow */}
      <header className="h-16 sm:h-[72px] flex items-center justify-between px-4 bg-dark-blue border-b border-border-light sticky top-0 z-20">
        <h1 className="text-xl sm:text-[22px] font-extrabold tracking-tight">
          <span className="text-primary">Up</span>Down
        </h1>
        <div className="flex items-center gap-3">
          <button className="p-1.5 hover:bg-primary/10 rounded-full transition">
            <FiSearch size={20} />
          </button>
          <button className="p-1.5 hover:bg-primary/10 rounded-full transition">
            <FiMoreHorizontal size={20} />
          </button>
        </div>
      </header>

      {/* Search Bar – expandable */}
      <div className="px-4 py-2 bg-sidebar-bg border-b border-border-light">
        <div className="flex items-center bg-bg-input rounded-full h-10 px-4 border border-border-light focus-within:border-primary transition">
          <FiSearch className="text-text-muted flex-shrink-0" size={16} />
          <input
            type="text"
            placeholder="Search chats…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ml-3 bg-transparent outline-none flex-1 text-sm text-white placeholder-text-muted"
          />
          {search && (
            <button onClick={() => setSearch('')} className="p-1 hover:bg-gray-700 rounded-full"><FiX size={14} className="text-text-muted" /></button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-sidebar-bg border-b border-border-light px-4 gap-2 py-1.5 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
              activeTab === tab ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-secondary hover:text-white hover:bg-gray-800'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'unread' && Object.values(unreadCounts).reduce((a,b)=>a+b,0) > 0 && (
              <span className="ml-1.5 bg-danger text-white text-[10px] px-1.5 rounded-full">
                {Object.values(unreadCounts).reduce((a,b)=>a+b,0)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Chat List */}
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
        ) : activeTab === 'groups' ? (
          filteredGroups.length === 0 ? (
            <EmptyState icon={<FiUsers size={40} />} title="No groups" message="Create a group to start chatting" link="/create-group" linkText="Create Group" />
          ) : (
            <ChatList groups={filteredGroups} />
          )
        ) : filteredUsers.length === 0 ? (
          <EmptyState icon={<FiMessageSquare size={40} />} title="No chats" message="Start your first conversation" link="/add-friends" linkText="Find Friends" />
        ) : (
          <ChatList users={filteredUsers} lastMessages={lastMessages} unreadCounts={unreadCounts} onlineUsers={onlineUsers} />
        )}
      </div>

      {/* Single FAB – New Chat */}
      <Link to="/add-friends" className="absolute bottom-20 right-6 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-3 hover:scale-105 active:scale-95 transition-all z-10" title="New Chat">
        <FiPlus size={26} />
      </Link>

      <BottomNav />
    </div>
  );
};

const EmptyState = ({ icon, title, message, link, linkText }) => (
  <div className="flex flex-col items-center justify-center h-full text-text-muted px-4 text-center">
    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
      {icon}
    </div>
    <p className="text-xl font-semibold text-white mb-2">{title}</p>
    <p className="text-sm mb-6">{message}</p>
    <Link to={link} className="bg-primary text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-primary-dark transition shadow-lg shadow-primary/20">{linkText}</Link>
  </div>
);

const ChatList = ({ users, groups, lastMessages, unreadCounts, onlineUsers }) => {
  if (groups) {
    return (
      <div className="divide-y divide-gray-800/30">
        {groups.map(g => (
          <Link key={g._id} to={`/group-chat/${g._id}`} className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-800/20 transition-colors active:scale-[0.99]">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/10">
              <span className="text-xl font-bold text-primary">{g.name?.[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-[15px] truncate">{g.name}</h3>
              <p className="text-[13px] text-text-secondary mt-1">{g.members?.length || 0} members</p>
            </div>
          </Link>
        ))}
      </div>
    );
  }
  return (
    <div className="divide-y divide-gray-800/30">
      {users.map(u => {
        const lastMsg = lastMessages?.[u._id];
        const unread = unreadCounts?.[u._id] || 0;
        const online = onlineUsers?.includes(u._id);
        return (
          <Link key={u._id} to={`/chat/${u._id}`} className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-800/20 transition-colors active:scale-[0.99]">
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden ring-2 ring-primary/10">
                {u.profilePic ? <img src={u.profilePic} className="w-full h-full object-cover" alt="" /> : <span className="text-xl font-bold text-primary">{u.fullName?.[0] || u.username[0].toUpperCase()}</span>}
              </div>
              {online && <span className="online-dot" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <h3 className="font-semibold text-[15px] truncate">{u.fullName || u.username}</h3>
                {lastMsg && <span className="text-xs text-text-muted ml-2 flex-shrink-0 font-medium">{formatLastMessageTime(lastMsg.createdAt)}</span>}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <p className="text-[13px] text-text-secondary truncate flex-1">{lastMsg ? (lastMsg.text || (lastMsg.image ? '📷 Media' : '')) : 'No messages yet'}</p>
                {unread > 0 && <span className="flex-shrink-0 w-5 h-5 bg-primary rounded-full text-[10px] flex items-center justify-center font-bold text-white">{unread > 99 ? '99+' : unread}</span>}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
};

export default ChatsPage;
