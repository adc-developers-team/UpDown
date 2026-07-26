import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { FiArrowLeft, FiCamera, FiCheck, FiPlus, FiX, FiSearch, FiChevronRight, FiChevronLeft, FiUsers, FiLock, FiGlobe, FiCheckCircle, FiCopy } from 'react-icons/fi';
import BottomNav from '../components/BottomNav';

const MAX_NAME = 50; const MAX_DESC = 200;
const CreateGroupPage = () => {
  const { user } = useAuth(); const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [groupName, setGroupName] = useState(''); const [groupDesc, setGroupDesc] = useState('');
  const [groupImage, setGroupImage] = useState(''); const [privacy, setPrivacy] = useState('private');
  const [friends, setFriends] = useState([]); const [selected, setSelected] = useState([]);
  const [searchMember, setSearchMember] = useState(''); const [creating, setCreating] = useState(false);
  const [createdGroupId, setCreatedGroupId] = useState(null);
  const token = localStorage.getItem('token'); const config = { headers: { Authorization: `Bearer ${token}` } };
  useEffect(() => { axios.get('https://updown-hms5.onrender.com/api/friends', config).then(res => setFriends(Array.isArray(res.data) ? res.data : [])).catch(() => setFriends([])); }, []);
  const toggleMember = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const handleCreate = async () => {
    if (!groupName.trim()) return alert('Please enter a group name');
    if (selected.length === 0) return alert('Select at least one member');
    setCreating(true);
    try {
      const payload = { name: groupName, members: selected };
      if (groupImage.trim()) payload.profilePic = groupImage;
      if (groupDesc.trim()) payload.description = groupDesc;
      const { data } = await axios.post('https://updown-hms5.onrender.com/api/groups', payload, config);
      setCreatedGroupId(data._id); setStep(4);
    } catch (err) { alert(err.response?.data?.message || 'Failed to create group'); } finally { setCreating(false); }
  };
  const handleImageUpload = (e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setGroupImage(reader.result); reader.readAsDataURL(file); };
  const filteredFriends = friends.filter(f => (f.fullName || f.username || '').toLowerCase().includes(searchMember.toLowerCase()));
  const selectedFriends = friends.filter(f => selected.includes(f._id));
  return (
    <div className="min-h-screen bg-chat-bg text-primary pb-20">
      <header className="h-16 sm:h-[72px] flex items-center gap-4 px-4 bg-dark-blue border-b border-border-light sticky top-0 z-20">
        {step < 4 ? (<button onClick={() => step > 1 ? setStep(step - 1) : navigate('/')} className="text-primary hover:text-primary p-1"><FiArrowLeft size={22} /></button>) : <div className="w-10" />}
        <h2 className="font-semibold text-lg">{step === 1 ? 'New Group' : step === 2 ? 'Add Members' : step === 3 ? 'Group Settings' : 'Group Created'}</h2>
        {step < 3 && (<div className="ml-auto flex items-center gap-1 text-sm text-text-secondary"><span className={`w-2 h-2 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-gray-600'}`} /><span className={`w-2 h-2 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-gray-600'}`} /><span className={`w-2 h-2 rounded-full ${step >= 3 ? 'bg-primary' : 'bg-gray-600'}`} /></div>)}
      </header>
      <div className="p-4 max-w-lg mx-auto">
        {step === 1 && (<div className="space-y-6 animate-fade-in">
          <div className="flex justify-center"><label className="relative group cursor-pointer"><div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-dashed border-border-light group-hover:border-primary transition">{groupImage ? <img src={groupImage} alt="" className="w-full h-full object-cover" /> : <div className="text-center"><FiCamera size={28} className="mx-auto text-text-muted group-hover:text-primary transition" /><span className="text-xs text-text-muted mt-1 block">Add photo</span></div>}</div><input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" /></label></div>
          <div><label className="block text-sm font-medium text-text-secondary mb-1.5">Group Name <span className="text-xs text-text-muted">({groupName.length}/{MAX_NAME})</span></label><input type="text" placeholder="Enter group name" value={groupName} onChange={e => setGroupName(e.target.value.slice(0, MAX_NAME))} className="w-full bg-bg-input rounded-xl px-4 py-3 outline-none text-primary border border-border-light focus:border-primary transition" /></div>
          <div><label className="block text-sm font-medium text-text-secondary mb-1.5">Description <span className="text-xs text-text-muted">Optional ({groupDesc.length}/{MAX_DESC})</span></label><textarea placeholder="What's this group about?" value={groupDesc} onChange={e => setGroupDesc(e.target.value.slice(0, MAX_DESC))} rows={3} className="w-full bg-bg-input rounded-xl px-4 py-3 outline-none text-primary border border-border-light focus:border-primary transition resize-none" /></div>
          <div><label className="block text-sm font-medium text-text-secondary mb-2">Privacy</label><div className="space-y-2"><button onClick={() => setPrivacy('private')} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition ${privacy==='private' ? 'border-primary bg-primary/5' : 'border-border-light hover:border-border-light'}`}><FiLock size={18} className={privacy==='private' ? 'text-primary' : 'text-text-muted'} /><div className="text-left"><p className="text-sm font-medium">Private</p><p className="text-xs text-text-secondary">Only invited members can join</p></div>{privacy==='private'&&<FiCheck size={18} className="ml-auto text-primary" />}</button><button onClick={() => setPrivacy('public')} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition ${privacy==='public' ? 'border-primary bg-primary/5' : 'border-border-light hover:border-border-light'}`}><FiGlobe size={18} className={privacy==='public' ? 'text-primary' : 'text-text-muted'} /><div className="text-left"><p className="text-sm font-medium">Public</p><p className="text-xs text-text-secondary">Anyone can find and request to join</p></div>{privacy==='public'&&<FiCheck size={18} className="ml-auto text-primary" />}</button></div></div>
          <button onClick={() => setStep(2)} disabled={!groupName.trim()} className={`w-full py-3 rounded-full font-semibold transition flex items-center justify-center gap-2 ${groupName.trim() ? 'bg-primary text-primary hover:bg-primary-dark' : 'bg-surface text-text-muted cursor-not-allowed'}`}>Next <FiChevronRight size={18} /></button>
        </div>)}
        {step === 2 && (<div className="space-y-4 animate-fade-in">
          <div className="bg-bg-input rounded-xl px-3 py-2 border border-border-light flex items-center gap-2"><FiSearch size={16} className="text-text-muted" /><input type="text" placeholder="Search friends..." value={searchMember} onChange={e => setSearchMember(e.target.value)} className="w-full bg-transparent outline-none text-sm text-primary placeholder-text-muted" /></div>
          {selectedFriends.length > 0 && (<div className="flex flex-wrap gap-2 p-3 bg-surface rounded-xl border border-border-light">{selectedFriends.map(f => (<span key={f._id} className="flex items-center gap-1 bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full">{f.fullName || f.username}<button onClick={() => toggleMember(f._id)} className="hover:text-danger"><FiX size={12} /></button></span>))}</div>)}
          <div className="space-y-1 max-h-80 overflow-y-auto">{filteredFriends.length === 0 ? <p className="text-text-muted text-sm text-center py-4">No friends found</p> : filteredFriends.map(f => (<button key={f._id} onClick={() => toggleMember(f._id)} className={`w-full flex items-center gap-3 p-3 rounded-xl transition border ${selected.includes(f._id) ? 'bg-primary/5 border-primary' : 'bg-surface border-border-light hover:border-border-light'}`}><div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">{f.profilePic ? <img src={f.profilePic} alt="" className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-primary">{f.fullName?.[0] || f.username?.[0]?.toUpperCase()}</span>}</div><div className="flex-1 text-left min-w-0"><p className="text-sm font-medium truncate">{f.fullName || f.username}</p></div><div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition ${selected.includes(f._id) ? 'bg-primary border-primary' : 'border-gray-500'}`}>{selected.includes(f._id) && <FiCheck size={12} className="text-primary" />}</div></button>))}</div>
          <div className="flex gap-3"><button onClick={() => setStep(1)} className="flex-1 py-3 rounded-full font-semibold border border-border-light hover:bg-bg-input transition flex items-center justify-center gap-2"><FiChevronLeft size={18} /> Back</button><button onClick={() => setStep(3)} disabled={selected.length === 0} className={`flex-1 py-3 rounded-full font-semibold transition flex items-center justify-center gap-2 ${selected.length > 0 ? 'bg-primary text-primary hover:bg-primary-dark' : 'bg-surface text-text-muted cursor-not-allowed'}`}>Next <FiChevronRight size={18} /></button></div>
        </div>)}
        {step === 3 && (<div className="space-y-4 animate-fade-in">
          <div className="bg-surface rounded-xl border border-border-light p-4 space-y-3"><h3 className="font-medium text-sm">Group Permissions</h3><div><label className="text-xs text-text-secondary mb-1 block">Who can send messages?</label><select className="w-full bg-bg-input rounded-lg px-3 py-2 outline-none text-sm border border-border-light"><option>Everyone</option><option>Admins Only</option></select></div><div><label className="text-xs text-text-secondary mb-1 block">Who can edit group info?</label><select className="w-full bg-bg-input rounded-lg px-3 py-2 outline-none text-sm border border-border-light"><option>Admins</option><option>Everyone</option></select></div></div>
          <div className="flex gap-3"><button onClick={() => setStep(2)} className="flex-1 py-3 rounded-full font-semibold border border-border-light hover:bg-bg-input transition flex items-center justify-center gap-2"><FiChevronLeft size={18} /> Back</button><button onClick={handleCreate} disabled={creating} className="flex-1 py-3 rounded-full font-semibold bg-primary text-primary hover:bg-primary-dark transition flex items-center justify-center gap-2 disabled:opacity-50">{creating ? 'Creating...' : 'Create Group'}</button></div>
        </div>)}
        {step === 4 && (<div className="flex flex-col items-center justify-center py-16 space-y-6 animate-fade-in"><div className="w-24 h-24 rounded-full bg-success/20 flex items-center justify-center"><FiCheckCircle size={48} className="text-success" /></div><div className="text-center space-y-2"><h2 className="text-2xl font-bold">Group Created!</h2><p className="text-text-secondary">Your group is ready to use.</p></div><div className="flex gap-3 w-full max-w-xs"><button onClick={() => { navigator.clipboard.writeText(`https://updown-app.onrender.com/group-chat/${createdGroupId}`); alert('Invite link copied!'); }} className="flex-1 py-3 rounded-full font-semibold border border-border-light hover:bg-bg-input transition flex items-center justify-center gap-2"><FiCopy size={16} /> Copy Link</button><button onClick={() => navigate(`/group-chat/${createdGroupId}`)} className="flex-1 py-3 rounded-full font-semibold bg-primary text-primary hover:bg-primary-dark transition">Open Group</button></div></div>)}
      </div>
      <BottomNav />
    </div>
  );
};
export default CreateGroupPage;
