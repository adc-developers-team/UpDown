import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  FiArrowLeft, FiUser, FiLock, FiEye, FiMessageCircle,
  FiPhone, FiBell, FiMoon, FiHardDrive, FiShield,
  FiMonitor, FiDownload, FiHelpCircle, FiInfo,
  FiLogOut, FiChevronRight, FiToggleLeft, FiToggleRight
} from 'react-icons/fi';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
      navigate('/login');
    }
  };

  const sections = [
    {
      title: 'Profile',
      items: [
        { icon: FiUser, label: 'Edit Profile', to: '/edit-profile', color: 'text-blue-500' },
        { icon: FiEye, label: 'Privacy', to: '/privacy', color: 'text-purple-500' },
      ]
    },
    {
      title: 'Account',
      items: [
        { icon: FiLock, label: 'Change Password', to: '/change-password', color: 'text-orange-500' },
        { icon: FiShield, label: 'Security', to: '/security', color: 'text-green-500' },
      ]
    },
    {
      title: 'Preferences',
      items: [
        { icon: FiBell, label: 'Notifications', color: 'text-yellow-500', toggle: true, value: notifications, onChange: () => setNotifications(!notifications) },
        { icon: FiMessageCircle, label: 'Read Receipts', color: 'text-blue-500', toggle: true, value: readReceipts, onChange: () => setReadReceipts(!readReceipts) },
        { icon: FiMoon, label: 'Dark Mode', color: 'text-indigo-500', toggle: true, value: dark, onChange: toggle },
      ]
    },
    {
      title: 'Data',
      items: [
        { icon: FiHardDrive, label: 'Storage & Data', to: '/storage', color: 'text-cyan-500' },
        { icon: FiDownload, label: 'Install App', color: 'text-green-500', action: () => { /* PWA install logic */ } },
      ]
    },
    {
      title: 'Support',
      items: [
        { icon: FiHelpCircle, label: 'Help & Support', to: '/support', color: 'text-blue-500' },
        { icon: FiInfo, label: 'About', to: '/about', color: 'text-gray-500' },
      ]
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)]">
      <header className="flex items-center gap-4 px-4 py-3 bg-[var(--color-surface)] border-b border-[var(--color-border)] sticky top-0 z-10">
        <Link to="/" className="text-[var(--color-text-primary)] hover:text-[var(--color-primary-action)]">
          <FiArrowLeft size={22} />
        </Link>
        <h2 className="font-semibold text-lg">Settings</h2>
      </header>

      <div className="px-4 py-6 space-y-8 max-w-2xl mx-auto">
        {sections.map((section, i) => (
          <div key={i}>
            <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3 px-1">
              {section.title}
            </h3>
            <div className="bg-[var(--color-surface)] rounded-[20px] border border-[var(--color-border)] overflow-hidden divide-y divide-[var(--color-border)]">
              {section.items.map((item, j) => (
                item.to ? (
                  <Link key={j} to={item.to} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <item.icon className={`${item.color} flex-shrink-0`} size={20} />
                    <span className="flex-1 text-sm">{item.label}</span>
                    <FiChevronRight size={18} className="text-gray-400" />
                  </Link>
                ) : item.toggle ? (
                  <div key={j} className="flex items-center gap-3 px-4 py-3.5">
                    <item.icon className={`${item.color} flex-shrink-0`} size={20} />
                    <span className="flex-1 text-sm">{item.label}</span>
                    <button onClick={item.onChange} className="focus:outline-none">
                      {item.value ? (
                        <FiToggleRight size={28} className="text-[var(--color-primary-action)]" />
                      ) : (
                        <FiToggleLeft size={28} className="text-gray-300" />
                      )}
                    </button>
                  </div>
                ) : item.action ? (
                  <button key={j} onClick={item.action} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <item.icon className={`${item.color} flex-shrink-0`} size={20} />
                    <span className="flex-1 text-sm text-left">{item.label}</span>
                    <FiChevronRight size={18} className="text-gray-400" />
                  </button>
                ) : null
              ))}
            </div>
          </div>
        ))}

        {/* Logout */}
        <div className="bg-[var(--color-surface)] rounded-[20px] border border-[var(--color-border)] overflow-hidden">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
          >
            <FiLogOut size={20} />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>

        <p className="text-center text-xs text-[var(--color-text-secondary)] pb-8">
          UpDown v1.0.0 · Build 2026
        </p>
      </div>
    </div>
  );
}
