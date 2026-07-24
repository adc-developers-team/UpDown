import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import axios from 'axios';
import { FiSearch, FiBell, FiPlus, FiUsers } from 'react-icons/fi';

const formatLastMessageTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString), now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return 'Just now';
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    return weekdays[date.getDay()];
  }
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

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    const fetchData = async () => {
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
      } catch (err) { /* silent */ }
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
      <header className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 bg-dark-blue border-b border-gray-700">
        <h1 className="text-lg sm:text-xl font-bold">UpDown</h1>
        <div className="flex items-center gap-3 sm:gap-5">
          <Link to="/notifications" className="relative text-xl sm:text-2xl hover:text-light-blue">
            <FiBell strokeWidth={2} />
            {pendingCount > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-red-500 rounded-full border-2 border-dark-blue"></span>}
          </Link>
          <Link to="/profile" className="flex items-center gap-1 sm:gap-2">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden bg-light-blue flex items-center justify-center">
              {user?.profilePic ? <img src={user.profilePic} className="w-full h-full object-cover" /> : <span className="text-sm sm:text-base font-semibold">{user?.fullName?.[0] || user?.username?.[0]?.toUpperCase()}</span>}
            </div>
            <span className="hidden sm:inline text-xs sm:text-sm">{user?.fullName || user?.username}</span>
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex bg-sidebar-bg border-b border-gray-700 text-sm sm:text-base">
        <button onClick={() => setActiveTab('chats')} className={`flex-1 py-2 font-medium ${activeTab === 'chats' ? 'border-b-2 border-light-blue text-light-blue' : 'text-gray-400'}`}>Chats</button>
        <button onClick={() => setActiveTab('groups')} className={`flex-1 py-2 font-medium ${activeTab === 'groups' ? 'border-b-2 border-light-blue text-light-blue' : 'text-gray-400'}`}>Groups</button>
      </div>

      {/* Search */}
      <div className="px-3 sm:px-4 py-2 bg-sidebar-bg">
        <div className="flex items-center bg-gray-800 rounded-full px-3 py-1.5 sm:px-4 sm:py-2">
          <FiSearch className="text-gray-400 text-sm sm:text-base" />
          <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="ml-2 bg-transparent outline-none flex-1 text-xs sm:text-sm text-white placeholder-gray-400" />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'chats' && filteredUsers.map(u => {
          const lastMsg = lastMessages[u._id];
          const unread = unreadCounts[u._id] || 0;
          return (
            <Link key={u._id} to={`/chat/${u._id}`} className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-gray-800 border-b border-gray-800/50">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-light-blue overflow-hidden flex items-center justify-center">
                  {u.profilePic ? <img src={u.profilePic} className="w-full h-full object-cover" /> : <span className="text-sm sm:text-lg font-semibold">{u.fullName?.[0] || u.username[0].toUpperCase()}</span>}
                </div>
                {onlineUsers.includes(u._id) && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-sidebar-bg" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <h3 className="font-medium truncate text-sm sm:text-base">{u.fullName || u.username}</h3>
                  {lastMsg && <span className="text-xs text-gray-400 ml-2">{formatLastMessageTime(lastMsg.createdAt)}</span>}
                </div>
                <div className="flex items-center gap-1">
                  <p className="text-xs sm:text-sm text-gray-400 truncate flex-1">{lastMsg ? (lastMsg.text || (lastMsg.image ? '📷 Image' : '🎤 Audio')) : 'No messages yet'}</p>
                  {unread > 0 && <span className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 bg-green-500 rounded-full text-xs flex items-center justify-center font-bold">{unread}</span>}
                </div>
              </div>
            </Link>
          );
        })}

        {activeTab === 'groups' && filteredGroups.map(g => (
          <Link key={g._id} to={`/group-chat/${g._id}`} className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-gray-800 border-b border-gray-800/50">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-light-blue flex items-center justify-center text-sm sm:text-lg font-semibold">{g.name?.[0]?.toUpperCase()}</div>
            <div className="flex-1">
              <h3 className="font-medium text-sm sm:text-base">{g.name}</h3>
              <p className="text-xs sm:text-sm text-gray-400">{g.members?.length || 0} members</p>
            </div>
          </Link>
        ))}

        {activeTab === 'chats' && filteredUsers.length === 0 && <div className="text-center text-gray-500 mt-10 text-sm">No chats found</div>}
        {activeTab === 'groups' && filteredGroups.length === 0 && <div className="text-center text-gray-500 mt-10 text-sm">No groups found</div>}
      </div>

      {/* Floating Buttons */}
      <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 flex flex-col gap-2 sm:gap-3">
        <Link to="/add-friends" className="w-10 h-10 sm:w-12 sm:h-12 bg-light-blue rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition"><FiPlus size={20} /></Link>
        <Link to="/create-group" className="w-10 h-10 sm:w-12 sm:h-12 bg-light-blue rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition"><FiUsers size={20} /></Link>
      </div>
    </div>
  );
};

export default Homepage;
