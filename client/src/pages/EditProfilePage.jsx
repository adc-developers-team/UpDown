import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { FiArrowLeft, FiCamera, FiCheck, FiLoader, FiX } from 'react-icons/fi';
import BottomNav from '../components/BottomNav';

const EditProfilePage = () => {
  const { user, updateUser, token } = useAuth();
  const navigate = useNavigate();
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [website, setWebsite] = useState(user?.website || '');
  const [location, setLocation] = useState(user?.location || '');
  const [profilePic, setProfilePic] = useState(user?.profilePic || '');
  const [coverPhoto, setCoverPhoto] = useState(user?.coverPhoto || '');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setUsername(user.username || '');
      setBio(user.bio || '');
      setWebsite(user.website || '');
      setLocation(user.location || '');
      setProfilePic(user.profilePic || '');
      setCoverPhoto(user.coverPhoto || '');
    }
  }, [user]);

  const handleImageUpload = async (file, setter) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target.result;
        const res = await axios.post(
          'https://updown-hms5.onrender.com/api/upload/profile-pic',
          { image: base64 },
          config
        );
        setter(res.data.profilePic);
        updateUser({ profilePic: res.data.profilePic });
      };
      reader.onerror = () => setError('Failed to read image');
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleCoverUpload = async (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCoverPhoto(e.target.result);
        // Optionally save cover photo via API
        updateUser({ coverPhoto: e.target.result });
      };
      reader.onerror = () => setError('Failed to read image');
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Cover upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = { fullName, username, bio, website, location, profilePic, coverPhoto };
      const res = await axios.put('https://updown-hms5.onrender.com/api/auth/profile', payload, config);
      updateUser(res.data);
      setSuccess('Profile updated successfully!');
      setTimeout(() => navigate('/profile'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-chat-bg text-primary pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 h-16 flex items-center justify-between px-4 bg-surface border-b border-border-light">
        <Link to="/profile" className="text-primary hover:text-primary-dark p-1">
          <FiArrowLeft size={22} />
        </Link>
        <h2 className="font-semibold text-lg">Edit Profile</h2>
        <button
          onClick={handleSave}
          disabled={loading}
          className="text-primary font-medium text-sm hover:text-primary-dark disabled:opacity-50 flex items-center gap-1"
        >
          {loading ? <FiLoader className="animate-spin" size={16} /> : <><FiCheck size={18} /> Save</>}
        </button>
      </header>

      {/* Messages */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-danger/10 border border-danger/20 text-danger rounded-xl text-sm flex items-center gap-2">
          <FiX size={16} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="mx-4 mt-4 p-3 bg-success/10 border border-success/20 text-success rounded-xl text-sm flex items-center gap-2">
          <FiCheck size={16} className="flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Cover Photo */}
      <div className="relative h-48 bg-gradient-to-r from-primary-dark to-primary">
        {coverPhoto && (
          <img src={coverPhoto} alt="Cover" className="w-full h-full object-cover" />
        )}
        <button
          onClick={() => coverInputRef.current?.click()}
          className="absolute bottom-3 right-3 bg-black/40 backdrop-blur p-2.5 rounded-full text-white hover:bg-black/60 transition"
        >
          <FiCamera size={18} />
        </button>
        <input
          type="file"
          ref={coverInputRef}
          className="hidden"
          accept="image/*"
          onChange={(e) => handleCoverUpload(e.target.files[0])}
        />
      </div>

      {/* Avatar */}
      <div className="flex justify-center -mt-14 relative">
        <div className="w-28 h-28 rounded-full border-4 border-surface bg-primary/10 overflow-hidden relative">
          {profilePic ? (
            <img src={profilePic} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl font-bold text-primary flex items-center justify-center h-full">
              {fullName?.[0]?.toUpperCase() || username?.[0]?.toUpperCase()}
            </span>
          )}
          <button
            onClick={() => avatarInputRef.current?.click()}
            className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition"
          >
            <FiCamera size={24} className="text-white" />
          </button>
        </div>
        <input
          type="file"
          ref={avatarInputRef}
          className="hidden"
          accept="image/*"
          onChange={(e) => handleImageUpload(e.target.files[0], setProfilePic)}
        />
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
            <FiLoader className="animate-spin text-white" size={32} />
          </div>
        )}
      </div>

      {/* Form */}
      <div className="px-4 mt-8 space-y-5 max-w-lg mx-auto">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Display Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            className="w-full bg-bg-input rounded-xl px-4 py-3 outline-none border border-border-light focus:border-primary transition text-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Username *</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="@username"
            className="w-full bg-bg-input rounded-xl px-4 py-3 outline-none border border-border-light focus:border-primary transition text-primary"
            required
          />
          <p className="text-xs text-text-muted mt-1">At least 3 characters. Used for your profile link.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 160))}
            placeholder="Tell us about yourself..."
            rows={3}
            className="w-full bg-bg-input rounded-xl px-4 py-3 outline-none border border-border-light focus:border-primary transition text-primary resize-none"
          />
          <p className="text-xs text-text-muted mt-1">{bio.length}/160</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Website</label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://yourwebsite.com"
            className="w-full bg-bg-input rounded-xl px-4 py-3 outline-none border border-border-light focus:border-primary transition text-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City, Country"
            className="w-full bg-bg-input rounded-xl px-4 py-3 outline-none border border-border-light focus:border-primary transition text-primary"
          />
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default EditProfilePage;
