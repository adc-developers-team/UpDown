import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiArrowLeft, FiCamera } from 'react-icons/fi';
import axios from 'axios';

const EditProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [profilePic, setProfilePic] = useState(user?.profilePic || '');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      setUploading(true);
      try {
        const token = localStorage.getItem('token');
        const { data } = await axios.post(
          'import.meta.env.VITE_API_URL/api/upload/profile-pic',
          { image: reader.result },
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
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) return alert('Username cannot be empty');
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.put(
        'import.meta.env.VITE_API_URL/api/auth/profile',
        { username, profilePic },
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
    <div className="min-h-screen bg-chat-bg text-white">
      <header className="flex items-center gap-4 px-4 py-3 bg-dark-blue border-b border-gray-700">
        <Link to="/settings" className="text-white hover:text-light-blue">
          <FiArrowLeft size={22} />
        </Link>
        <h2 className="font-semibold text-lg">Edit Profile</h2>
      </header>

      <form onSubmit={handleSubmit} className="px-4 py-8 space-y-6 max-w-md mx-auto">
        {/* Avatar with camera overlay */}
        <div className="flex justify-center relative group cursor-pointer" onClick={() => fileInputRef.current.click()}>
          <div className="w-24 h-24 rounded-full bg-light-blue flex items-center justify-center text-3xl font-bold overflow-hidden relative">
            {profilePic ? (
              <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              username[0]?.toUpperCase() || '?'
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
              <FiCamera size={24} />
            </div>
          </div>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
        {uploading && <p className="text-center text-sm text-gray-400">Uploading...</p>}

        <div>
          <label className="block text-sm text-gray-400 mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-gray-800 rounded-lg px-4 py-3 outline-none focus:ring-2 ring-light-blue"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-light-blue hover:bg-blue-600 text-white font-semibold py-3 rounded-full transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
};

export default EditProfilePage;
