import { FiGlobe, FiUsers, FiLock, FiEyeOff } from 'react-icons/fi';
const privacyOptions = {
  public: { icon: FiGlobe, label: 'Public' },
  friends: { icon: FiUsers, label: 'Friends' },
  followers: { icon: FiUsers, label: 'Followers' },
  private: { icon: FiLock, label: 'Private' },
  custom: { icon: FiEyeOff, label: 'Custom' },
};
const PrivacyBadge = ({ privacy = 'public' }) => {
  const opt = privacyOptions[privacy] || privacyOptions.public;
  const Icon = opt.icon;
  return <span className="inline-flex items-center gap-0.5 text-text-muted" title={opt.label}><Icon size={12} /><span className="text-xs">{opt.label}</span></span>;
};
export default PrivacyBadge;
