const colors = {
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  gold: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
  green: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
};

export default function Badge({ label, color = 'blue' }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.blue}`}>{label}</span>;
}
