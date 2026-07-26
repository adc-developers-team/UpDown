import BottomNav from '../components/BottomNav';
import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiArrowLeft, FiCamera } from 'react-icons/fi';
import axios from 'axios';

const EditProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [profilePic, setProfilePic] = useState(user?.profilePic || '');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      const result = await new Promise((res, rej) => { reader.onload = () => res(reader.result); reader.onerror = rej; reader.readAsDataURL(file); });
      const token = localStorage.getItem('token');
      const { data } = await axios.post('https://updown-hms5.onrender.com/api/upload/profile-pic', { image: result }, { headers: { Authorization: `Bearer ${token}` } });
      setProfilePic(data.profilePic);
      updateUser({ profilePic: data.profilePic });
    } catch (err) {
      alert(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) return alert('Username cannot be empty');
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.put('https://updown-hms5.onrender.com/api/auth/profile', { fullName, username, profilePic }, { headers: { Authorization: `Bearer ${token}` } });
      updateUser(data);
      navigate('/profile');
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-chat-bg text-primary pb-20 pb-20">
      <header className="flex items-center gap-4 px-4 py-3 bg-dark-blue border-b border-border-light">
        <Link to="/settings" className="text-primary hover:text-primary"><FiArrowLeft size={22} /></Link>
        <h2 className="font-semibold text-lg">Edit Profile</h2>
      </header>

      <form onSubmit={handleSubmit} className="px-4 py-8 space-y-6 max-w-md mx-auto">
        <div className="flex justify-center relative group cursor-pointer" onClick={() => fileInputRef.current.click()}>
          <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-3xl font-bold overflow-hidden relative">
            {profilePic ? <img src={profilePic} alt="" className="w-full h-full object-cover" /> : (fullName[0]?.toUpperCase() || username[0]?.toUpperCase() || '?')}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><FiCamera size={24} /></div>
          </div>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        </div>
        {uploading && <p className="text-center text-sm text-text-secondary">Uploading...</p>}

        <div>
          <label className="block text-sm text-text-secondary mb-1">Full Name</label>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-bg-input rounded-lg px-4 py-3 outline-none focus:ring-2 ring-primary" />
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-1">Username</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-bg-input rounded-lg px-4 py-3 outline-none focus:ring-2 ring-primary" />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary-dark text-primary font-semibold py-3 rounded-full transition-colors disabled:opacity-50">{loading ? 'Saving...' : 'Save Changes'}</button>
      </form>
    </div>
  );
};
    <BottomNav />
  <BottomNav />
export default EditProfilePage;
