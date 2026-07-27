import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiArrowLeft, FiSettings, FiUser, FiMail, FiCalendar, FiMapPin, FiGlobe } from 'react-icons/fi';
import Avatar from '../components/Avatar';

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)]">
      <header className="flex items-center gap-4 px-4 py-3 bg-[var(--color-surface)] border-b border-[var(--color-border)] sticky top-0 z-10">
        <Link to="/" className="text-[var(--color-text-primary)] hover:text-[var(--color-primary-action)]">
          <FiArrowLeft size={22} />
        </Link>
        <h2 className="font-semibold text-lg">Profile</h2>
        <div className="flex-1" />
        <Link to="/settings" className="text-[var(--color-text-primary)] hover:text-[var(--color-primary-action)]">
          <FiSettings size={20} />
        </Link>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Profile Card */}
        <div className="bg-[var(--color-surface)] rounded-[20px] border border-[var(--color-border)] p-6 text-center">
          <Avatar src={user?.profilePic} name={user?.fullName || user?.username} size={96} className="mx-auto mb-4" />
          <h2 className="text-xl font-bold">{user?.fullName || user?.username}</h2>
          <p className="text-[var(--color-text-secondary)]">@{user?.username}</p>
          <div className="flex items-center justify-center gap-2 mt-1 text-sm text-[var(--color-text-secondary)]">
            <FiMail size={14} />
            <span>{user?.email}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: 'Friends', value: user?.friends?.length || 0 },
            { label: 'Posts', value: '0' },
            { label: 'Likes', value: '0' },
          ].map((stat, i) => (
            <div key={i} className="bg-[var(--color-surface)] rounded-[16px] border border-[var(--color-border)] p-4 text-center">
              <div className="text-xl font-bold">{stat.value}</div>
              <div className="text-xs text-[var(--color-text-secondary)] mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          <Link to="/edit-profile" className="flex-1 bg-[var(--color-primary)] text-white text-center py-3 rounded-[16px] font-medium hover:bg-[#1E293B] transition-colors">
            Edit Profile
          </Link>
          <Link to="/settings" className="flex-1 border border-[var(--color-border)] text-center py-3 rounded-[16px] font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Settings
          </Link>
        </div>

        {/* Info */}
        <div className="bg-[var(--color-surface)] rounded-[20px] border border-[var(--color-border)] mt-4 divide-y divide-[var(--color-border)]">
          {[
            { icon: FiUser, label: 'Username', value: `@${user?.username}` },
            { icon: FiMail, label: 'Email', value: user?.email },
            { icon: FiCalendar, label: 'Joined', value: new Date(user?.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) },
            { icon: FiGlobe, label: 'Language', value: 'English' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <item.icon size={18} className="text-[var(--color-text-secondary)]" />
              <span className="text-sm text-[var(--color-text-secondary)]">{item.label}</span>
              <span className="flex-1 text-sm text-right">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
