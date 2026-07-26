import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import BottomNav from '../components/BottomNav';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const res = await axios.post('https://updown-hms5.onrender.com/api/auth/forgot-password', { email });
      setMessage(res.data.message);
    } catch (err) { setMessage(err.response?.data?.message || 'Something went wrong'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-chat-bg text-white flex items-center justify-center p-4 pb-20 pb-20">
      <div className="w-full max-w-md bg-surface rounded-2xl shadow-2 p-8">
        <h2 className="text-2xl font-bold text-center mb-6">Forgot Password</h2>
        {message && <div className={`p-3 rounded-xl mb-4 text-sm ${message.includes('sent') ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>{message}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-bg-input rounded-xl px-4 py-3 outline-none text-white border border-border-light focus:border-primary" />
          <button type="submit" disabled={loading} className="w-full bg-primary text-white py-3 rounded-full font-semibold hover:bg-primary-dark transition">{loading ? 'Sending...' : 'Send Reset Link'}</button>
        </form>
        <p className="text-text-secondary text-center mt-4 text-sm"><Link to="/login" className="text-primary hover:underline">Back to Login</Link></p>
      </div>
      <BottomNav />
    </div>
  );
};
  <BottomNav />
export default ForgotPasswordPage;
