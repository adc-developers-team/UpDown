import { FiStar, FiUsers, FiTrendingUp, FiClock, FiActivity } from 'react-icons/fi';
const filters = [
  { key: 'pinned', icon: FiStar, label: 'Pinned' },
  { key: 'friends', icon: FiUsers, label: 'Friends' },
  { key: 'following', icon: FiActivity, label: 'Following' },
  { key: 'recommended', icon: FiTrendingUp, label: 'Recommended' },
  { key: 'trending', icon: FiActivity, label: 'Trending' },
  { key: 'latest', icon: FiClock, label: 'Latest' },
];
const FeedFilter = ({ activeFilter, onChange }) => (
  <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-hide">
    {filters.map(f => (
      <button key={f.key} onClick={() => onChange(f.key)} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 ${activeFilter === f.key ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-surface text-text-secondary hover:text-white hover:bg-gray-800 border border-border-light'}`}>
        <f.icon size={16} />{f.label}
      </button>
    ))}
  </div>
);
export default FeedFilter;
