import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { FiArrowLeft, FiCamera, FiCheck, FiPlus, FiX } from 'react-icons/fi';

const CreateGroupPage = () => {
  const { user } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [groupImage, setGroupImage] = useState('');
  const [friends, setFriends] = useState([]);
  const [selected, setSelected] = useState([]);
  const [searchMember, setSearchMember] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    axios.get('https://updown-hms5.onrender.com/api/friends', config)
      .then(res => setFriends(Array.isArray(res.data) ? res.data : []))
      .catch(() => setFriends([]));
  }, []);

  const toggleMember = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleCreate = async () => {
    if (!groupName.trim()) return alert('Please enter a group name');
    if (selected.length === 0) return alert('Select at least one member');
    setCreating(true);
    try {
      const payload = { name: groupName, members: selected };
      if (groupImage.trim()) payload.profilePic = groupImage;
      const { data } = await axios.post('https://updown-hms5.onrender.com/api/groups', payload, config);
      navigate(`/group-chat/${data._id}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const filteredFriends = friends.filter(f => {
    const name = (f.fullName || f.username || '').toLowerCase();
    const keyword = searchMember.toLowerCase();
    return name.includes(keyword);
  });

  return (
    <div className="min-h-screen bg-chat-bg text-white">
      {/* Header */}
      <header className="flex items-center gap-4 px-4 py-3 bg-dark-blue border-b border-gray-700 sticky top-0 z-20">
        <Link to="/" className="text-white hover:text-accent p-1">
          <FiArrowLeft size={22} />
        </Link>
        <h2 className="font-semibold text-lg">Create Group</h2>
      </header>

      <div className="p-4 space-y-6 max-w-lg mx-auto">
        {/* Group Name & Image */}
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="relative group cursor-pointer">
              <div className="w-24 h-24 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-600 group-hover:border-accent transition">
                {groupImage ? (
                  <img src={groupImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <FiCamera size={28} className="mx-auto text-text-muted group-hover:text-accent transition" />
                    <span className="text-xs text-text-muted mt-1 block">Add photo</span>
                  </div>
                )}
              </div>
              <input
                type="text"
                placeholder="Image URL (optional)"
                value={groupImage}
                onChange={e => setGroupImage(e.target.value)}
                className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-48 bg-bg-input text-xs text-white rounded-lg px-2 py-1 outline-none border border-gray-700 focus:border-accent text-center"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Group Name</label>
            <input
              type="text"
              placeholder="Enter group name"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              className="w-full bg-bg-input rounded-xl px-4 py-3 outline-none text-white border border-gray-700 focus:border-accent transition placeholder-text-muted"
            />
          </div>
        </div>

        {/* Member Selection */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Add Members ({selected.length} selected)
          </label>
          <div className="bg-bg-input rounded-xl px-3 py-2 border border-gray-700 mb-3">
            <input
              type="text"
              placeholder="Search friends..."
              value={searchMember}
              onChange={e => setSearchMember(e.target.value)}
              className="w-full bg-transparent outline-none text-sm text-white placeholder-text-muted"
            />
          </div>

          <div className="space-y-1 max-h-64 overflow-y-auto">
            {filteredFriends.length === 0 ? (
              <p className="text-text-muted text-sm text-center py-4">No friends found</p>
            ) : (
              filteredFriends.map(f => (
                <button
                  key={f._id}
                  onClick={() => toggleMember(f._id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border ${
                    selected.includes(f._id)
                      ? 'bg-accent/10 border-accent'
                      : 'bg-sidebar-bg border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {f.profilePic ? (
                      <img src={f.profilePic} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-accent">
                        {f.fullName?.[0] || f.username?.[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate">{f.fullName || f.username}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    selected.includes(f._id)
                      ? 'bg-accent border-accent'
                      : 'border-gray-500'
                  }`}>
                    {selected.includes(f._id) && <FiCheck size={12} className="text-black" />}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Create Button */}
        <button
          onClick={handleCreate}
          disabled={creating || !groupName.trim() || selected.length === 0}
          className={`w-full py-3 rounded-full font-semibold transition-all ${
            groupName.trim() && selected.length > 0
              ? 'bg-accent text-black hover:bg-accent-hover'
              : 'bg-gray-700 text-text-muted cursor-not-allowed'
          }`}
        >
          {creating ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creating...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <FiPlus size={18} />
              Create Group
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default CreateGroupPage;
