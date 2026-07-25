import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

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
      setMessage('Password reset successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error resetting password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-chat-bg p-4">
      <div className="w-full max-w-md bg-sidebar-bg rounded-2xl shadow-xl p-8">
        <h2 className="text-2xl font-bold text-white text-center mb-6">Reset Password</h2>
        {message && <div className={`p-3 rounded-lg mb-4 text-sm ${message.includes('success') ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>{message}</div>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <input type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="w-full bg-gray-800 rounded-lg px-4 py-3 outline-none text-white" />
          <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full bg-gray-800 rounded-lg px-4 py-3 outline-none text-white" />
          <button type="submit" disabled={loading} className="w-full bg-accent text-black font-semibold py-3 rounded-full transition">{loading ? 'Resetting...' : 'Reset Password'}</button>
        </form>
      </div>
    </div>
  );
};
export default ResetPasswordPage;
