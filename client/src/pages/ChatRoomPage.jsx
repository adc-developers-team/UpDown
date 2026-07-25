import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import axios from 'axios';
import {
  FiArrowLeft, FiSend, FiTrash2, FiSmile, FiMic, FiStopCircle,
  FiPlusCircle, FiImage, FiVideo, FiPhone, FiPhoneOff, FiVideoOff,
  FiMicOff, FiVolume2, FiCornerUpLeft, FiEdit, FiFilm, FiStar, FiSearch
} from 'react-icons/fi';
import { io } from 'socket.io-client';

const QUICK_EMOJIS = ['❤️','😂','👍','😮','😢','🔥'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ChatRoomPage = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const { messages, setMessages, sendMessage, onlineUsers, setSelectedUser } = useChat();
  const [newMsg, setNewMsg] = useState('');
  const [chatUser, setChatUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typingUser, setTypingUser] = useState(null);
  const [reactionPicker, setReactionPicker] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editText, setEditText] = useState('');
  const socketRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    socketRef.current = io('https://updown-hms5.onrender.com');
    axios.get('https://updown-hms5.onrender.com/api/auth/users')
      .then(res => {
        const found = (Array.isArray(res.data) ? res.data : []).find(u => u._id === userId);
        if (found) {
          setChatUser(found);
          setSelectedUser(found);
        } else {
          setChatUser({ _id: userId, username: 'Unknown', fullName: 'User' });
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch chat user:', err);
        setChatUser({ _id: userId, username: 'Unknown', fullName: 'User' });
        setError('Could not load user details');
        setLoading(false);
      });

    socketRef.current.on('user typing', setTypingUser);
    socketRef.current.on('user stop typing', () => setTypingUser(null));

    return () => { socketRef.current.disconnect(); };
  }, [userId]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      const chunks = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const token = localStorage.getItem('token');
            const { data } = await axios.post('https://updown-hms5.onrender.com/api/upload/audio', 
              { audio: reader.result }, 
              { headers: { Authorization: `Bearer ${token}` } }
            );
            socketRef.current?.emit('send message', { 
              senderId: user._id, receiverId: userId, text: '', image: data.audioUrl, mediaType: 'audio' 
            });
          } catch (err) { alert('Audio upload failed'); }
        };
        reader.readAsDataURL(blob);
      };
      recorder.start();
      setIsRecording(true);
    } catch (err) { alert('Microphone access denied'); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      setIsRecording(false);
    }
  };

  const uploadFile = async (file, type) => {
    if (file.size > MAX_FILE_SIZE) return alert(`File too large. Max ${MAX_FILE_SIZE/1048576}MB.`);
    setUploading(true);
    try {
      const reader = new FileReader();
      const result = await new Promise((res, rej) => { 
        reader.onload = () => res(reader.result); 
        reader.onerror = rej; 
        reader.readAsDataURL(file); 
      });
      const token = localStorage.getItem('token');
      const endpoint = type === 'image' ? '/api/upload/image' : '/api/upload/video';
      const field = type === 'image' ? 'image' : 'video';
      const { data } = await axios.post(
        `https://updown-hms5.onrender.com${endpoint}`, 
        { [field]: result }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const url = type === 'image' ? data.imageUrl : data.videoUrl;
      socketRef.current?.emit('send message', { 
        senderId: user._id, receiverId: userId, text: '', image: url, mediaType: type 
      });
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  const handleImageSelect = (e) => {
    if (e.target.files[0]) uploadFile(e.target.files[0], 'image');
    e.target.value = '';
  };

  const handleVideoSelect = (e) => {
    if (e.target.files[0]) uploadFile(e.target.files[0], 'video');
    e.target.value = '';
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (newMsg.trim()) {
      sendMessage(newMsg, replyTo?._id);
      setNewMsg('');
      setReplyTo(null);
    }
  };

  if (loading) return (
    <div className="h-screen bg-chat-bg flex items-center justify-center text-white">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accent"></div>
    </div>
  );

  if (!chatUser) return (
    <div className="h-screen bg-chat-bg flex flex-col items-center justify-center text-white">
      <p className="mb-4 text-text-secondary">{error || 'Failed to load chat'}</p>
      <button onClick={() => window.location.reload()} className="bg-accent text-black px-4 py-2 rounded-full text-sm font-medium">Retry</button>
    </div>
  );

  const isOnline = onlineUsers.includes(chatUser._id);
  const statusText = isOnline ? 'Online' : 'Offline';

  return (
    <div className="h-screen flex flex-col bg-chat-bg text-white w-full">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-2 bg-dark-blue border-b border-gray-700">
        <Link to="/" className="text-white hover:text-accent p-1"><FiArrowLeft size={22} /></Link>
        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden">
          {chatUser.profilePic ? <img src={chatUser.profilePic} className="w-full h-full object-cover" alt="" /> : <span className="text-lg font-bold text-accent">{chatUser.fullName?.[0] || chatUser.username[0].toUpperCase()}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-base truncate">{chatUser.fullName || chatUser.username}</h2>
          <p className={`text-xs ${isOnline ? 'text-green-400' : 'text-text-secondary'}`}>{typingUser ? `${typingUser} is typing...` : statusText}</p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
        {messages.map((msg, i) => {
          const isMine = msg.sender?._id === user._id;
          const mediaType = msg.mediaType || (msg.image ? (msg.image.match(/\.(mp4|webm|ogg)$/) ? 'video' : 'image') : 'text');
          return (
            <div key={i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`px-3 py-1.5 rounded-lg max-w-[75%] ${isMine ? 'message-sent rounded-br-sm' : 'message-received rounded-bl-sm'} relative group`}>
                {mediaType === 'image' && <img src={msg.image} className="rounded-lg mb-1 max-w-full" alt="" />}
                {mediaType === 'video' && <video controls className="max-w-full rounded-lg mb-1" style={{maxHeight:'180px'}}><source src={msg.image} /></video>}
                {mediaType === 'audio' && <audio controls src={msg.image} className="w-full mb-1" style={{height:'30px'}} />}
                {msg.text && <p className="text-sm">{msg.text}</p>}
                <div className="flex items-center justify-end gap-1 mt-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setReactionPicker(reactionPicker === msg._id ? null : msg._id); }} 
                    className="text-sm opacity-80 hover:opacity-100 hover:text-accent transition"
                  >
                    <FiSmile size={16} />
                  </button>
                  <span className="text-[10px] opacity-60">{new Date(msg.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>
                </div>
                {reactionPicker === msg._id && (
                  <div className="absolute -top-12 left-0 bg-gray-800 rounded-full px-2 py-1.5 flex gap-1.5 shadow-xl z-50" style={{ pointerEvents: 'auto' }}>
                    {QUICK_EMOJIS.map(e => (
                      <button key={e} onClick={(ev) => { ev.stopPropagation(); setReactionPicker(null); }} className="hover:scale-125 transition-transform text-lg">{e}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="px-3 py-2 bg-sidebar-bg border-t border-gray-700 flex items-center gap-3">
        <input type="file" accept="image/*" ref={imageInputRef} onChange={handleImageSelect} className="hidden" />
        <input type="file" accept="video/*" ref={videoInputRef} onChange={handleVideoSelect} className="hidden" />
        <button type="button" onClick={() => setShowAttachMenu(!showAttachMenu)} className="text-gray-400 hover:text-accent p-1 relative">
          <FiPlusCircle size={22} />
          {showAttachMenu && (
            <div className="absolute bottom-full left-0 mb-2 bg-gray-800 rounded-xl shadow-lg p-2 flex flex-col gap-1 z-20 text-sm">
              <button onClick={() => { imageInputRef.current?.click(); setShowAttachMenu(false); }} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-700 text-white"><FiImage size={16} /> Image</button>
              <button onClick={() => { videoInputRef.current?.click(); setShowAttachMenu(false); }} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-700 text-white"><FiVideo size={16} /> Video</button>
            </div>
          )}
        </button>
        <div className="flex-1 flex items-center bg-bg-input rounded-full px-4 py-1.5 border border-gray-700">
          <input type="text" value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Message" className="flex-1 bg-transparent outline-none text-sm text-white placeholder-gray-400" />
        </div>
        {isRecording ? (
          <button type="button" onClick={stopRecording} className="text-red-400 p-1 animate-pulse"><FiStopCircle size={22} /></button>
        ) : newMsg.trim() ? (
          <button type="submit" className="text-accent hover:text-accent-hover p-1"><FiSend size={22} /></button>
        ) : (
          <button type="button" onClick={startRecording} className="text-gray-400 hover:text-accent p-1"><FiMic size={22} /></button>
        )}
      </form>
    </div>
  );
};

export default ChatRoomPage;
