import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePWA } from '../hooks/usePWA';
import { FiArrowLeft, FiEdit, FiLogOut, FiUser, FiMail, FiDownload } from 'react-icons/fi';

const SettingsPage = () => {
  const { user, logout } = useAuth();
  const { isInstallable, installApp } = usePWA();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-chat-bg text-white">
      <header className="flex items-center gap-4 px-4 py-3 bg-dark-blue border-b border-gray-700">
        <Link to="/profile" className="text-white hover:text-light-blue"><FiArrowLeft size={22} /></Link>
        <h2 className="font-semibold text-lg">Settings</h2>
      </header>

      <div className="px-4 py-6 space-y-4">
        {/* User Info Card */}
        <div className="bg-sidebar-bg rounded-xl p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-light-blue overflow-hidden flex items-center justify-center">
            {user?.profilePic ? <img src={user.profilePic} className="w-full h-full object-cover" alt="" /> : <span className="text-xl font-semibold">{user?.fullName?.[0] || user?.username?.[0]?.toUpperCase()}</span>}
          </div>
          <div>
            <h3 className="font-semibold text-lg">{user?.fullName || user?.username}</h3>
            <p className="text-gray-400 text-sm flex items-center gap-1"><FiMail size={14} /> {user?.email}</p>
            <p className="text-gray-400 text-sm flex items-center gap-1"><FiUser size={14} /> @{user?.username}</p>
          </div>
        </div>

        {/* Install Button (only if not installed) */}
        {isInstallable && (
          <button
            onClick={installApp}
            className="flex items-center gap-4 bg-light-blue hover:bg-blue-600 w-full p-4 rounded-xl transition-colors"
          >
            <FiDownload size={20} />
            <span>Install UpDown</span>
          </button>
        )}

        <Link to="/edit-profile" className="flex items-center gap-4 bg-sidebar-bg hover:bg-gray-700 p-4 rounded-xl transition-colors">
          <FiEdit size={20} className="text-light-blue" /><span>Edit Profile</span>
        </Link>

        <button onClick={handleLogout} className="flex items-center gap-4 bg-red-600 hover:bg-red-700 w-full p-4 rounded-xl transition-colors">
          <FiLogOut size={20} /><span>Logout</span>
        </button>
      </div>
    </div>
  );
};
export default SettingsPage;
