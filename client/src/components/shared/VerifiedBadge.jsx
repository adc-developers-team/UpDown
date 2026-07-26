import { FiCheckCircle, FiAward, FiShield, FiCode, FiBookOpen } from 'react-icons/fi';
const badges = {
  blue: { icon: FiCheckCircle, color: 'text-blue-500', label: 'Verified' },
  gold: { icon: FiAward, color: 'text-yellow-500', label: 'Official' },
  green: { icon: FiBookOpen, color: 'text-green-500', label: 'Education' },
  purple: { icon: FiCode, color: 'text-purple-500', label: 'Developer' },
  red: { icon: FiShield, color: 'text-red-500', label: 'Moderator' },
};
const VerifiedBadge = ({ type = 'blue' }) => {
  const badge = badges[type] || badges.blue;
  const Icon = badge.icon;
  return <span className={`inline-flex items-center ${badge.color}`} title={badge.label}><Icon size={16} /></span>;
};
export default VerifiedBadge;
