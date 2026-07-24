import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { FiArrowLeft, FiUserCheck, FiUserX } from 'react-icons/fi';

const NotificationsPage = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(null); // { requestId, action } অথবা null
  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data } = await axios.get('http://192.168.0.102:5000/api/friends/requests/received', config);
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const initiateAction = (requestId, action) => {
    setConfirming({ requestId, action });
  };

  const cancelAction = () => {
    setConfirming(null);
  };

  const handleConfirm = async () => {
    if (!confirming) return;
    const { requestId, action } = confirming;
    try {
      await axios.put(
        `http://192.168.0.102:5000/api/friends/request/${requestId}`,
        { action },
        config
      );
      setRequests(prev => prev.filter(req => req._id !== requestId));
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    } finally {
      setConfirming(null);
    }
  };

  return (
    <div className="min-h-screen bg-chat-bg text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-4 px-4 py-3 bg-dark-blue border-b border-gray-700">
        <Link to="/" className="text-white hover:text-light-blue">
          <FiArrowLeft size={22} />
        </Link>
        <h2 className="font-semibold text-lg">Notifications</h2>
      </header>

      {/* Content */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {loading && <p className="text-center text-gray-400">Loading...</p>}
        {!loading && requests.length === 0 && (
          <p className="text-center text-gray-400 mt-10">No new friend requests</p>
        )}
        {requests.map(request => {
          const fromUser = request.from;
          const isConfirmingThis = confirming && confirming.requestId === request._id;
          return (
            <div
              key={request._id}
              className={`flex items-center gap-4 bg-sidebar-bg p-3 rounded-xl transition-colors ${
                isConfirmingThis ? 'ring-2 ring-light-blue' : 'hover:bg-gray-700'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-light-blue flex items-center justify-center text-lg font-semibold flex-shrink-0">
                {fromUser.username[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium">{fromUser.username}</h3>
                <p className="text-sm text-gray-400 truncate">{fromUser.email}</p>
                <p className="text-xs text-gray-500 mt-1">wants to be your friend</p>
              </div>
              <div className="flex gap-2">
                {isConfirmingThis ? (
                  <>
                    <button
                      onClick={handleConfirm}
                      className="p-2 bg-green-600 hover:bg-green-700 rounded-full transition-colors"
                      title={`Confirm ${confirming.action}`}
                    >
                      <FiUserCheck size={18} />
                    </button>
                    <button
                      onClick={cancelAction}
                      className="p-2 bg-gray-600 hover:bg-gray-500 rounded-full transition-colors"
                      title="Cancel"
                    >
                      <FiUserX size={18} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => initiateAction(request._id, 'accept')}
                      className="p-2 bg-green-600 hover:bg-green-700 rounded-full transition-colors"
                      title="Accept"
                    >
                      <FiUserCheck size={18} />
                    </button>
                    <button
                      onClick={() => initiateAction(request._id, 'decline')}
                      className="p-2 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
                      title="Decline"
                    >
                      <FiUserX size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NotificationsPage;
