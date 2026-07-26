import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { FiArrowLeft, FiUserCheck, FiUserX, FiBell } from 'react-icons/fi';
import BottomNav from '../components/BottomNav';

const NotificationsPage = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(null);
  const token = localStorage.getItem('token'); const config = { headers: { Authorization: `Bearer ${token}` } };
  const fetchRequests = async () => {
    try { const { data } = await axios.get('https://updown-hms5.onrender.com/api/friends/requests/received', config); setRequests(Array.isArray(data) ? data : []); } catch { setRequests([]); } finally { setLoading(false); }
  };
  useEffect(() => { fetchRequests(); }, []);
  const initiateAction = (requestId, action) => setConfirming({ requestId, action });
  const cancelAction = () => setConfirming(null);
  const handleConfirm = async () => {
    if (!confirming) return; const { requestId, action } = confirming;
    try { await axios.put(`https://updown-hms5.onrender.com/api/friends/request/${requestId}`, { action }, config); setRequests(prev => prev.filter(req => req._id !== requestId)); } catch (err) { alert(err.response?.data?.message || 'Action failed'); } finally { setConfirming(null); }
  };
  return (
    <div className="min-h-screen bg-chat-bg text-primary flex flex-col pb-20">
      <header className="flex items-center gap-4 px-4 py-3 bg-dark-blue border-b border-border-light sticky top-0 z-20"><Link to="/" className="text-primary hover:text-primary p-1"><FiArrowLeft size={22} /></Link><h2 className="font-semibold text-lg">Notifications</h2>{requests.length > 0 && <span className="ml-auto bg-primary text-primary text-xs font-bold px-2 py-0.5 rounded-full">{requests.length} new</span>}</header>
      <div className="flex-1 p-4 overflow-y-auto">
        {loading ? <div className="space-y-2">{[...Array(3)].map((_, i) => (<div key={i} className="flex items-center gap-4 p-3 animate-pulse"><div className="w-12 h-12 rounded-full bg-surface" /><div className="flex-1 space-y-2"><div className="h-4 bg-surface rounded w-1/3" /><div className="h-3 bg-surface rounded w-2/3" /></div></div>))}</div> : requests.length === 0 ? <div className="flex flex-col items-center justify-center h-full text-text-muted mt-20"><div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4"><FiBell size={36} className="text-primary/60" /></div><p className="text-lg font-semibold text-primary mb-1">No notifications</p><p className="text-sm text-center">You're all caught up!</p></div> : <div className="space-y-3">{requests.map(request => { const fromUser = request.from; if (!fromUser) return null; const isConfirmingThis = confirming && confirming.requestId === request._id; return (<div key={request._id} className={`flex items-center gap-4 bg-surface p-4 rounded-2xl border transition-all ${isConfirmingThis ? 'border-primary ring-1 ring-primary' : 'border-border-light hover:border-border-light'}`}><div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">{fromUser.profilePic ? <img src={fromUser.profilePic} alt="" className="w-full h-full object-cover" /> : <span className="text-lg font-bold text-primary">{fromUser.fullName?.[0] || fromUser.username?.[0]?.toUpperCase()}</span>}</div><div className="flex-1 min-w-0"><h3 className="font-semibold text-sm">{fromUser.fullName || fromUser.username}</h3><p className="text-xs text-text-secondary truncate">{fromUser.email}</p><p className="text-xs text-primary mt-0.5">wants to be your friend</p></div><div className="flex gap-2 flex-shrink-0">{isConfirmingThis ? <><button onClick={handleConfirm} className="p-2 bg-success hover:bg-green-700 rounded-full transition-colors"><FiUserCheck size={16} /></button><button onClick={cancelAction} className="p-2 bg-gray-600 hover:bg-gray-500 rounded-full transition-colors"><FiUserX size={16} /></button></> : <><button onClick={() => initiateAction(request._id, 'accept')} className="p-2 bg-success hover:bg-green-700 rounded-full transition-colors"><FiUserCheck size={16} /></button><button onClick={() => initiateAction(request._id, 'decline')} className="p-2 bg-danger hover:bg-red-700 rounded-full transition-colors"><FiUserX size={16} /></button></>}</div></div>); })}</div>}
      </div>
      <BottomNav />
    </div>
  );
};
export default NotificationsPage;
