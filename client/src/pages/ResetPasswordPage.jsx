import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import BottomNav from '../components/BottomNav';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return setMessage('Passwords do not match');
    setLoading(true);
    try {
      await axios.post('https://updown-hms5.onrender.com/api/auth/reset-password', { token, newPassword });
      setMessage('Password reset successful! Redirecting...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) { setMessage(err.response?.data?.message || 'Error resetting password'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-chat-bg text-white flex items-center justify-center p-4 pb-20 pb-20">
      <div className="w-full max-w-md bg-surface rounded-2xl shadow-2 p-8">
        <h2 className="text-2xl font-bold text-center mb-6">Reset Password</h2>
        {message && <div className={`p-3 rounded-xl mb-4 text-sm ${message.includes('success') ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>{message}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="w-full bg-bg-input rounded-xl px-4 py-3 outline-none text-white border border-border-light focus:border-primary" />
          <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full bg-bg-input rounded-xl px-4 py-3 outline-none text-white border border-border-light focus:border-primary" />
          <button type="submit" disabled={loading} className="w-full bg-primary text-white py-3 rounded-full font-semibold hover:bg-primary-dark transition">{loading ? 'Resetting...' : 'Reset Password'}</button>
        </form>
      </div>
      <BottomNav />
    </div>
  );
};
  <BottomNav />
export default ResetPasswordPage;
