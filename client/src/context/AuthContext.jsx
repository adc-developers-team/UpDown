import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');

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
    if (token) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await axios.post('http://192.168.0.102:5000/api/auth/login', { email, password });
    const { token, ...userData } = res.data;
    setUser(userData);
    setToken(token);
    localStorage.setItem('user', JSON.stringify(userData));
    return res.data;
  };

  const signup = async (username, email, password) => {
    const res = await axios.post('http://192.168.0.102:5000/api/auth/signup', { username, email, password });
    const { token, ...userData } = res.data;
    setUser(userData);
    setToken(token);
    localStorage.setItem('user', JSON.stringify(userData));
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
    <AuthContext.Provider value={{ user, token, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
