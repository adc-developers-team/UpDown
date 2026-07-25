import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  FiArrowLeft, FiSend, FiImage, FiUsers,
  FiBarChart2, FiX, FiPlus, FiCheck
} from 'react-icons/fi';
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
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [polls, setPolls] = useState([]);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };
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

    socketRef.current.on('new poll', (poll) => setPolls(prev => [poll, ...prev]));
    socketRef.current.on('poll updated', (updatedPoll) => setPolls(prev => prev.map(p => p._id === updatedPoll._id ? updatedPoll : p)));

    return () => socketRef.current.disconnect();
  }, [groupId]);

  const handleTyping = () => { /* same as before */ };

  const handleSend = (e) => {
    e.preventDefault();
    if (!socketRef.current) return;
    if (isImageMode) {
      if (imageUrl.trim()) {
        socketRef.current.emit('send group message', { groupId, senderId: user._id, text: newMsg.trim(), image: imageUrl.trim() });
        setImageUrl(''); setNewMsg(''); setIsImageMode(false);
      }
    } else {
      if (newMsg.trim()) {
        socketRef.current.emit('send group message', { groupId, senderId: user._id, text: newMsg.trim(), image: '' });
        setNewMsg('');
      }
    }
  };

  const handleCreatePoll = () => {
    if (!pollQuestion.trim() || pollOptions.some(opt => !opt.trim())) return;
    socketRef.current.emit('create poll', {
      groupId,
      question: pollQuestion,
      options: pollOptions.filter(opt => opt.trim()),
      senderId: user._id,
    });
    setShowPollModal(false);
    setPollQuestion('');
    setPollOptions(['', '']);
  };

  const handleVote = (pollId, optionIndex) => {
    socketRef.current.emit('vote poll', {
      pollId,
      optionIndex,
      userId: user._id,
      groupId,
    });
  };

  const handleClosePoll = (pollId) => {
    socketRef.current.emit('close poll', { pollId, groupId, userId: user._id });
  };

  if (!group) return <div className="h-screen bg-chat-bg flex items-center justify-center text-white">Loading...</div>;

  const members = Array.isArray(group.members) ? group.members : [];

  return (
    <div className="h-screen flex flex-col bg-chat-bg text-white">
      {/* Header */}
      <header className="flex items-center gap-4 px-4 py-3 bg-dark-blue border-b border-gray-700">
        <Link to="/" className="text-white hover:text-light-blue"><FiArrowLeft size={22} /></Link>
        <div className="w-10 h-10 rounded-full bg-light-blue flex items-center justify-center text-lg font-semibold">{group.name[0].toUpperCase()}</div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold truncate">{group.name}</h2>
          <p className="text-xs text-gray-400">{members.length} members</p>
        </div>
        <button onClick={() => setShowPollModal(true)} className="p-2 hover:bg-gray-700 rounded-full"><FiBarChart2 size={18} /></button>
      </header>

      {/* Messages + Polls */}
      <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-4">
        {typingUsers.length > 0 && <div className="text-xs text-green-400 mb-2 italic">{typingUsers.join(', ')} typing...</div>}
        {polls.map(poll => (
          <div key={poll._id} className="bg-sidebar-bg rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">{poll.question}</h3>
              {poll.creator._id === user._id && poll.status === 'active' && (
                <button onClick={() => handleClosePoll(poll._id)} className="text-xs text-red-400">Close</button>
              )}
            </div>
            <div className="space-y-2">
              {poll.options.map((opt, idx) => {
                const totalVotes = poll.options.reduce((sum, o) => sum + o.votes.length, 0);
                const percentage = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                const hasVoted = opt.votes.some(v => v === user._id);
                return (
                  <div key={idx} className="relative">
                    <button
                      onClick={() => poll.status === 'active' && handleVote(poll._id, idx)}
                      disabled={poll.status !== 'active'}
                      className={`w-full text-left p-2 rounded-lg border border-gray-600 hover:bg-gray-700 transition ${hasVoted ? 'bg-light-blue/20 border-light-blue' : ''}`}
                    >
                      <div className="flex justify-between text-sm">
                        <span>{opt.text}</span>
                        <span className="text-gray-400">{opt.votes.length} votes</span>
                      </div>
                    </button>
                    {poll.status === 'active' && (
                      <div className="absolute bottom-0 left-0 h-1 bg-light-blue rounded-full" style={{ width: `${percentage}%` }}></div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-500">Created by {poll.creator.fullName || poll.creator.username} • {poll.status === 'closed' ? 'Closed' : 'Active'}</p>
          </div>
        ))}
        {messages.map((msg, i) => {
          const isMine = msg.sender._id === user._id;
          return (
            <div key={i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2 rounded-2xl ${isMine ? 'bg-light-blue text-white rounded-br-none' : 'bg-gray-700 text-gray-100 rounded-bl-none'}`}>
                {!isMine && <p className="text-xs font-medium text-light-blue mb-0.5">{msg.sender.fullName || msg.sender.username}</p>}
                {msg.image && <img src={msg.image} className="rounded-lg mb-1 max-w-full" alt="" />}
                {msg.text && <p className="text-sm sm:text-base">{msg.text}</p>}
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-xs opacity-70">{formatMessageTime(msg.createdAt)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Poll Modal */}
      {showPollModal && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-sidebar-bg rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-semibold">Create Poll</h2>
            <input type="text" placeholder="Question" value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} className="w-full bg-gray-800 rounded-lg px-3 py-2 outline-none text-white" />
            {pollOptions.map((opt, idx) => (
              <div key={idx} className="flex gap-2">
                <input type="text" placeholder={`Option ${idx+1}`} value={opt} onChange={e => { const newOpts = [...pollOptions]; newOpts[idx] = e.target.value; setPollOptions(newOpts); }} className="flex-1 bg-gray-800 rounded-lg px-3 py-2 outline-none text-white" />
                {pollOptions.length > 2 && <button onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))} className="text-red-400"><FiX size={18} /></button>}
              </div>
            ))}
            <button onClick={() => setPollOptions([...pollOptions, ''])} className="flex items-center gap-1 text-light-blue text-sm"><FiPlus size={16} /> Add option</button>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowPollModal(false)} className="px-4 py-2 bg-gray-700 rounded-full text-sm">Cancel</button>
              <button onClick={handleCreatePoll} className="px-4 py-2 bg-light-blue rounded-full text-sm">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-sidebar-bg border-t border-gray-700 flex items-center gap-2">
        <button type="button" onClick={() => setIsImageMode(!isImageMode)} className={`w-10 h-10 rounded-full flex items-center justify-center ${isImageMode ? 'bg-light-blue text-white' : 'bg-gray-700 text-gray-400'}`}><FiImage size={20} /></button>
        {isImageMode ? (
          <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Image URL..." className="flex-1 bg-gray-800 rounded-full px-4 py-2 outline-none text-white placeholder-gray-400 text-sm" />
        ) : (
          <input type="text" value={newMsg} onChange={e => { setNewMsg(e.target.value); handleTyping(); }} placeholder="Message..." className="flex-1 bg-gray-800 rounded-full px-4 py-2 outline-none text-white placeholder-gray-400 text-sm" />
        )}
        <button type="submit" className="w-10 h-10 bg-light-blue rounded-full flex items-center justify-center hover:bg-blue-600 transition"><FiSend size={18} /></button>
      </form>
    </div>
  );
};

export default GroupChatPage;
