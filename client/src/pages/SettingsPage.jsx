import { useState, useEffect } from 'react';
  FiMonitor, FiXCircle,
import { Link, useNavigate } from 'react-router-dom';
  FiMonitor, FiXCircle,
import { useAuth } from '../context/AuthContext';
  FiMonitor, FiXCircle,
import { usePWA } from '../hooks/usePWA';
  FiMonitor, FiXCircle,
import { useTheme } from '../context/ThemeContext';
  FiMonitor, FiXCircle,
import axios from 'axios';
import {
  FiMonitor, FiXCircle,
  FiArrowLeft, FiEdit, FiLogOut, FiUser, FiMail, FiDownload,
  FiMoon, FiSun, FiShield, FiInfo, FiSmartphone,
  FiTrash2, FiAlertTriangle, FiDatabase, FiToggleRight,
  FiLock, FiUnlock
} from 'react-icons/fi';

const SettingsPage = () => {
  const { user, logout, updateUser } = useAuth();
  const { isInstallable, installApp } = usePWA();
  const { dark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const [privacy, setPrivacy] = useState({ showLastSeen: true, showOnlineStatus: true, sendReadReceipts: true });
  const [autoDownload, setAutoDownload] = useState(true);
  const [showAccount, setShowAccount] = useState(true);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [showSessions, setShowSessions] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);

  useEffect(() => {
    if (user?.privacy) setPrivacy(user.privacy);
    if (user?.chatSettings) setAutoDownload(user.chatSettings.autoDownloadMedia);
    fetchBlockedUsers();
    fetchSessions();
  }, [user]);

  const fetchBlockedUsers = async () => {
  const fetchSessions = async () => {
    try {
      const { data } = await axios.get('https://updown-hms5.onrender.com/api/auth/sessions', config);
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) { setSessions([]); }
  };

  const handleRemoveSession = async (sessionId) => {
    try {
      await axios.delete(, config);
      setSessions(prev => prev.filter(s => s._id !== sessionId));
    } catch (err) { alert('Failed to remove session'); }
  };
    try {
      const { data } = await axios.get('https://updown-hms5.onrender.com/api/auth/blocked', config);
      setBlockedUsers(Array.isArray(data) ? data : []);
    } catch (err) { setBlockedUsers([]); }
  };

  const handlePrivacyToggle = async (key, value) => {
    const newPrivacy = { ...privacy, [key]: value };
    setPrivacy(newPrivacy);
    try {
      await axios.put('https://updown-hms5.onrender.com/api/auth/privacy', newPrivacy, config);
      updateUser({ privacy: newPrivacy });
    } catch (err) { console.error(err); }
  };

  const handleAutoDownloadToggle = async (value) => {
    setAutoDownload(value);
    try {
      await axios.put('https://updown-hms5.onrender.com/api/auth/chat-settings', { autoDownloadMedia: value }, config);
      updateUser({ chatSettings: { autoDownloadMedia: value } });
    } catch (err) { console.error(err); }
  };

  const handleClearHistory = async () => {
    if (!confirm('Are you sure? This action cannot be undone.')) return;
    try {
      await axios.delete('https://updown-hms5.onrender.com/api/auth/chat-history', config);
      alert('Chat history cleared');
    } catch (err) { alert('Failed to clear history'); }
  };

  const handleDeactivate = async () => {
    if (!confirm('Deactivate your account? You can login again to reactivate.')) return;
    try {
      await axios.put('https://updown-hms5.onrender.com/api/auth/deactivate', {}, config);
      logout(); navigate('/login');
    } catch (err) { alert('Failed to deactivate'); }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('PERMANENTLY DELETE your account? All data will be lost forever!')) return;
    try {
      await axios.delete('https://updown-hms5.onrender.com/api/auth/account', config);
      logout(); navigate('/login');
    } catch (err) { alert('Failed to delete account'); }
  };

  const handleExportData = async () => {
    try {
      const res = await axios.get('https://updown-hms5.onrender.com/api/auth/export-data', config);
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'updown_data.json'; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { alert('Failed to export data'); }
  };

  const handleUnblock = async (userId) => {
    try {
      await axios.put(`https://updown-hms5.onrender.com/api/auth/unblock/${userId}`, {}, config);
      setBlockedUsers(prev => prev.filter(u => u._id !== userId));
    } catch (err) { alert('Failed to unblock'); }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-chat-bg text-white">
      <header className="flex items-center gap-4 px-4 py-4 bg-dark-blue border-b border-gray-700">
        <Link to="/profile" className="text-white hover:text-accent"><FiArrowLeft size={22} /></Link>
        <h2 className="font-semibold text-lg">Settings</h2>
      </header>

      <div className="px-4 py-6 space-y-6 max-w-2xl mx-auto">
        {/* Profile Card */}
        <div className="bg-sidebar-bg rounded-2xl p-5 flex items-center gap-4 border border-gray-700">
          <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden">
            {user?.profilePic ? <img src={user.profilePic} className="w-full h-full object-cover" alt="" /> : <span className="text-2xl font-bold text-accent">{user?.fullName?.[0] || user?.username?.[0]?.toUpperCase()}</span>}
          </div>
          <div className="flex-1"><h3 className="font-semibold text-lg">{user?.fullName || user?.username}</h3><p className="text-text-secondary text-sm"><FiMail size={14} className="inline" /> {user?.email}</p><p className="text-text-secondary text-sm"><FiUser size={14} className="inline" /> @{user?.username}</p></div>
          <Link to="/edit-profile" className="text-accent p-2 hover:bg-accent/10 rounded-full"><FiEdit size={18} /></Link>
        </div>

        {/* Theme Toggle */}
        <ToggleRow icon={dark ? <FiMoon size={20} /> : <FiSun size={20} />} title="Appearance" subtitle={dark ? 'Dark mode' : 'Light mode'} checked={dark} onChange={toggleTheme} />

        {/* Active Sessions */}
        <CollapsibleSection title="Active Sessions" icon={<FiMonitor size={20} className="text-accent" />} show={showSessions} setShow={setShowSessions}>
          {sessions.length === 0 ? (
            <p className="text-sm text-text-muted py-2">No active sessions</p>
          ) : (
            sessions.map((session, i) => (
              <div key={session._id || i} className="flex items-center gap-3 p-3 bg-bg-input rounded-xl">
                <div className="flex-1">
                  <p className="text-sm font-medium">{session.device?.substring(0, 30) || 'Unknown Device'}</p>
                  <p className="text-xs text-text-muted">IP: {session.ip} • {new Date(session.lastActive).toLocaleString()}</p>
                </div>
                <button onClick={() => handleRemoveSession(session._id)} className="text-red-400 hover:text-red-300 p-1"><FiXCircle size={16} /></button>
              </div>
            ))
          )}
        </CollapsibleSection>
        {isInstallable && (
          <button onClick={installApp} className="w-full flex items-center gap-4 bg-accent hover:bg-accent-hover text-black font-semibold p-5 rounded-2xl transition-all"><FiDownload size={20} /> Install UpDown App</button>
        )}

        {/* Account Section */}
        <CollapsibleSection title="Account" icon={<FiUser size={20} className="text-accent" />} show={showAccount} setShow={setShowAccount}>
          <Link to="/edit-profile" className="block p-3 bg-bg-input rounded-xl text-sm hover:bg-gray-700">Edit Profile</Link>
          <button onClick={handleDeactivate} className="w-full text-left p-3 bg-bg-input rounded-xl text-sm hover:bg-gray-700 text-yellow-400">Deactivate Account</button>
        </CollapsibleSection>

        {/* Privacy Section */}
        <CollapsibleSection title="Privacy" icon={<FiShield size={20} className="text-accent" />} show={showPrivacy} setShow={setShowPrivacy}>
          <Toggle label="Show Last Seen" checked={privacy.showLastSeen} onChange={(v) => handlePrivacyToggle('showLastSeen', v)} />
          <Toggle label="Show Online Status" checked={privacy.showOnlineStatus} onChange={(v) => handlePrivacyToggle('showOnlineStatus', v)} />
          <Toggle label="Send Read Receipts" checked={privacy.sendReadReceipts} onChange={(v) => handlePrivacyToggle('sendReadReceipts', v)} />
        </CollapsibleSection>

        {/* Chat Section */}
        <CollapsibleSection title="Chat" icon={<FiSmartphone size={20} className="text-accent" />} show={showChat} setShow={setShowChat}>
          <Toggle label="Auto-download media" checked={autoDownload} onChange={handleAutoDownloadToggle} />
          <button onClick={handleClearHistory} className="w-full text-left p-3 bg-bg-input rounded-xl text-sm hover:bg-gray-700 text-red-400">Clear Chat History</button>
        </CollapsibleSection>

        {/* Blocked Users Section */}
        <CollapsibleSection title="Blocked Users" icon={<FiLock size={20} className="text-accent" />} show={showBlocked} setShow={setShowBlocked}>
          {blockedUsers.length === 0 ? (
            <p className="text-sm text-text-muted py-2">No blocked users</p>
          ) : (
            blockedUsers.map(u => (
              <div key={u._id} className="flex items-center gap-3 p-2 bg-bg-input rounded-xl">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden">
                  {u.profilePic ? <img src={u.profilePic} className="w-full h-full object-cover" alt="" /> : <span className="text-xs font-bold text-accent">{u.fullName?.[0] || u.username?.[0]?.toUpperCase()}</span>}
                </div>
                <span className="text-sm flex-1">{u.fullName || u.username}</span>
                <button onClick={() => handleUnblock(u._id)} className="text-accent text-sm hover:underline flex items-center gap-1"><FiUnlock size={14} /> Unblock</button>
              </div>
            ))
          )}
        </CollapsibleSection>

        {/* Data & Storage */}
        <CollapsibleSection title="Data & Storage" icon={<FiDatabase size={20} className="text-accent" />} show={showSecurity} setShow={setShowSecurity}>
          <button onClick={handleExportData} className="w-full text-left p-3 bg-bg-input rounded-xl text-sm hover:bg-gray-700">Export My Data</button>
          <button onClick={() => setDeleteConfirm(true)} className="w-full text-left p-3 bg-bg-input rounded-xl text-sm hover:bg-gray-700 text-red-400">Delete Account</button>
        </CollapsibleSection>

        {/* About Section */}
        <CollapsibleSection title="About" icon={<FiInfo size={20} className="text-accent" />} show={showAbout} setShow={setShowAbout}>
          <p className="text-sm text-text-secondary">UpDown Chat v1.0.0</p>
          <Link to="/terms" className="block text-sm text-accent hover:underline">Terms of Service</Link>
          <Link to="/privacy" className="block text-sm text-accent hover:underline">Privacy Policy</Link>
        </CollapsibleSection>

        <button onClick={handleLogout} className="w-full flex items-center gap-4 bg-red-600/10 hover:bg-red-600/20 border border-red-600/30 p-5 rounded-2xl transition"><FiLogOut size={20} className="text-red-400" /><span className="text-red-400 font-medium">Logout</span></button>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-sidebar-bg rounded-2xl p-6 max-w-sm w-full space-y-4">
            <FiAlertTriangle size={40} className="text-red-400 mx-auto" />
            <h2 className="text-lg font-semibold text-center">Delete Account?</h2>
            <p className="text-sm text-text-secondary text-center">This action is permanent. All your messages, friends, and data will be lost forever.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(false)} className="flex-1 py-2 bg-gray-700 rounded-full text-sm">Cancel</button>
              <button onClick={handleDeleteAccount} className="flex-1 py-2 bg-red-600 rounded-full text-sm font-semibold">Delete Forever</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CollapsibleSection = ({ title, icon, show, setShow, children }) => (
  <div className="bg-sidebar-bg rounded-2xl border border-gray-700 overflow-hidden">
    <button onClick={() => setShow(!show)} className="w-full flex items-center gap-3 p-5 hover:bg-gray-800 transition">
      {icon}<span className="flex-1 text-left font-medium">{title}</span><span className="text-sm text-text-secondary">{show ? '▲' : '▼'}</span>
    </button>
    {show && <div className="px-5 pb-4 space-y-2">{children}</div>}
  </div>
);

const Toggle = ({ label, checked, onChange }) => (
  <div className="flex items-center justify-between p-3 bg-bg-input rounded-xl">
    <span className="text-sm">{label}</span>
    <button onClick={() => onChange(!checked)} className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-gray-600'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
    </button>
  </div>
);

const ToggleRow = ({ icon, title, subtitle, checked, onChange }) => (
  <div className="bg-sidebar-bg rounded-2xl p-5 border border-gray-700 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${checked ? 'bg-yellow-400/10 text-yellow-400' : 'bg-indigo-400/10 text-indigo-400'}`}>{icon}</div>
      <div><h3 className="font-medium">{title}</h3><p className="text-sm text-text-secondary">{subtitle}</p></div>
    </div>
    <button onClick={onChange} className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-gray-600'}`}>
      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transform transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}>{checked ? <FiMoon size={12} className="text-accent" /> : <FiSun size={12} className="text-yellow-500" />}</span>
    </button>
  </div>
);

export default SettingsPage;
