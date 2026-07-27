import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiArrowLeft, FiCamera } from 'react-icons/fi';
import axios from 'axios';
import Button from '../components/Button';
import Input from '../components/Input';
import Avatar from '../components/Avatar';

export default function EditProfilePage() {
  const { user, updateUser } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
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
      const result = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const token = localStorage.getItem('token');
      const { data } = await axios.post(
        'https://updown-hms5.onrender.com/api/upload/profile-pic',
        { image: result },
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
      const { data } = await axios.put(
        'https://updown-hms5.onrender.com/api/auth/profile',
        { fullName, username, profilePic, bio },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      updateUser(data);
      navigate('/profile');
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)]">
      <header className="flex items-center gap-4 px-4 py-3 bg-[var(--color-surface)] border-b border-[var(--color-border)] sticky top-0 z-10">
        <Link to="/settings" className="text-[var(--color-text-primary)] hover:text-[var(--color-primary-action)]">
          <FiArrowLeft size={22} />
        </Link>
        <h2 className="font-semibold text-lg">Edit Profile</h2>
      </header>

      <form onSubmit={handleSubmit} className="px-4 py-8 space-y-6 max-w-md mx-auto">
        {/* Avatar */}
        <div className="flex justify-center relative group cursor-pointer" onClick={() => fileInputRef.current.click()}>
          <Avatar src={profilePic} name={fullName || username} size={96} className="ring-2 ring-[var(--color-border)]" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
            <div className="bg-black/40 rounded-full p-2">
              <FiCamera size={24} className="text-white" />
            </div>
          </div>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        </div>
        {uploading && <p className="text-center text-sm text-[var(--color-text-secondary)]">Uploading...</p>}

        <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" />
        <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="john_doe" />
        <div>
          <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell people about yourself..."
            maxLength={250}
            rows={3}
            className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-[16px] px-4 py-3 outline-none focus:ring-2 ring-[var(--color-primary-action)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] resize-none"
          />
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">{bio.length}/250</p>
        </div>

        <Button type="submit" loading={loading} className="w-full">
          Save Changes
        </Button>
      </form>
    </div>
  );
}
