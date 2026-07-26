const CommentPreview = ({ comment }) => {
  if (!comment) return null;
  return <div className="mt-2 p-2 bg-bg-input rounded-xl"><div className="flex items-start gap-2 text-sm"><span className="font-semibold text-primary">{comment.author?.fullName || comment.author?.username}</span><span className="text-text-secondary truncate">{comment.text}</span></div></div>;
};
export default CommentPreview;
