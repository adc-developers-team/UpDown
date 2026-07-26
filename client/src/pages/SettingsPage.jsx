import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePWA } from '../hooks/usePWA';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import {
  FiEdit, FiLogOut, FiUser, FiMail, FiDownload,
  FiMoon, FiSun, FiShield, FiInfo, FiSmartphone,
  FiTrash2, FiAlertTriangle, FiDatabase,
  FiMonitor, FiXCircle, FiLock, FiUnlock,
  FiBell, FiGlobe, FiCpu, FiHelpCircle, FiStar, FiPhone
} from 'react-icons/fi';
import BottomNav from '../components/BottomNav';

const SettingsPage = () => {
  const { user, logout, updateUser } = useAuth();
  const { isInstallable, installApp } = usePWA();
  const { dark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const [privacy, setPrivacy] = useState({ showLastSeen: true, showOnlineStatus: true, sendReadReceipts: true });
  const [autoDownload, setAutoDownload] = useState(true);
  const [showAccount, setShowAccount] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showCalls, setShowCalls] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    if (user?.privacy) setPrivacy(user.privacy);
    if (user?.chatSettings) setAutoDownload(user.chatSettings.autoDownloadMedia);
    fetchBlockedUsers();
    fetchSessions();
  }, [user]);

  const fetchBlockedUsers = async () => {
    try {
      const { data } = await axios.get('https://updown-hms5.onrender.com/api/auth/blocked', config);
      setBlockedUsers(Array.isArray(data) ? data : []);
    } catch (err) { setBlockedUsers([]); }
  };

  const fetchSessions = async () => {
    try {
      const { data } = await axios.get('https://updown-hms5.onrender.com/api/auth/sessions', config);
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) { setSessions([]); }
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
    if (!confirm('Clear all chat history? This cannot be undone.')) return;
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

  const handleRemoveSession = async (sessionId) => {
    try {
      await axios.delete(`https://updown-hms5.onrender.com/api/auth/sessions/${sessionId}`, config);
      setSessions(prev => prev.filter(s => s._id !== sessionId));
    } catch (err) { alert('Failed to remove session'); }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-chat-bg text-white pb-20">
      <header className="h-16 sm:h-[72px] flex items-center px-4 bg-dark-blue border-b border-border-light sticky top-0 z-20">
        <h2 className="font-semibold text-lg">Settings</h2>
      </header>

      <div className="px-4 py-6 space-y-4 max-w-2xl mx-auto">
        <Link to="/edit-profile" className="block bg-surface rounded-2xl p-4 flex items-center gap-4 border border-border-light shadow-1 hover:border-primary/30 transition group">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden ring-2 ring-primary/20 group-hover:ring-primary/40 transition">
            {user?.profilePic ? <img src={user.profilePic} className="w-full h-full object-cover" alt="" /> : <span className="text-xl font-bold text-primary">{user?.fullName?.[0] || user?.username?.[0]?.toUpperCase()}</span>}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-[15px]">{user?.fullName || user?.username}</h3>
            <p className="text-text-secondary text-sm">@{user?.username}</p>
            <p className="text-text-secondary text-sm">{user?.email}</p>
          </div>
          <FiEdit size={18} className="text-text-secondary group-hover:text-primary transition" />
        </Link>

        <div className="bg-surface rounded-2xl p-4 border border-border-light shadow-1 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${dark ? 'bg-yellow-400/10 text-yellow-400' : 'bg-indigo-400/10 text-indigo-400'}`}>
              {dark ? <FiMoon size={20} /> : <FiSun size={20} />}
            </div>
            <div>
              <h3 className="font-medium">Appearance</h3>
              <p className="text-sm text-text-secondary">{dark ? 'Dark Mode' : 'Light Mode'}</p>
            </div>
          </div>
          <button onClick={toggleTheme} className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${dark ? 'bg-primary' : 'bg-gray-300'}`}>
            <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transform transition-transform ${dark ? 'translate-x-6' : 'translate-x-1'}`}>
              {dark ? <FiMoon size={12} className="text-primary" /> : <FiSun size={12} className="text-yellow-500" />}
            </span>
          </button>
        </div>

        {isInstallable && (
          <button onClick={installApp} className="w-full flex items-center gap-4 bg-primary text-white font-semibold p-4 rounded-2xl hover:bg-primary-dark transition-all shadow-2"><FiDownload size={20} /> Install UpDown App</button>
        )}

        <div className="space-y-3">
          <AccordionSection title="Account" icon={<FiUser size={20} className="text-primary" />} show={showAccount} setShow={setShowAccount}>
            <Link to="/edit-profile" className="block p-3 bg-bg-input rounded-xl text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition">Edit Profile</Link>
            <button onClick={handleDeactivate} className="w-full text-left p-3 bg-bg-input rounded-xl text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition text-warning">Deactivate Account</button>
          </AccordionSection>

          <AccordionSection title="Privacy & Security" icon={<FiShield size={20} className="text-primary" />} show={showPrivacy} setShow={setShowPrivacy}>
            <Toggle label="Show Last Seen" checked={privacy.showLastSeen} onChange={(v) => handlePrivacyToggle('showLastSeen', v)} />
            <Toggle label="Show Online Status" checked={privacy.showOnlineStatus} onChange={(v) => handlePrivacyToggle('showOnlineStatus', v)} />
            <Toggle label="Send Read Receipts" checked={privacy.sendReadReceipts} onChange={(v) => handlePrivacyToggle('sendReadReceipts', v)} />
            <div className="pt-2">
              <p className="text-sm font-medium text-text-secondary mb-2">Blocked Users</p>
              {blockedUsers.length === 0 ? <p className="text-sm text-text-muted">No blocked users</p> : blockedUsers.map(u => (
                <div key={u._id} className="flex items-center gap-3 p-2 bg-bg-input rounded-xl mb-1">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">{u.profilePic ? <img src={u.profilePic} className="w-full h-full object-cover" alt="" /> : <span className="text-xs font-bold text-primary">{u.fullName?.[0] || u.username?.[0]?.toUpperCase()}</span>}</div>
                  <span className="text-sm flex-1">{u.fullName || u.username}</span>
                  <button onClick={() => handleUnblock(u._id)} className="text-primary text-sm hover:underline">Unblock</button>
                </div>
              ))}
            </div>
            <div className="pt-2">
              <p className="text-sm font-medium text-text-secondary mb-2">Active Sessions</p>
              {sessions.length === 0 ? <p className="text-sm text-text-muted">No other sessions</p> : sessions.map((session, i) => (
                <div key={session._id || i} className="flex items-center gap-3 p-3 bg-bg-input rounded-xl mb-1">
                  <div className="flex-1"><p className="text-sm font-medium">{session.device?.substring(0, 30) || 'Unknown Device'}</p><p className="text-xs text-text-muted">IP: {session.ip} · {new Date(session.lastActive).toLocaleString()}</p></div>
                  <button onClick={() => handleRemoveSession(session._id)} className="text-danger hover:text-red-400 p-1"><FiXCircle size={16} /></button>
                </div>
              ))}
            </div>
            <button onClick={() => setDeleteConfirm(true)} className="w-full text-left p-3 bg-bg-input rounded-xl text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition text-danger mt-2">Delete Account</button>
          </AccordionSection>

          <AccordionSection title="Chats" icon={<FiSmartphone size={20} className="text-primary" />} show={showChat} setShow={setShowChat}>
            <Toggle label="Auto-download media" checked={autoDownload} onChange={handleAutoDownloadToggle} />
            <button onClick={handleClearHistory} className="w-full text-left p-3 bg-bg-input rounded-xl text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition text-danger">Clear Chat History</button>
          </AccordionSection>

          <AccordionSection title="Calls" icon={<FiPhone size={20} className="text-primary" />} show={showCalls} setShow={setShowCalls}>
            <div className="space-y-2"><p className="text-sm text-text-secondary">Call quality, data saver, noise suppression</p><p className="text-xs text-text-muted">Coming soon</p></div>
          </AccordionSection>

          <AccordionSection title="Help" icon={<FiHelpCircle size={20} className="text-primary" />} show={showHelp} setShow={setShowHelp}>
            <Link to="/faq" className="block p-3 bg-bg-input rounded-xl text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition">FAQ</Link>
            <Link to="/contact" className="block p-3 bg-bg-input rounded-xl text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition">Contact Support</Link>
            <Link to="/privacy" className="block p-3 bg-bg-input rounded-xl text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition">Privacy Policy</Link>
            <Link to="/terms" className="block p-3 bg-bg-input rounded-xl text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition">Terms of Service</Link>
          </AccordionSection>

          <AccordionSection title="About" icon={<FiInfo size={20} className="text-primary" />} show={showAbout} setShow={setShowAbout}>
            <div className="space-y-1 text-sm text-text-secondary">
              <p>UpDown Chat v1.0.0</p>
              <p>Build: 2026.07.25</p>
              <a href="https://github.com/adc-developers-team/UpDown" className="text-primary underline">GitHub</a>
            </div>
          </AccordionSection>
        </div>

        <div className="pb-2">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-danger/10 hover:bg-danger/20 border border-danger/30 p-4 rounded-2xl transition text-danger font-medium"><FiLogOut size={20} /> Logout</button>
        </div>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-3">
            <FiAlertTriangle size={40} className="text-danger mx-auto" />
            <h2 className="text-lg font-semibold text-center">Delete Account?</h2>
            <p className="text-sm text-text-secondary text-center">This action is permanent. All your messages, friends, and data will be lost forever.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(false)} className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 rounded-full text-sm">Cancel</button>
              <button onClick={handleDeleteAccount} className="flex-1 py-2 bg-danger text-white rounded-full text-sm font-semibold">Delete Forever</button>
            </div>
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  );
};

const AccordionSection = ({ title, icon, show, setShow, children }) => (
  <div className="bg-surface rounded-2xl border border-border-light shadow-1 overflow-hidden">
    <button onClick={() => setShow(!show)} className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
      {icon}<span className="flex-1 text-left font-medium">{title}</span><span className={`text-sm text-text-secondary transition-transform duration-200 ${show ? 'rotate-180' : ''}`}>▼</span>
    </button>
    <div className={`transition-all duration-300 ease-in-out ${show ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}><div className="px-5 pb-4 space-y-2">{children}</div></div>
  </div>
);

const Toggle = ({ label, checked, onChange }) => (
  <div className="flex items-center justify-between p-3 bg-bg-input rounded-xl">
    <span className="text-sm">{label}</span>
    <button onClick={() => onChange(!checked)} className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
    </button>
  </div>
);

export default SettingsPage;
