import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('Verifying...');
  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      axios.get(`https://updown-hms5.onrender.com/api/auth/verify-email?token=${token}`)
        .then(res => setStatus(res.data.message))
        .catch(err => setStatus(err.response?.data?.message || 'Verification failed.'));
    } else {
      setStatus('No token provided.');
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-chat-bg text-white flex items-center justify-center">
      <div className="text-center">
        <p className="text-xl mb-4">{status}</p>
        {status === 'Email verified successfully! You can now login.' && (
          <Link to="/login" className="text-light-blue underline">Go to Login</Link>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;
