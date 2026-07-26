import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { FiEye, FiEyeOff, FiCheck, FiX, FiLoader } from 'react-icons/fi';
import BottomNav from '../components/BottomNav';

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!username || isLogin) { setUsernameAvailable(null); return; }
    setUsernameAvailable(null); setCheckingUsername(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await axios.get('https://updown-hms5.onrender.com/api/auth/check-username', { params: { username } });
        setUsernameAvailable(data.available);
      } catch { setUsernameAvailable(false); } finally { setCheckingUsername(false); }
    }, 600);
  }, [username, isLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setMessage('');
    if (!isLogin) {
      if (password !== confirmPassword) return setMessage('Passwords do not match');
      if (!usernameAvailable) return setMessage('Username is not available');
    }
    setLoading(true);
    try {
      if (isLogin) await login(email, password);
      else {
        await signup(fullName, username, email, password);
        setMessage('Account created! You can now sign in.');
        setFullName(''); setUsername(''); setEmail(''); setPassword(''); setConfirmPassword('');
      }
    } catch (err) { setMessage(err.response?.data?.message || 'Something went wrong'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-chat-bg text-white flex items-center justify-center p-4 pb-20 pb-20">
      <div className="w-full max-w-md bg-surface rounded-2xl shadow-2 p-8">
        <h2 className="text-2xl font-bold text-center mb-6">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        {message && <div className={`p-3 rounded-xl mb-4 text-sm ${message.includes('successfully') || message.includes('created') ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>{message}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <input type="text" placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full bg-bg-input rounded-xl px-4 py-3 outline-none text-white border border-border-light focus:border-primary" />
          )}
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-bg-input rounded-xl px-4 py-3 outline-none text-white border border-border-light focus:border-primary" required />
          {!isLogin && (
            <div className="relative">
              <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} className={`w-full bg-bg-input rounded-xl px-4 py-3 outline-none text-white border pr-10 ${usernameAvailable === false && username.length > 0 ? 'border-danger' : usernameAvailable === true ? 'border-success' : 'border-border-light focus:border-primary'}`} required />
              <div className="absolute right-3 top-3">
                {checkingUsername && <FiLoader className="animate-spin text-text-muted" />}
                {!checkingUsername && usernameAvailable === true && <FiCheck className="text-success" />}
                {!checkingUsername && usernameAvailable === false && username.length > 0 && <FiX className="text-danger" />}
              </div>
            </div>
          )}
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-bg-input rounded-xl px-4 py-3 outline-none text-white border border-border-light focus:border-primary pr-10" required />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-text-muted hover:text-white">{showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}</button>
          </div>
          {!isLogin && (
            <div className="relative">
              <input type={showConfirm ? 'text' : 'password'} placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={`w-full bg-bg-input rounded-xl px-4 py-3 outline-none text-white border pr-10 ${confirmPassword && password !== confirmPassword ? 'border-danger' : confirmPassword && password === confirmPassword ? 'border-success' : 'border-border-light focus:border-primary'}`} required />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-3 text-text-muted hover:text-white">{showConfirm ? <FiEyeOff size={18} /> : <FiEye size={18} />}</button>
            </div>
          )}
          <button type="submit" disabled={loading} className="w-full bg-primary text-white py-3 rounded-full font-semibold hover:bg-primary-dark transition disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <FiLoader className="animate-spin" />}
            {isLogin ? (loading ? 'Signing in...' : 'Sign In') : (loading ? 'Creating Account...' : 'Create Account')}
          </button>
        </form>
        <p className="text-text-secondary text-center mt-4 text-sm">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button type="button" onClick={() => { setIsLogin(!isLogin); setMessage(''); setUsernameAvailable(null); }} className="text-primary font-medium hover:underline">{isLogin ? 'Sign Up' : 'Sign In'}</button>
        </p>
        {isLogin && <p className="text-center mt-2"><Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot Password?</Link></p>}
      </div>
      <BottomNav />
    </div>
  );
};
  <BottomNav />
export default LoginPage;
