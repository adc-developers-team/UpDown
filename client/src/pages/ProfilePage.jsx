import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiArrowLeft, FiSettings, FiMail, FiUser, FiChevronRight } from 'react-icons/fi';
import BottomNav from '../components/BottomNav';

const ProfilePage = () => {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-chat-bg text-white pb-20">
      <header className="flex items-center gap-4 px-4 py-3 bg-dark-blue border-b border-border-light">
        <Link to="/" className="text-white hover:text-primary"><FiArrowLeft size={22} /></Link>
        <h2 className="font-semibold text-lg">Profile</h2>
      </header>
      <div className="flex flex-col items-center pt-10 pb-6 px-4">
        <div className="w-28 h-28 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center text-4xl font-bold mb-4">
          {user?.profilePic ? <img src={user.profilePic} className="w-full h-full object-cover" alt="" /> : (user?.fullName?.[0] || user?.username?.[0]?.toUpperCase())}
        </div>
        <h3 className="text-2xl font-semibold">{user?.fullName || user?.username}</h3>
        <p className="text-text-secondary mt-1 flex items-center gap-1"><FiUser size={14} /> @{user?.username}</p>
        <p className="text-text-secondary text-sm flex items-center gap-1"><FiMail size={14} /> {user?.email}</p>
      </div>
      <div className="px-4 mt-4">
        <Link to="/settings" className="flex items-center gap-4 bg-surface hover:bg-gray-700 p-4 rounded-xl transition-colors">
          <FiSettings size={20} className="text-primary" /><span>Settings</span><FiChevronRight size={16} className="ml-auto" />
        </Link>
      </div>
      <BottomNav />
    </div>
  );
};
export default ProfilePage;
