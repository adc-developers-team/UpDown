import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiUsers, FiGlobe, FiPhone, FiSettings } from 'react-icons/fi';

const BottomNav = () => {
  const location = useLocation();
  const path = location.pathname;

  const tabs = [
    { to: '/', icon: FiHome, label: 'Home' },
    { to: '/add-friends', icon: FiUsers, label: 'Friends' },
    { to: '/community', icon: FiGlobe, label: 'Community' },
    { to: '/calls', icon: FiPhone, label: 'Calls' },
    { to: '/settings', icon: FiSettings, label: 'Settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border-light safe-area-inset-bottom z-30">
      <div className="flex items-center justify-around h-16 max-w-2xl mx-auto">
        {tabs.map(tab => {
          const active = path === tab.to || (tab.to === '/' && path.startsWith('/chat')) || (tab.to === '/add-friends' && path.startsWith('/add-friends'));
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 transition-colors ${
                active ? 'text-primary' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <tab.icon size={22} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
