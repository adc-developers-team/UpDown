import { useState } from 'react';
import { FiX } from 'react-icons/fi';
const REASONS = ['spam','fake_news','harassment','hate_speech','violence','adult_content','scam','copyright','other'];
const ReportSheet = ({ postId, onClose, onReport }) => {
  const [selected, setSelected] = useState('');
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-surface rounded-t-3xl p-6 w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold">Report Post</h3><button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><FiX size={20} /></button></div>
        <div className="space-y-2">
          {REASONS.map(r => <button key={r} onClick={() => setSelected(r)} className={`w-full text-left p-3 rounded-xl border transition ${selected===r?'border-primary bg-primary/5 text-primary':'border-border-light hover:border-gray-400'}`}>{r.replace(/_/g,' ')}</button>)}
        </div>
        <button onClick={() => onReport(postId, selected)} disabled={!selected} className="w-full mt-4 bg-danger text-white py-3 rounded-full font-semibold disabled:opacity-50">Submit Report</button>
      </div>
    </div>
  );
};
export default ReportSheet;
