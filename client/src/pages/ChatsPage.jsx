import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import axios from 'axios';
import {
  FiSearch, FiBell, FiPlus, FiUsers, FiMessageSquare,
  FiX, FiRefreshCw, FiWifiOff
} from 'react-icons/fi';
import BottomNav from '../components/BottomNav';

const API = 'https://updown-hms5.onrender.com';

const formatLastMessageTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
  }
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
};

const ChatsPage = () => {
  const { user } = useAuth();
  const { setUsers, users, onlineUsers } = useChat();
  const [search, setSearch] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastMessages, setLastMessages] = useState({});
  const [activeTab, setActiveTab] = useState('chats');
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
        axios.get(`${API}/api/friends`, config),
        axios.get(`${API}/api/groups`, config),
      ]);
      setUsers(Array.isArray(friendsRes.data) ? friendsRes.data : []);
      setGroups(Array.isArray(groupsRes.data) ? groupsRes.data : []);
    } catch {
      setUsers([]);
      setGroups([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?._id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Pending friend requests
  useEffect(() => {
    const fetchPending = async () => {
      try {
        const { data } = await axios.get(`${API}/api/friends/requests/received`, config);
        setPendingCount(Array.isArray(data) ? data.length : 0);
      } catch {
        setPendingCount(0);
      }
    };
    fetchPending();
    const interval = setInterval(fetchPending, 15000);
    return () => clearInterval(interval);
  }, []);

  // Last messages + unread counts
  useEffect(() => {
    const fetchMessageData = async () => {
      try {
        const [lastRes, unreadRes] = await Promise.all([
          axios.get(`\( {API}/api/messages/last-messages/ \){user._id}`, config),
          axios.get(`\( {API}/api/messages/unread-counts/ \){user._id}`, config),
        ]);

        const map = {};
        if (Array.isArray(lastRes.data)) {
          lastRes.data.forEach((msg) => {
            const ids = msg.conversationId?.split('_') || [];
            const other = ids.find((id) => id !== user._id);
            if (other) map[other] = msg;
          });
        }
        setLastMessages(map);
        setUnreadCounts(unreadRes.data || {});
      } catch {
        // silent
      }
    };

    if (user?._id) {
      fetchMessageData();
      const interval = setInterval(fetchMessageData, 8000);
      return () => clearInterval(interval);
    }
  }, [user?._id]);

  // Online / Offline detection
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
  const safeGroups = Array.isArray(groups) ? groups : [];

  // Filter + Sort chats by latest message
  const filteredUsers = safeUsers
    .filter((u) => {
      const name = (u.fullName || u.username || '').toLowerCase();
      return name.includes(search.toLowerCase());
    })
    .sort((a, b) => {
      const timeA = lastMessages[a._id]?.createdAt
        ? new Date(lastMessages[a._id].createdAt).getTime()
        : 0;
      const timeB = lastMessages[b._id]?.createdAt
        ? new Date(lastMessages[b._id].createdAt).getTime()
        : 0;
      return timeB - timeA;
    });

  const filteredGroups = safeGroups.filter((g) => {
    const name = (g.name || '').toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const onlineCount = safeUsers.filter((u) => onlineUsers.includes(u._id)).length;

  return (
    <div className="h-screen flex flex-col bg-chat-bg text-primary w-full pb-16">
      {/* Offline Banner */}
      {isOffline && (
        <div className="bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs text-center py-2 flex items-center justify-center gap-2">
          <FiWifiOff size={14} />
          You are offline. Messages will sync when connected.
        </div>
      )}

      {/* Header */}
      <header className="h-16 sm:h-[72px] flex items-center justify-between px-4 bg-surface border-b border-border-light sticky top-0 z-20">
        <div>
          <h1 className="text-xl sm:text-[22px] font-bold tracking-tight">
            <span className="text-primary">Up</span>Down
          </h1>
          <p className="text-[11px] text-text-secondary leading-tight mt-0.5">
            {onlineCount > 0 ? `${onlineCount} friends online` : 'No friends online'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            title="Refresh"
          >
            <FiRefreshCw
              size={20}
              className={`text-text-secondary ${refreshing ? 'animate-spin' : ''}`}
            />
          </button>

          <Link
            to="/notifications"
            className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <FiBell size={20} className="text-text-secondary" />
            {pendingCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-danger rounded-full text-[10px] flex items-center justify-center font-bold text-white">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </Link>

          <Link to="/profile" className="ml-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden ring-2 ring-primary/20 hover:ring-primary/40 transition">
              {user?.profilePic ? (
                <img src={user.profilePic} className="w-full h-full object-cover" alt="" />
              ) : (
                <span className="text-sm font-bold text-primary">
                  {user?.fullName?.[0] || user?.username?.[0]?.toUpperCase()}
                </span>
              )}
            </div>
          </Link>
        </div>
      </header>

      {/* Search */}
      <div className="px-4 py-3 bg-surface border-b border-border-light">
        <div className="flex items-center bg-bg-input rounded-full h-11 px-4 border border-border-light focus-within:border-primary transition">
          <FiSearch className="text-text-muted flex-shrink-0" size={18} />
          <input
            type="text"
            placeholder="Search chats, groups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ml-3 bg-transparent outline-none flex-1 text-sm text-primary placeholder-text-muted"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
            >
              <FiX size={16} className="text-text-muted" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-surface border-b border-border-light px-4 gap-2 py-2">
        <button
          onClick={() => setActiveTab('chats')}
          className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all ${
            activeTab === 'chats'
              ? 'bg-primary text-white shadow-md'
              : 'text-text-secondary hover:text-primary hover:bg-bg-input'
          }`}
        >
          Chats
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all ${
            activeTab === 'groups'
              ? 'bg-primary text-white shadow-md'
              : 'text-text-secondary hover:text-primary hover:bg-bg-input'
          }`}
        >
          Groups
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-1 p-3">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 animate-pulse">
                <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 space-y-2.5">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                  <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'chats' ? (
          filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-muted px-6 text-center py-16">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5">
                <FiMessageSquare size={36} className="text-primary/50" />
              </div>
              <p className="text-lg font-semibold text-primary mb-1">No chats yet</p>
              <p className="text-sm mb-6">Start your first conversation</p>
              <Link
                to="/add-friends"
                className="bg-primary text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-primary-dark transition shadow-md"
              >
                Find Friends
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border-light">
              {filteredUsers.map((u) => {
                const lastMsg = lastMessages[u._id];
                const unread = unreadCounts[u._id] || 0;
                const isOnline = onlineUsers.includes(u._id);

                return (
                  <Link
                    key={u._id}
                    to={`/chat/${u._id}`}
                    className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-bg-input/40 active:bg-bg-input/60 transition-colors"
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        {u.profilePic ? (
                          <img
                            src={u.profilePic}
                            className="w-full h-full object-cover"
                            alt=""
                          />
                        ) : (
                          <span className="text-xl font-bold text-primary">
                            {u.fullName?.[0] || u.username?.[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      {isOnline && (
                        <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-surface rounded-full" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-2">
                        <h3 className="font-semibold text-[15px] truncate">
                          {u.fullName || u.username}
                        </h3>
                        {lastMsg && (
                          <span className="text-xs text-text-muted flex-shrink-0 font-medium">
                            {formatLastMessageTime(lastMsg.createdAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[13px] text-text-secondary truncate flex-1">
                          {lastMsg
                            ? lastMsg.text || (lastMsg.image ? 'Media' : 'Attachment')
                            : 'No messages yet'}
                        </p>
                        {unread > 0 && (
                          <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 bg-primary rounded-full text-[11px] flex items-center justify-center font-bold text-white">
                            {unread > 99 ? '99+' : unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )
        ) : filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted px-6 text-center py-16">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5">
              <FiUsers size={36} className="text-primary/50" />
            </div>
            <p className="text-lg font-semibold text-primary mb-1">No groups yet</p>
            <p className="text-sm mb-6">Create a group to chat together</p>
            <Link
              to="/create-group"
              className="bg-primary text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-primary-dark transition shadow-md"
            >
              Create Group
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border-light">
            {filteredGroups.map((g) => {
              const members = Array.isArray(g.members) ? g.members : [];
              return (
                <Link
                  key={g._id}
                  to={`/group-chat/${g._id}`}
                  className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-bg-input/40 active:bg-bg-input/60 transition-colors"
                >
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl font-bold text-primary">
                      {g.name?.[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[15px] truncate">{g.name}</h3>
                    <p className="text-[13px] text-text-secondary mt-1">
                      {members.length} member{members.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <Link
        to={activeTab === 'groups' ? '/create-group' : '/add-friends'}
        className="absolute bottom-20 right-5 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all z-10"
        title={activeTab === 'groups' ? 'Create Group' : 'New Chat'}
      >
        <FiPlus size={26} />
      </Link>

      <BottomNav />
    </div>
  );
};

export default ChatsPage;
