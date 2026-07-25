import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePWA } from '../hooks/usePWA';
import { useTheme } from '../context/ThemeContext';
import {
  FiArrowLeft, FiEdit, FiLogOut, FiUser, FiMail, FiDownload,
  FiMoon, FiSun, FiShield, FiInfo, FiCreditCard, FiHelpCircle,
  FiToggleLeft, FiToggleRight
} from 'react-icons/fi';

const SettingsPage = () => {
  const { user, logout } = useAuth();
  const { isInstallable, installApp } = usePWA();
  const { dark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showAccount, setShowAccount] = useState(true);
  const [showSecurity, setShowSecurity] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-chat-bg text-white">
      {/* Header */}
      <header className="flex items-center gap-4 px-4 py-4 bg-dark-blue border-b border-gray-700">
        <Link to="/profile" className="text-white hover:text-accent"><FiArrowLeft size={22} /></Link>
        <h2 className="font-semibold text-lg">Settings</h2>
      </header>

      <div className="px-4 py-6 space-y-6 max-w-2xl mx-auto">
        {/* Profile Card */}
        <div className="bg-sidebar-bg rounded-2xl p-5 flex items-center gap-4 border border-gray-700">
          <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden">
            {user?.profilePic ? (
              <img src={user.profilePic} className="w-full h-full object-cover" alt="" />
            ) : (
              <span className="text-2xl font-bold text-accent">
                {user?.fullName?.[0] || user?.username?.[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{user?.fullName || user?.username}</h3>
            <p className="text-text-secondary text-sm flex items-center gap-1"><FiMail size={14} /> {user?.email}</p>
            <p className="text-text-secondary text-sm flex items-center gap-1"><FiUser size={14} /> @{user?.username}</p>
          </div>
          <Link to="/edit-profile" className="text-accent p-2 hover:bg-accent/10 rounded-full transition">
            <FiEdit size={18} />
          </Link>
        </div>

        {/* Theme Toggle */}
        <div className="bg-sidebar-bg rounded-2xl p-5 border border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${dark ? 'bg-yellow-400/10 text-yellow-400' : 'bg-indigo-400/10 text-indigo-400'}`}>
                {dark ? <FiMoon size={20} /> : <FiSun size={20} />}
              </div>
              <div>
                <h3 className="font-medium">Appearance</h3>
                <p className="text-sm text-text-secondary">{dark ? 'Dark mode' : 'Light mode'}</p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${dark ? 'bg-accent' : 'bg-gray-600'}`}
            >
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out ${dark ? 'translate-x-6' : 'translate-x-1'}`}
              >
                {dark ? <FiMoon size={12} className="text-accent" /> : <FiSun size={12} className="text-yellow-500" />}
              </span>
            </button>
          </div>
        </div>

        {/* Install PWA */}
        {isInstallable && (
          <button
            onClick={installApp}
            className="w-full flex items-center gap-4 bg-accent hover:bg-accent-hover text-black font-semibold p-5 rounded-2xl transition-all"
          >
            <FiDownload size={20} />
            <span>Install UpDown App</span>
          </button>
        )}

        {/* Account Section */}
        <div className="bg-sidebar-bg rounded-2xl border border-gray-700 overflow-hidden">
          <button
            onClick={() => setShowAccount(!showAccount)}
            className="w-full flex items-center gap-3 p-5 hover:bg-gray-800 transition"
          >
            <FiUser size={20} className="text-accent" />
            <span className="flex-1 text-left font-medium">Account</span>
            <span className="text-sm text-text-secondary">{showAccount ? '▲' : '▼'}</span>
          </button>
          {showAccount && (
            <div className="px-5 pb-4 space-y-2">
              <Link to="/edit-profile" className="block p-3 bg-bg-input rounded-xl text-sm hover:bg-gray-700 transition">
                Edit Profile
              </Link>
              <button className="w-full text-left p-3 bg-bg-input rounded-xl text-sm hover:bg-gray-700 transition text-red-400">
                Deactivate Account
              </button>
            </div>
          )}
        </div>

        {/* Security Section */}
        <div className="bg-sidebar-bg rounded-2xl border border-gray-700 overflow-hidden">
          <button
            onClick={() => setShowSecurity(!showSecurity)}
            className="w-full flex items-center gap-3 p-5 hover:bg-gray-800 transition"
          >
            <FiShield size={20} className="text-accent" />
            <span className="flex-1 text-left font-medium">Security</span>
            <span className="text-sm text-text-secondary">{showSecurity ? '▲' : '▼'}</span>
          </button>
          {showSecurity && (
            <div className="px-5 pb-4 space-y-2">
              <div className="flex items-center justify-between p-3 bg-bg-input rounded-xl">
                <span className="text-sm">Two-Factor Auth</span>
                <span className="text-xs text-text-muted">Coming soon</span>
              </div>
              <button className="w-full text-left p-3 bg-bg-input rounded-xl text-sm hover:bg-gray-700 transition">
                Change Password
              </button>
            </div>
          )}
        </div>

        {/* About Section */}
        <div className="bg-sidebar-bg rounded-2xl border border-gray-700 overflow-hidden">
          <button
            onClick={() => setShowAbout(!showAbout)}
            className="w-full flex items-center gap-3 p-5 hover:bg-gray-800 transition"
          >
            <FiInfo size={20} className="text-accent" />
            <span className="flex-1 text-left font-medium">About</span>
            <span className="text-sm text-text-secondary">{showAbout ? '▲' : '▼'}</span>
          </button>
          {showAbout && (
            <div className="px-5 pb-4 space-y-2">
              <p className="text-sm text-text-secondary">UpDown Chat v1.0.0</p>
              <p className="text-sm text-text-secondary">© 2026 UpDown Technologies</p>
              <Link to="/privacy" className="block text-sm text-accent hover:underline">Privacy Policy</Link>
              <Link to="/terms" className="block text-sm text-accent hover:underline">Terms of Service</Link>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-4 bg-red-600/10 hover:bg-red-600/20 border border-red-600/30 p-5 rounded-2xl transition"
        >
          <FiLogOut size={20} className="text-red-400" />
          <span className="text-red-400 font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};
export default SettingsPage;
