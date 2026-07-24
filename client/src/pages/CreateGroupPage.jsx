import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { FiArrowLeft } from 'react-icons/fi';

const CreateGroupPage = () => {
  const { user } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [friends, setFriends] = useState([]);
  const [selected, setSelected] = useState([]);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    axios.get('import.meta.env.VITE_API_URL/api/friends', config)
      .then(res => setFriends(res.data))
      .catch(console.log);
  }, []);

  const toggleMember = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selected.length === 0) return alert('Enter group name and select members');
    try {
      const { data } = await axios.post('import.meta.env.VITE_API_URL/api/groups', {
        name: groupName,
        members: selected
      }, config);
      navigate(`/group-chat/${data._id}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create group');
    }
  };

  return (
    <div className="min-h-screen bg-chat-bg text-white">
      <header className="flex items-center gap-4 px-4 py-3 bg-dark-blue border-b border-gray-700">
        <Link to="/" className="text-white hover:text-light-blue"><FiArrowLeft size={22} /></Link>
        <h2 className="font-semibold text-lg">Create Group</h2>
      </header>
      <div className="p-4 space-y-4">
        <input
          type="text"
          placeholder="Group name"
          value={groupName}
          onChange={e => setGroupName(e.target.value)}
          className="w-full bg-gray-800 rounded-full px-4 py-2 outline-none text-white placeholder-gray-400"
        />
        <h3 className="font-medium">Select Members</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {friends.map(f => (
            <div key={f._id} onClick={() => toggleMember(f._id)} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${selected.includes(f._id) ? 'bg-light-blue/20 ring-2 ring-light-blue' : 'bg-sidebar-bg hover:bg-gray-700'}`}>
              <div className="w-10 h-10 rounded-full bg-light-blue flex items-center justify-center">{f.username[0].toUpperCase()}</div>
              <span>{f.username}</span>
            </div>
          ))}
        </div>
        <button onClick={handleCreate} className="w-full bg-light-blue py-2 rounded-full font-semibold hover:bg-blue-600 transition">
          Create Group
        </button>
      </div>
    </div>
  );
};

export default CreateGroupPage;
