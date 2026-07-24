import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { FiArrowLeft, FiSend, FiImage } from 'react-icons/fi';
import { io } from 'socket.io-client';

const formatMessageTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 0) return timeStr;
  if (diffDays === 1) return 'Yesterday ' + timeStr;
  if (diffDays < 7) {
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return weekdays[date.getDay()] + ' ' + timeStr;
  }
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + timeStr;
};

const GroupChatPage = () => {
  const { groupId } = useParams();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [isImageMode, setIsImageMode] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };
    axios.get(`import.meta.env.VITE_API_URL/api/groups/${groupId}`, config)
      .then(res => setGroup(res.data))
      .catch(console.log);
    axios.get(`import.meta.env.VITE_API_URL/api/group-messages/${groupId}`)
      .then(res => setMessages(res.data))
      .catch(console.log);

    socketRef.current = io('import.meta.env.VITE_API_URL');
    socketRef.current.emit('join group', groupId);
    socketRef.current.on('group message received', (msg) => setMessages(prev => [...prev, msg]));
    socketRef.current.on('group user typing', ({ senderName }) => setTypingUsers(prev => prev.includes(senderName) ? prev : [...prev, senderName]));
    socketRef.current.on('group user stop typing', ({ senderName }) => setTypingUsers(prev => prev.filter(n => n !== senderName)));

    return () => socketRef.current.disconnect();
  }, [groupId]);

  const handleTyping = () => {
    if (!socketRef.current) return;
    socketRef.current.emit('group typing', { groupId, senderName: user.username });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current.emit('stop group typing', { groupId, senderName: user.username });
    }, 2000);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!socketRef.current) return;
    if (isImageMode) {
      if (imageUrl.trim()) {
        socketRef.current.emit('send group message', { groupId, senderId: user._id, text: newMsg.trim(), image: imageUrl.trim() });
        setImageUrl(''); setNewMsg(''); setIsImageMode(false);
        socketRef.current.emit('stop group typing', { groupId, senderName: user.username });
      }
    } else {
      if (newMsg.trim()) {
        socketRef.current.emit('send group message', { groupId, senderId: user._id, text: newMsg.trim(), image: '' });
        setNewMsg('');
        socketRef.current.emit('stop group typing', { groupId, senderName: user.username });
      }
    }
  };

  if (!group) return <div className="h-screen bg-chat-bg flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="h-screen flex flex-col bg-chat-bg text-white">
      <header className="flex items-center gap-4 px-4 py-3 bg-dark-blue border-b border-gray-700">
        <Link to="/" className="text-white hover:text-light-blue"><FiArrowLeft size={22} /></Link>
        <div className="w-10 h-10 rounded-full bg-light-blue flex items-center justify-center text-lg font-semibold">
          {group.profilePic ? (
            <img src={group.profilePic} className="w-full h-full object-cover rounded-full" />
          ) : (
            group.name[0].toUpperCase()
          )}
        </div>
        <div className="flex-1">
          <h2 className="font-semibold">{group.name}</h2>
          <p className="text-xs text-gray-400">{group.members.length} members</p>
        </div>
      </header>

      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-chat-bg">
        {typingUsers.length > 0 && <div className="text-xs text-green-400 mb-2">{typingUsers.join(', ')} typing...</div>}
        {messages.map((msg, i) => {
          const isMine = msg.sender._id === user._id;
          return (
            <div key={i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2 rounded-2xl ${isMine ? 'bg-light-blue text-white rounded-br-none' : 'bg-gray-700 text-gray-100 rounded-bl-none'}`}>
                {!isMine && <p className="text-xs text-light-blue font-medium">{msg.sender.username}</p>}
                {msg.image && <img src={msg.image} className="rounded-lg mb-1 max-w-full" />}
                {msg.text && <p>{msg.text}</p>}
                <span className="text-xs opacity-70">{formatMessageTime(msg.createdAt)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSend} className="p-3 bg-sidebar-bg border-t border-gray-700 flex items-center gap-2">
        <button type="button" onClick={() => setIsImageMode(!isImageMode)} className={`w-10 h-10 rounded-full flex items-center justify-center ${isImageMode ? 'bg-light-blue text-white' : 'bg-gray-700 text-gray-400'}`}>
          <FiImage size={20} />
        </button>
        {isImageMode ? (
          <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Image URL..." className="flex-1 bg-gray-800 rounded-full px-4 py-2 outline-none text-white placeholder-gray-400" />
        ) : (
          <input type="text" value={newMsg} onChange={e => { setNewMsg(e.target.value); handleTyping(); }} placeholder="Message..." className="flex-1 bg-gray-800 rounded-full px-4 py-2 outline-none text-white placeholder-gray-400" />
        )}
        <button type="submit" className="w-10 h-10 bg-light-blue rounded-full flex items-center justify-center hover:bg-blue-600 transition">
          <FiSend size={18} />
        </button>
      </form>
    </div>
  );
};

export default GroupChatPage;
