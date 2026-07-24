import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiArrowLeft, FiSettings } from 'react-icons/fi';

const ProfilePage = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-chat-bg text-white">
      <header className="flex items-center gap-4 px-4 py-3 bg-dark-blue border-b border-gray-700">
        <Link to="/" className="text-white hover:text-light-blue">
          <FiArrowLeft size={22} />
        </Link>
        <h2 className="font-semibold text-lg">Profile</h2>
      </header>

      <div className="flex flex-col items-center pt-10 pb-6 px-4">
        <div className="w-28 h-28 rounded-full bg-light-blue flex items-center justify-center text-4xl font-bold mb-4 overflow-hidden">
          {user?.profilePic ? (
            <img src={user.profilePic} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            user?.username?.[0]?.toUpperCase()
          )}
        </div>
        <h3 className="text-2xl font-semibold">{user?.username}</h3>
        <p className="text-gray-400 mt-1">{user?.email}</p>
      </div>

      <div className="px-4 mt-4">
        <Link
          to="/settings"
          className="flex items-center gap-4 bg-sidebar-bg hover:bg-gray-700 p-4 rounded-xl transition-colors"
        >
          <FiSettings size={20} className="text-light-blue" />
          <span className="text-white">Settings</span>
        </Link>
      </div>
    </div>
  );
};

export default ProfilePage;
