import { useState, useEffect, useRef , FiImage } from 'react';
import { useParams, Link , FiImage } from 'react-router-dom';
import { useAuth , FiImage } from '../context/AuthContext';
import axios from 'axios';
import { FiArrowLeft, FiSend, FiImage, FiUsers, FiBarChart2, FiX, FiPlus, FiSmile, FiImage , FiImage } from 'react-icons/fi';
import { io , FiImage } from 'socket.io-client';

const formatMessageTime = (dateString) => {
  const date = new Date(dateString); const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 0) return timeStr;
  if (diffDays === 1) return 'Yesterday ' + timeStr;
  if (diffDays < 7) { const w = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']; return w[date.getDay()] + ' ' + timeStr; }
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + timeStr;
};

const GroupChatPage = () => {
  const { groupId } = useParams(); const { user } = useAuth();
  const [group, setGroup] = useState(null); const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState(''); const [typingUsers, setTypingUsers] = useState([]);
  const [isImageMode, setIsImageMode] = useState(false); const [imageUrl, setImageUrl] = useState('');
  const socketRef = useRef(null); const typingTimeoutRef = useRef(null); const messagesEndRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token'); const config = { headers: { Authorization: `Bearer ${token}` } };
    axios.get(`https://updown-hms5.onrender.com/api/groups/${groupId}`, config).then(res => setGroup(res.data)).catch(() => {});
    axios.get(`https://updown-hms5.onrender.com/api/group-messages/${groupId}`).then(res => setMessages(Array.isArray(res.data) ? res.data : [])).catch(() => setMessages([]));
    socketRef.current = io('https://updown-hms5.onrender.com'); socketRef.current.emit('join group', groupId);
    socketRef.current.on('group message received', (msg) => setMessages(prev => [...prev, msg]));
    socketRef.current.on('group user typing', ({ senderName }) => setTypingUsers(prev => prev.includes(senderName) ? prev : [...prev, senderName]));
    socketRef.current.on('group user stop typing', ({ senderName }) => setTypingUsers(prev => prev.filter(n => n !== senderName)));
    return () => { socketRef.current.disconnect(); };
  }, [groupId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleTyping = () => {
    if (!socketRef.current) return; socketRef.current.emit('group typing', { groupId, senderName: user.username });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => socketRef.current.emit('stop group typing', { groupId, senderName: user.username }), 2000);
  };

  const handleSend = (e) => {
    e.preventDefault(); if (!socketRef.current) return;
    if (isImageMode) { if (imageUrl.trim()) { socketRef.current.emit('send group message', { groupId, senderId: user._id, text: newMsg.trim(), image: imageUrl.trim() }); setImageUrl(''); setNewMsg(''); setIsImageMode(false); } }
    else { if (newMsg.trim()) { socketRef.current.emit('send group message', { groupId, senderId: user._id, text: newMsg.trim(), image: '' }); setNewMsg(''); } }
  };

  if (!group) return <div className="h-screen bg-chat-bg flex items-center justify-center text-white">Loading...</div>;
  const members = Array.isArray(group.members) ? group.members : [];

  return (
    <div className="h-screen flex flex-col bg-chat-bg text-white">
      <header className="flex items-center gap-4 px-4 py-3 bg-dark-blue border-b border-border-light">
        <Link to="/" className="text-white hover:text-primary"><FiArrowLeft size={22} /></Link>
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><span className="text-lg font-bold text-primary">{group.name[0].toUpperCase()}</span></div>
        <div className="flex-1 min-w-0"><h2 className="font-semibold truncate">{group.name}</h2><p className="text-xs text-text-secondary">{members.length} members</p></div>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
        {typingUsers.length > 0 && <div className="text-xs text-primary italic">{typingUsers.join(', ')} typing...</div>}
        {messages.map((msg, i) => {
          const isMine = msg.sender._id === user._id;
          return (
            <div key={i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2 rounded-2xl ${isMine ? 'message-sent rounded-br-md' : 'message-received rounded-bl-md'}`}>
                {!isMine && <p className="text-xs font-semibold text-primary mb-0.5">{msg.sender.fullName || msg.sender.username}</p>}
                {msg.image && <img src={msg.image} className="rounded-lg mb-1 max-w-full" alt="" />}
                {msg.text && <p className="text-sm">{msg.text}</p>}
                <span className="text-[10px] opacity-70">{formatMessageTime(msg.createdAt)}</span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} className="p-3 bg-sidebar-bg border-t border-border-light flex items-center gap-3">
        <button type="button" onClick={() => setIsImageMode(!isImageMode)} className={`w-10 h-10 rounded-full flex items-center justify-center ${isImageMode ? 'bg-primary text-white' : 'bg-bg-input text-text-secondary'}`}><FiImage size={20} /></button>
        <div className="flex-1 flex items-center bg-bg-input rounded-full h-11 px-4 border border-border-light focus-within:border-primary transition">
          <input type="text" value={newMsg} onChange={e => { setNewMsg(e.target.value); handleTyping(); }} placeholder="Message" className="flex-1 bg-transparent outline-none text-sm text-white placeholder-text-muted" />
        </div>
        {newMsg.trim() ? <button type="submit" className="text-primary p-1"><FiSend size={22} /></button> : <button type="button" className="text-text-secondary hover:text-primary p-1"><FiSmile size={22} /></button>}
      </form>
    </div>
  );
};
export default GroupChatPage;
