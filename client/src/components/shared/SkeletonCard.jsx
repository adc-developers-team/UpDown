const SkeletonCard = () => (
  <div className="bg-surface rounded-card p-4 mb-3 border border-border-light animate-pulse">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
      <div className="flex-1 space-y-2"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" /><div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" /></div>
    </div>
    <div className="space-y-2"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" /><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" /></div>
    <div className="mt-3 h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
  </div>
);
export default SkeletonCard;
