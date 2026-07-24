import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const { login, signup } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      if (isLogin) {
        await login(form.email, form.password);
      } else {
        const res = await signup(form.username, form.email, form.password);
        setMessage(res?.message || 'Signup successful! Please check your email to verify your account.');
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-chat-bg p-4">
      <form onSubmit={handleSubmit} className="bg-sidebar-bg p-8 rounded-2xl shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          {isLogin ? 'Login' : 'Sign Up'}
        </h2>
        {message && (
          <div className="bg-green-600/20 text-green-400 p-3 rounded-lg mb-4 text-sm">
            {message}
          </div>
        )}
        {!isLogin && (
          <input
            type="text"
            placeholder="Username"
            className="w-full p-3 mb-4 bg-gray-800 text-white rounded-lg outline-none"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
        )}
        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 mb-4 bg-gray-800 text-white rounded-lg outline-none"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 mb-6 bg-gray-800 text-white rounded-lg outline-none"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <button type="submit" className="w-full bg-light-blue text-white py-3 rounded-full font-semibold hover:bg-blue-600 transition">
          {isLogin ? 'Login' : 'Sign Up'}
        </button>
        <p className="text-gray-400 mt-4 text-center">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button type="button" onClick={() => { setIsLogin(!isLogin); setMessage(''); }} className="text-light-blue underline">
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </p>
      </form>
    </div>
  );
};

export default LoginPage;
