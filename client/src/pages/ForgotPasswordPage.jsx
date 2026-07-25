import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post('https://updown-hms5.onrender.com/api/auth/forgot-password', { email });
      setMessage(res.data.message);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-chat-bg p-4">
      <div className="w-full max-w-md bg-sidebar-bg rounded-2xl shadow-xl p-8">
        <h2 className="text-2xl font-bold text-white text-center mb-6">Forgot Password</h2>
        {message && <div className={`p-3 rounded-lg mb-4 text-sm ${message.includes('sent') ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>{message}</div>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <input type="email" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-gray-800 rounded-lg px-4 py-3 outline-none text-white" />
          <button type="submit" disabled={loading} className="w-full bg-accent text-black font-semibold py-3 rounded-full transition">{loading ? 'Sending...' : 'Send Reset Link'}</button>
        </form>
        <p className="text-gray-400 text-center mt-4">
          <Link to="/login" className="text-accent hover:underline">Back to Login</Link>
        </p>
      </div>
    </div>
  );
};
export default ForgotPasswordPage;
