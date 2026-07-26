import { useState, useEffect } from 'react';
import { FiX, FiSearch } from 'react-icons/fi';
import axios from 'axios';

const ForwardModal = ({ message, onClose, onForward }) => {
  const [search, setSearch] = useState('');
  const [friends, setFriends] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };
    Promise.all([
      axios.get('https://updown-hms5.onrender.com/api/friends', config),
      axios.get('https://updown-hms5.onrender.com/api/groups', config),
    ]).then(([fRes, gRes]) => {
      setFriends(Array.isArray(fRes.data) ? fRes.data : []);
      setGroups(Array.isArray(gRes.data) ? gRes.data : []);
    }).catch(() => {
      setFriends([]); setGroups([]);
    }).finally(() => setLoading(false));
  }, []);

  const filteredFriends = friends.filter(f =>
    (f.fullName || f.username || '').toLowerCase().includes(search.toLowerCase())
  );
  const filteredGroups = groups.filter(g =>
    (g.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-sidebar-bg rounded-2xl p-4 w-full max-w-md max-h-[80vh] overflow-y-auto space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Forward Message</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-primary"><FiX size={18} /></button>
        </div>
        <div className="flex items-center bg-bg-input rounded-full px-3 py-1.5 border border-border-light">
          <FiSearch size={14} className="text-text-muted" />
          <input
            type="text"
            placeholder="Search chats or groups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ml-2 bg-transparent outline-none flex-1 text-sm text-primary placeholder-text-muted"
          />
        </div>
        {loading ? (
          <p className="text-text-muted text-sm text-center">Loading...</p>
        ) : (
          <>
            {filteredFriends.length > 0 && (
              <div>
                <p className="text-xs text-text-muted mb-1">Friends</p>
                {filteredFriends.map(f => (
                  <button key={f._id} onClick={() => onForward(f._id, 'user')} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-bg-input transition text-left">
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center"><span className="text-xs font-bold text-accent">{f.fullName?.[0] || f.username?.[0]?.toUpperCase()}</span></div>
                    <span className="text-sm">{f.fullName || f.username}</span>
                  </button>
                ))}
              </div>
            )}
            {filteredGroups.length > 0 && (
              <div>
                <p className="text-xs text-text-muted mb-1">Groups</p>
                {filteredGroups.map(g => (
                  <button key={g._id} onClick={() => onForward(g._id, 'group')} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-bg-input transition text-left">
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center"><span className="text-xs font-bold text-accent">{g.name?.[0]?.toUpperCase()}</span></div>
                    <span className="text-sm">{g.name}</span>
                  </button>
                ))}
              </div>
            )}
            {filteredFriends.length === 0 && filteredGroups.length === 0 && (
              <p className="text-text-muted text-sm text-center py-4">No results found</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
export default ForwardModal;
