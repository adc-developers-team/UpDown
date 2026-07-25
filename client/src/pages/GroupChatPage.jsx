import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  FiArrowLeft, FiSend, FiImage, FiUsers, FiBarChart2,
  FiX, FiPlus, FiCheck, FiChevronDown
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

    socketRef.current.on('group message received', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socketRef.current.on('group user typing', ({ senderName }) => {
      setTypingUsers(prev => prev.includes(senderName) ? prev : [...prev, senderName]);
    });

    socketRef.current.on('group user stop typing', ({ senderName }) => {
      setTypingUsers(prev => prev.filter(n => n !== senderName));
    });

    socketRef.current.on('new poll', (poll) => {
      setPolls(prev => [poll, ...prev]);
    });

    socketRef.current.on('poll updated', (updatedPoll) => {
      setPolls(prev => prev.map(p => p._id === updatedPoll._id ? updatedPoll : p));
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [groupId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        socketRef.current.emit('send group message', {
          groupId, senderId: user._id, text: newMsg.trim(), image: imageUrl.trim()
        });
        setImageUrl(''); setNewMsg(''); setIsImageMode(false);
      }
    } else {
      if (newMsg.trim()) {
        socketRef.current.emit('send group message', {
          groupId, senderId: user._id, text: newMsg.trim(), image: ''
        });
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

  if (!group) return (
    <div className="h-screen bg-chat-bg flex items-center justify-center text-white">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accent"></div>
    </div>
  );

  const members = Array.isArray(group.members) ? group.members : [];

  return (
    <div className="h-screen flex flex-col bg-chat-bg text-white">
      {/* Header */}
      <header className="flex items-center gap-4 px-4 py-3 bg-dark-blue border-b border-gray-700 sticky top-0 z-20">
        <Link to="/" className="text-white hover:text-accent p-1">
          <FiArrowLeft size={22} />
        </Link>
        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
          <span className="text-lg font-bold text-accent">{group.name[0].toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-base truncate">{group.name}</h2>
          <p className="text-xs text-text-secondary">{members.length} members</p>
        </div>
        <button
          onClick={() => setShowPollModal(true)}
          className="p-2 hover:bg-accent/10 rounded-full transition"
          title="Create Poll"
        >
          <FiBarChart2 size={18} />
        </button>
        <button
          onClick={() => setShowMembers(!showMembers)}
          className="p-2 hover:bg-accent/10 rounded-full transition"
          title="Members"
        >
          <FiUsers size={18} />
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
            {typingUsers.length > 0 && (
              <div className="text-xs text-accent italic animate-fade-in">
                {typingUsers.join(', ')} typing...
              </div>
            )}

            {polls.map(poll => (
              <div key={poll._id} className="bg-sidebar-bg rounded-2xl p-4 space-y-3 border border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{poll.question}</h3>
                  {poll.creator._id === user._id && poll.status === 'active' && (
                    <button
                      onClick={() => handleClosePoll(poll._id)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Close
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {poll.options.map((opt, idx) => {
                    const totalVotes = poll.options.reduce((sum, o) => sum + o.votes.length, 0);
                    const percentage = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                    const hasVoted = opt.votes.some(v => v === user._id);
                    return (
                      <button
                        key={idx}
                        onClick={() => poll.status === 'active' && handleVote(poll._id, idx)}
                        disabled={poll.status !== 'active'}
                        className={`w-full text-left p-2 rounded-lg border border-gray-600 hover:bg-gray-800 transition relative overflow-hidden ${
                          hasVoted ? 'bg-accent/10 border-accent' : ''
                        }`}
                      >
                        <div className="flex justify-between text-sm relative z-10">
                          <span>{opt.text}</span>
                          <span className="text-text-secondary">{opt.votes.length}</span>
                        </div>
                        <div
                          className="absolute top-0 left-0 h-full bg-accent/10 transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-text-muted">
                  {poll.creator.fullName || poll.creator.username} • {poll.status}
                </p>
              </div>
            ))}

            {messages.map((msg, i) => {
              const isMine = msg.sender._id === user._id;
              return (
                <div key={i} className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                  <div className="flex items-end gap-2 max-w-[80%] sm:max-w-[70%]">
                    {!isMine && (
                      <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {msg.sender.profilePic ? (
                          <img src={msg.sender.profilePic} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <span className="text-xs font-bold text-accent">
                            {msg.sender.fullName?.[0] || msg.sender.username?.[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                    )}
                    <div className={`px-3 py-1.5 rounded-lg shadow-sm ${
                      isMine ? 'message-sent rounded-br-sm' : 'message-received rounded-bl-sm'
                    }`}>
                      {!isMine && (
                        <p className="text-xs font-semibold text-accent mb-0.5">
                          {msg.sender.fullName || msg.sender.username}
                        </p>
                      )}
                      {msg.image && (
                        <img src={msg.image} className="rounded-lg mb-0.5 max-w-full" alt="" />
                      )}
                      {msg.text {msg.text && <p className="text-sm leading-relaxed">{msg.text}</p>}{msg.text && <p className="text-sm leading-relaxed">{msg.text}</p>} <div className="text-sm leading-relaxed"><MessageFormatter text={msg.text} /></div>}
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <span className="text-[10px] opacity-60">{formatMessageTime(msg.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="px-3 py-2 bg-sidebar-bg border-t border-gray-700 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsImageMode(!isImageMode)}
              className={`p-1.5 rounded-full transition ${
                isImageMode ? 'bg-accent text-black' : 'text-gray-400 hover:text-accent'
              }`}
            >
              <FiImage size={20} />
            </button>
            <div className="flex-1 flex items-center bg-bg-input rounded-full px-4 py-1.5 border border-gray-700">
              <input
                type="text"
                value={newMsg}
                onChange={e => { setNewMsg(e.target.value); handleTyping(); }}
                placeholder="Message"
                className="flex-1 bg-transparent outline-none text-sm text-white placeholder-gray-400"
              />
            </div>
            <button
              type="submit"
              className="text-accent hover:text-accent-hover p-1.5 rounded-full transition"
            >
              <FiSend size={20} />
            </button>
          </form>
        </div>

        {/* Members Sidebar */}
        {showMembers && (
          <div className="w-64 bg-sidebar-bg border-l border-gray-700 overflow-y-auto p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Members</h3>
              <button onClick={() => setShowMembers(false)} className="text-gray-400 hover:text-white">
                <FiX size={16} />
              </button>
            </div>
            {members.map(member => (
              <div key={member._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden">
                  {member.profilePic ? (
                    <img src={member.profilePic} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <span className="text-xs font-bold text-accent">
                      {member.fullName?.[0] || member.username?.[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{member.fullName || member.username}</p>
                  {member._id === group.admin && (
                    <p className="text-xs text-accent">Admin</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Poll Modal */}
      {showPollModal && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-sidebar-bg rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-semibold">Create Poll</h2>
            <input
              type="text"
              placeholder="Question"
              value={pollQuestion}
              onChange={e => setPollQuestion(e.target.value)}
              className="w-full bg-bg-input rounded-lg px-3 py-2 outline-none text-white border border-gray-700"
            />
            {pollOptions.map((opt, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  placeholder={`Option ${idx + 1}`}
                  value={opt}
                  onChange={e => {
                    const newOpts = [...pollOptions];
                    newOpts[idx] = e.target.value;
                    setPollOptions(newOpts);
                  }}
                  className="flex-1 bg-bg-input rounded-lg px-3 py-2 outline-none text-white border border-gray-700"
                />
                {pollOptions.length > 2 && (
                  <button
                    onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                    className="text-red-400 p-1"
                  >
                    <FiX size={16} />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setPollOptions([...pollOptions, ''])}
              className="flex items-center gap-1 text-accent text-sm hover:underline"
            >
              <FiPlus size={14} /> Add option
            </button>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowPollModal(false)}
                className="px-4 py-2 bg-gray-700 rounded-full text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePoll}
                className="px-4 py-2 bg-accent text-black rounded-full text-sm font-semibold"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupChatPage;
