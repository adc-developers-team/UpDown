import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  FiArrowLeft, FiEdit, FiMoreHorizontal, FiUser, FiMail, FiMapPin,
  FiLink, FiCalendar, FiGrid, FiFileText, FiHeart, FiUsers, FiBookmark,
  FiPhone, FiVideo, FiMessageSquare, FiUserPlus, FiUserCheck, FiUserX,
  FiShield, FiAward, FiStar, FiGlobe, FiImage, FiCamera
} from 'react-icons/fi';
import BottomNav from '../components/BottomNav';

const tabs = ['Posts', 'Media', 'Friends', 'Groups', 'About'];

const ProfilePage = () => {
  const { user, token, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Posts');
  const [tabData, setTabData] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [friendStatus, setFriendStatus] = useState('none'); // none, pending, friend
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [coverPhoto, setCoverPhoto] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');
  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const config = { headers: { Authorization: `Bearer ${token}` } };
  const profileId = user?._id; // owner's own profile; extendable to view other profiles

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (profile) fetchTabData();
  }, [activeTab, profile]);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`https://updown-hms5.onrender.com/api/auth/users`, config);
      const me = res.data.find(u => u._id === profileId);
      if (me) {
        setProfile(me);
        setIsOwner(true);
        setCoverPhoto(me.coverPhoto || '');
        setProfilePic(me.profilePic || '');
        setDisplayName(me.fullName || '');
        setBio(me.bio || '');
        setWebsite(me.website || '');
        setLocation(me.location || '');
      }
      // Determine friend status if viewing another profile (not implemented yet)
    } catch (err) { setError('Failed to load profile'); } finally { setLoading(false); }
  };

  const fetchTabData = async () => {
    setTabData([]);
    try {
      switch (activeTab) {
        case 'Posts': {
          const res = await axios.get(`https://updown-hms5.onrender.com/api/posts`, config);
          setTabData(res.data.filter(p => p.author?._id === profileId));
          break;
        }
        case 'Media': {
          // Fetch media messages (images/videos) where sender is profileId
          const res = await axios.get(`https://updown-hms5.onrender.com/api/messages/last-messages/${profileId}`, config);
          const media = Array.isArray(res.data) ? res.data.filter(m => m.image && !m.image.match(/\.(mp3|wav|ogg)$/)) : [];
          setTabData(media);
          break;
        }
        case 'Friends': {
          const res = await axios.get(`https://updown-hms5.onrender.com/api/friends`, config);
          setTabData(res.data || []);
          break;
        }
        case 'Groups': {
          const res = await axios.get(`https://updown-hms5.onrender.com/api/groups`, config);
          setTabData(res.data || []);
          break;
        }
        case 'About': {
          setTabData([]); // show about info, not list
          break;
        }
        default: break;
      }
    } catch (e) { setTabData([]); }
  };

  const handleSaveProfile = async () => {
    try {
      const payload = { fullName: displayName, bio, website, location, profilePic, coverPhoto };
      await axios.put('https://updown-hms5.onrender.com/api/auth/profile', payload, config);
      setProfile(prev => ({ ...prev, ...payload }));
      updateUser(payload);
      setShowEditModal(false);
    } catch (err) { alert('Failed to save'); }
  };

  const handleImageUpload = (e, setter) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result;
      try {
        const res = await axios.post('https://updown-hms5.onrender.com/api/upload/profile-pic', { image: base64 }, config);
        setter(res.data.profilePic);
        updateUser({ profilePic: res.data.profilePic });
      } catch (err) { alert('Upload failed'); }
    };
    reader.readAsDataURL(file);
  };

  const handleCoverUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCoverPhoto(ev.target.result);
      // Optionally upload cover photo via API
    };
    reader.readAsDataURL(file);
  };

  const handleFriendAction = async () => { /* implement friend request logic */ };

  if (loading) return (
    <div className="min-h-screen bg-chat-bg">
      <SkeletonProfile />
      <BottomNav />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-chat-bg flex flex-col items-center justify-center text-white pb-20">
      <p className="text-text-secondary mb-4">{error}</p>
      <button onClick={() => window.location.reload()} className="bg-primary text-white px-4 py-2 rounded-full">Retry</button>
      <BottomNav />
    </div>
  );

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-chat-bg text-primary pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 h-16 flex items-center justify-between px-4 bg-surface border-b border-border-light">
        <Link to="/" className="text-primary hover:text-primary-dark"><FiArrowLeft size={22} /></Link>
        <h2 className="font-semibold text-lg">{profile.fullName || profile.username}</h2>
        <div className="flex gap-2">
          {isOwner ? (
            <button onClick={() => setShowEditModal(true)} className="p-2 hover:bg-bg-input rounded-full"><FiEdit size={20} /></button>
          ) : (
            <button onClick={() => setShowMoreMenu(!showMoreMenu)} className="p-2 hover:bg-bg-input rounded-full"><FiMoreHorizontal size={20} /></button>
          )}
        </div>
      </header>

      {/* Cover Photo */}
      <div className="relative h-48 bg-gradient-to-r from-primary-dark to-primary rounded-b-2xl overflow-hidden">
        {coverPhoto ? <img src={coverPhoto} alt="" className="w-full h-full object-cover" /> : null}
        {isOwner && (
          <button onClick={() => coverInputRef.current.click()} className="absolute bottom-3 right-3 bg-black/40 p-2 rounded-full text-white">
            <FiCamera size={18} />
          </button>
        )}
        <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={handleCoverUpload} />
      </div>

      {/* Avatar */}
      <div className="flex justify-center -mt-14 relative">
        <div className="w-28 h-28 rounded-full border-4 border-surface bg-primary/10 overflow-hidden relative">
          {profilePic ? <img src={profilePic} alt="" className="w-full h-full object-cover" /> : <span className="text-4xl font-bold text-primary flex items-center justify-center h-full">{profile.fullName?.[0]?.toUpperCase()}</span>}
          {isOwner && (
            <button onClick={() => fileInputRef.current.click()} className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition">
              <FiCamera size={24} className="text-white" />
            </button>
          )}
        </div>
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setProfilePic)} />
        {profile.online && <span className="absolute bottom-2 right-2 w-4 h-4 bg-success rounded-full border-2 border-surface" />}
      </div>

      {/* Profile Info */}
      <div className="text-center mt-3 px-4">
        <h1 className="text-2xl font-bold">{profile.fullName || profile.username}</h1>
        <p className="text-text-secondary">@{profile.username}</p>
        {profile.bio && <p className="text-sm mt-2 max-w-md mx-auto">{profile.bio}</p>}
        <div className="flex items-center justify-center gap-3 mt-2 text-sm text-text-secondary">
          {profile.location && <span className="flex items-center gap-1"><FiMapPin size={14} /> {profile.location}</span>}
          {profile.website && <a href={profile.website} target="_blank" className="flex items-center gap-1 text-primary"><FiLink size={14} /> Website</a>}
          <span className="flex items-center gap-1"><FiCalendar size={14} /> Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Statistics */}
      <div className="flex justify-around px-4 mt-4 text-center">
        <div><p className="font-bold text-lg">{profile.postsCount || 0}</p><p className="text-xs text-text-secondary">Posts</p></div>
        <div><p className="font-bold text-lg">{profile.friendsCount || 0}</p><p className="text-xs text-text-secondary">Friends</p></div>
        <div><p className="font-bold text-lg">{profile.followersCount || 0}</p><p className="text-xs text-text-secondary">Followers</p></div>
        <div><p className="font-bold text-lg">{profile.groupsCount || 0}</p><p className="text-xs text-text-secondary">Groups</p></div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-3 mt-4 px-4">
        {isOwner ? (
          <button onClick={() => setShowEditModal(true)} className="flex-1 py-2.5 bg-primary text-white rounded-full font-medium">Edit Profile</button>
        ) : (
          <>
            <button className="flex-1 py-2.5 bg-primary text-white rounded-full font-medium">Message</button>
            <button className="p-2.5 bg-surface border border-border-light rounded-full"><FiPhone size={18} /></button>
            <button className="p-2.5 bg-surface border border-border-light rounded-full"><FiVideo size={18} /></button>
            <button onClick={handleFriendAction} className="p-2.5 bg-surface border border-border-light rounded-full">
              {friendStatus === 'friend' ? <FiUserCheck size={18} /> : <FiUserPlus size={18} />}
            </button>
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-6 border-b border-border-light overflow-x-auto">
        <div className="flex px-4 gap-4 min-w-max">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-primary'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'Posts' && <PostList posts={tabData} />}
        {activeTab === 'Media' && <MediaGrid media={tabData} />}
        {activeTab === 'Friends' && <FriendsList friends={tabData} />}
        {activeTab === 'Groups' && <GroupList groups={tabData} />}
        {activeTab === 'About' && (
          <div className="space-y-2 text-sm">
            <p><strong>Email:</strong> {profile.email}</p>
            <p><strong>Joined:</strong> {new Date(profile.createdAt).toLocaleDateString()}</p>
            {profile.bio && <p><strong>Bio:</strong> {profile.bio}</p>}
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end animate-fade-in">
          <div className="bg-surface w-full rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Edit Profile</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Display Name" value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full bg-bg-input px-4 py-3 rounded-xl outline-none border border-border-light" />
              <textarea placeholder="Bio" value={bio} onChange={e => setBio(e.target.value)} rows={3} className="w-full bg-bg-input px-4 py-3 rounded-xl outline-none border border-border-light resize-none" />
              <input type="url" placeholder="Website" value={website} onChange={e => setWebsite(e.target.value)} className="w-full bg-bg-input px-4 py-3 rounded-xl outline-none border border-border-light" />
              <input type="text" placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} className="w-full bg-bg-input px-4 py-3 rounded-xl outline-none border border-border-light" />
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowEditModal(false)} className="flex-1 py-3 bg-bg-input rounded-full font-medium">Cancel</button>
                <button onClick={handleSaveProfile} className="flex-1 py-3 bg-primary text-white rounded-full font-medium">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

/* ---------- Sub-components ---------- */
const PostList = ({ posts }) => (
  <div className="space-y-3">
    {posts.length === 0 ? <p className="text-text-muted text-center py-10">No posts yet</p> : posts.map(post => (
      <div key={post._id} className="bg-surface rounded-2xl p-4 border border-border-light">
        <p className="text-sm">{post.text}</p>
        {post.image && <img src={post.image} className="rounded-xl mt-2 max-w-full" alt="" />}
        <div className="flex items-center gap-4 mt-3 text-sm text-text-secondary">
          <span>❤️ {post.likes?.length || 0}</span>
          <span>💬 {post.comments?.length || 0}</span>
        </div>
      </div>
    ))}
  </div>
);

const MediaGrid = ({ media }) => (
  <div className="grid grid-cols-3 gap-2">
    {media.length === 0 ? <p className="text-text-muted text-center py-10 col-span-3">No media</p> : media.map(m => (
      <img key={m._id} src={m.image} className="rounded-xl aspect-square object-cover cursor-pointer" onClick={() => window.open(m.image)} alt="" />
    ))}
  </div>
);

const FriendsList = ({ friends }) => (
  <div className="space-y-2">
    {friends.length === 0 ? <p className="text-text-muted text-center py-10">No friends</p> : friends.map(f => (
      <Link key={f._id} to={`/chat/${f._id}`} className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-border-light">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
          {f.profilePic ? <img src={f.profilePic} alt="" className="w-full h-full object-cover" /> : <span className="font-bold text-primary">{f.fullName?.[0]}</span>}
        </div>
        <div className="flex-1"><p className="font-medium text-sm">{f.fullName || f.username}</p><p className="text-xs text-text-secondary">@{f.username}</p></div>
      </Link>
    ))}
  </div>
);

const GroupList = ({ groups }) => (
  <div className="space-y-2">
    {groups.length === 0 ? <p className="text-text-muted text-center py-10">No groups</p> : groups.map(g => (
      <Link key={g._id} to={`/group-chat/${g._id}`} className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-border-light">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">{g.name?.[0]}</div>
        <div className="flex-1"><p className="font-medium text-sm">{g.name}</p><p className="text-xs text-text-secondary">{g.members?.length || 0} members</p></div>
      </Link>
    ))}
  </div>
);

const SkeletonProfile = () => (
  <div className="animate-pulse space-y-4 p-4">
    <div className="h-48 bg-gray-300 dark:bg-gray-600 rounded-b-2xl" />
    <div className="flex justify-center -mt-14"><div className="w-28 h-28 rounded-full bg-gray-300 dark:bg-gray-600 border-4 border-white" /></div>
    <div className="space-y-2 mt-4">
      <div className="h-6 bg-gray-300 dark:bg-gray-600 w-1/3 mx-auto rounded" />
      <div className="h-4 bg-gray-300 dark:bg-gray-600 w-1/4 mx-auto rounded" />
      <div className="h-4 bg-gray-300 dark:bg-gray-600 w-2/3 mx-auto rounded mt-2" />
    </div>
    <div className="flex justify-around mt-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-10 w-10 bg-gray-300 dark:bg-gray-600 rounded-full" />)}
    </div>
  </div>
);

export default ProfilePage;
