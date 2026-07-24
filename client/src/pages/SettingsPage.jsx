import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiArrowLeft, FiEdit, FiLogOut } from 'react-icons/fi';

const SettingsPage = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-chat-bg text-white">
      <header className="flex items-center gap-4 px-4 py-3 bg-dark-blue border-b border-gray-700">
        <Link to="/profile" className="text-white hover:text-light-blue">
          <FiArrowLeft size={22} />
        </Link>
        <h2 className="font-semibold text-lg">Settings</h2>
      </header>

      <div className="px-4 mt-6 space-y-3">
        <Link
          to="/edit-profile"
          className="flex items-center gap-4 bg-sidebar-bg hover:bg-gray-700 p-4 rounded-xl transition-colors"
        >
          <FiEdit size={20} className="text-light-blue" />
          <span>Edit Profile</span>
        </Link>

        <button
          onClick={handleLogout}
          className="flex items-center gap-4 bg-red-600 hover:bg-red-700 w-full p-4 rounded-xl transition-colors"
        >
          <FiLogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
