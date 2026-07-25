import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  FiArrowLeft, FiSend, FiImage, FiUsers, FiBarChart2,
  FiX, FiPlus, FiCheck, FiLogOut, FiUserMinus
} from 'react-icons/fi';
import { io } from 'socket.io-client';
import VideoPlayer from '../engines/VideoPlayer';
import MessageFormatter from '../engines/MessageFormatter';

const formatMessageTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 0) return timeStr;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return weekdays[date.getDay()];
  }
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

const GroupChatPage = () => {
  const { groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [isImageMode, setIsImageMode] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [polls, setPolls] = useState([]);
  const [showMembers, setShowMembers] = useState(false);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    axios.get(`https://updown-hms5.onrender.com/api/groups/${groupId}`, config)
      .then(res => setGroup(res.data))
      .catch(() => {});
    axios.get(`https://updown-hms5.onrender.com/api/group-messages/${groupId}`)
      .then(res => setMessages(Array.isArray(res.data) ? res.data : []))
      .catch(() => setMessages([]));
    axios.get(`https://updown-hms5.onrender.com/api/polls/group/${groupId}`, config)
      .then(res => setPolls(Array.isArray(res.data) ? res.data : []))
      .catch(() => setPolls([]));

    socketRef.current = io('https://updown-hms5.onrender.com');
    socketRef.current.emit('join group', groupId);

    socketRef.current.on('group message received', (msg) => setMessages(prev => [...prev, msg]));
    socketRef.current.on('group user typing', ({ senderName }) => setTypingUsers(prev => prev.includes(senderName) ? prev : [...prev, senderName]));
    socketRef.current.on('group user stop typing', ({ senderName }) => setTypingUsers(prev => prev.filter(n => n !== senderName)));

    return () => socketRef.current.disconnect();
  }, [groupId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleLeave = async () => {
    if (!confirm('Leave this group?')) return;
    try {
      await axios.put(`https://updown-hms5.onrender.com/api/groups/${groupId}/leave`, {}, config);
      navigate('/');
    } catch (err) { alert(err.response?.data?.message || 'Failed to leave'); }
  };

  const handleKick = async (userId) => {
    if (!confirm('Remove this member?')) return;
    try {
      const { data } = await axios.put(`https://updown-hms5.onrender.com/api/groups/${groupId}/kick`, { userId }, config);
      setGroup(data);
    } catch (err) { alert(err.response?.data?.message || 'Failed to remove'); }
  };

  if (!group) return <div className="h-screen bg-chat-bg flex items-center justify-center text-white"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accent"></div></div>;

  const members = Array.isArray(group.members) ? group.members : [];
  const isAdmin = group.admin === user._id;

  return (
    <div className="h-screen flex flex-col bg-chat-bg text-white">
      <header className="flex items-center gap-4 px-4 py-3 bg-dark-blue border-b border-gray-700">
        <Link to="/" className="text-white hover:text-accent p-1"><FiArrowLeft size={22} /></Link>
        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center"><span className="text-lg font-bold text-accent">{group.name[0].toUpperCase()}</span></div>
        <div className="flex-1 min-w-0"><h2 className="font-semibold truncate">{group.name}</h2><p className="text-xs text-text-secondary">{members.length} members</p></div>
        <button onClick={() => setShowPollModal(true)} className="p-2 hover:bg-accent/10 rounded-full"><FiBarChart2 size={18} /></button>
        <button onClick={() => setShowMembers(!showMembers)} className="p-2 hover:bg-accent/10 rounded-full"><FiUsers size={18} /></button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
          {typingUsers.length > 0 && <div className="text-xs text-accent italic">{typingUsers.join(', ')} typing...</div>}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.sender._id === user._id ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              <div className="flex items-end gap-2 max-w-[80%]">
                {msg.sender._id !== user._id && (
                  <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden">
                    {msg.sender.profilePic ? <img src={msg.sender.profilePic} className="w-full h-full object-cover" alt="" /> : <span className="text-xs font-bold text-accent">{msg.sender.fullName?.[0] || msg.sender.username?.[0]?.toUpperCase()}</span>}
                  </div>
                )}
                <div className={`px-3 py-1.5 rounded-lg shadow-sm ${msg.sender._id === user._id ? 'message-sent rounded-br-sm' : 'message-received rounded-bl-sm'}`}>
                  {msg.sender._id !== user._id && <p className="text-xs font-semibold text-accent mb-0.5">{msg.sender.fullName || msg.sender.username}</p>}
                  {msg.image && (msg.mediaType === 'video' ? <VideoPlayer src={msg.image} /> : <img src={msg.image} className="rounded-lg mb-0.5 max-w-full" alt="" />)}
                  {msg.text && <div className="text-sm leading-relaxed"><MessageFormatter text={msg.text} /></div>}
                  <span className="text-[10px] opacity-60">{formatMessageTime(msg.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {showMembers && (
          <div className="w-64 bg-sidebar-bg border-l border-gray-700 overflow-y-auto p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Members</h3>
              <button onClick={() => setShowMembers(false)} className="text-gray-400 hover:text-white"><FiX size={16} /></button>
            </div>
            {members.map(member => (
              <div key={member._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden">
                  {member.profilePic ? <img src={member.profilePic} className="w-full h-full object-cover" alt="" /> : <span className="text-xs font-bold text-accent">{member.fullName?.[0] || member.username?.[0]?.toUpperCase()}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{member.fullName || member.username}</p>
                  {member._id === group.admin && <p className="text-xs text-accent">Admin</p>}
                </div>
                {isAdmin && member._id !== user._id && (
                  <button onClick={() => handleKick(member._id)} className="text-red-400 hover:text-red-300 p-1"><FiUserMinus size={14} /></button>
                )}
              </div>
            ))}
            <button onClick={handleLeave} className="w-full text-left p-2 rounded-lg hover:bg-red-600/20 text-red-400 transition flex items-center gap-2 text-sm"><FiLogOut size={14} /> Leave Group</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupChatPage;
