import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { FiEye, FiEyeOff, FiCheck, FiX, FiLoader } from 'react-icons/fi';

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
        setMessage('Account created successfully! You can now sign in.');
        setFullName(''); setUsername(''); setEmail(''); setPassword(''); setConfirmPassword('');
      }
    } catch (err) { setMessage(err.response?.data?.message || 'Something went wrong'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-chat-bg p-4">
      <div className="w-full max-w-md bg-sidebar-bg rounded-2xl shadow-xl p-8">
        <h2 className="text-3xl font-bold text-white text-center mb-2">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        <p className="text-gray-400 text-center mb-8">{isLogin ? 'Sign in to your account' : 'Fill in the details to get started'}</p>
        {message && <div className={`p-3 rounded-lg mb-4 text-sm ${message.includes('successfully') ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>{message}</div>}
        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div><label className="block text-sm text-gray-400 mb-1">Full Name</label>
              <input type="text" placeholder="John Doe" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 ring-light-blue" />
            </div>
          )}
          <div><label className="block text-sm text-gray-400 mb-1">Email</label>
            <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 ring-light-blue" required />
          </div>
          {!isLogin && (
            <div><label className="block text-sm text-gray-400 mb-1">Username <span className="text-gray-500 text-xs">(helps friends find you)</span></label>
              <div className="relative">
                <input type="text" placeholder="john_doe" value={username} onChange={e => setUsername(e.target.value)} className={`w-full bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 ring-light-blue pr-10 ${usernameAvailable === false && username.length > 0 ? 'ring-2 ring-red-500' : ''} ${usernameAvailable === true ? 'ring-2 ring-green-500' : ''}`} required />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checkingUsername && <FiLoader className="animate-spin text-gray-400" />}
                  {!checkingUsername && usernameAvailable === true && <FiCheck className="text-green-400" />}
                  {!checkingUsername && usernameAvailable === false && username.length > 0 && <FiX className="text-red-400" />}
                </div>
              </div>
              {usernameAvailable === false && username.length > 0 && <p className="text-red-400 text-xs mt-1">Username is already taken</p>}
              {usernameAvailable === true && <p className="text-green-400 text-xs mt-1">Username is available</p>}
            </div>
          )}
          <div><label className="block text-sm text-gray-400 mb-1">Password</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 ring-light-blue pr-10" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">{showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}</button>
            </div>
          </div>
          {!isLogin && (
            <div><label className="block text-sm text-gray-400 mb-1">Confirm Password</label>
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'} placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={`w-full bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 ring-light-blue pr-10 ${confirmPassword && password !== confirmPassword ? 'ring-2 ring-red-500' : ''} ${confirmPassword && password === confirmPassword ? 'ring-2 ring-green-500' : ''}`} required />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">{showConfirm ? <FiEyeOff size={18} /> : <FiEye size={18} />}</button>
              </div>
              {confirmPassword && password !== confirmPassword && <p className="text-red-400 text-xs mt-1">Passwords do not match</p>}
              {confirmPassword && password === confirmPassword && <p className="text-green-400 text-xs mt-1">Passwords match</p>}
            </div>
          )}
          <button type="submit" disabled={loading} className="w-full bg-light-blue hover:bg-blue-600 text-white font-semibold py-3 rounded-full transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <FiLoader className="animate-spin" />}
            {isLogin ? (loading ? 'Signing in...' : 'Sign In') : (loading ? 'Creating Account...' : 'Create Account')}
          </button>
        </form>
        <p className="text-gray-400 text-center mt-6">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button type="button" onClick={() => { setIsLogin(!isLogin); setMessage(''); setUsernameAvailable(null); }} className="text-light-blue font-medium hover:underline">
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
        {isLogin && (
          <p className="text-center mt-3">
            <Link to="/forgot-password" className="text-xs text-accent hover:underline">Forgot Password?</Link>
          </p>
        )}
      </div>
    </div>
  );
};
export default LoginPage;
