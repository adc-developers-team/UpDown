import { FiMoreHorizontal } from 'react-icons/fi';
import VerifiedBadge from '../shared/VerifiedBadge';
import PrivacyBadge from '../shared/PrivacyBadge';
const formatTime = (d) => { const diff = Date.now() - new Date(d).getTime(); const mins = Math.floor(diff/60000); if(mins<1) return 'Just now'; if(mins<60) return `${mins}m ago`; const hrs = Math.floor(mins/60); if(hrs<24) return `${hrs}h ago`; return `${Math.floor(hrs/24)}d ago`; };
const PostHeader = ({ post, onUserTap, onMenuToggle }) => {
  const author = post.author || {};
  return (
    <div className="flex items-center gap-3 mb-3">
      <button onClick={() => onUserTap(author._id)} className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
          {author.profilePic ? <img src={author.profilePic} className="w-full h-full object-cover" alt="" /> : <span className="text-lg font-bold text-primary">{author.fullName?.[0] || author.username?.[0]?.toUpperCase()}</span>}
        </div>
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5"><span className="font-semibold text-sm truncate">{author.fullName || author.username}</span>{author.isVerified && <VerifiedBadge type="blue" />}</div>
        <div className="flex items-center gap-2 text-xs text-text-secondary"><span>@{author.username}</span><span>·</span><span>{formatTime(post.createdAt)}</span><span>·</span><PrivacyBadge privacy={post.privacy} /></div>
      </div>
      <button onClick={onMenuToggle} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-text-muted"><FiMoreHorizontal size={18} /></button>
    </div>
  );
};
export default PostHeader;
