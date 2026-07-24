import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  }, [token]);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser && token) {
        const parsed = JSON.parse(storedUser);
        if (parsed && parsed._id) {
          setUser(parsed);
        } else {
          throw new Error('Invalid user data');
        }
      }
    } catch (err) {
      console.error('Failed to parse stored user:', err);
      localStorage.removeItem('user');
      setToken('');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await axios.post('https://updown-hms5.onrender.com/api/auth/login', { email, password });
    const { token, ...userData } = res.data;
    setUser(userData);
    setToken(token);
    localStorage.setItem('user', JSON.stringify(userData));
    return res.data;
  };

  const signup = async (fullName, username, email, password) => {
    const res = await axios.post('https://updown-hms5.onrender.com/api/auth/signup', { fullName, username, email, password });
    return res.data;
  };

  const updateUser = (updatedData) => {
    const newUser = { ...user, ...updatedData };
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    setToken('');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, signup, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
