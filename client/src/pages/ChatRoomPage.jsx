import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import axios from 'axios';
import {
  FiArrowLeft, FiSend, FiTrash2, FiSmile, FiMic, FiStopCircle,
  FiPlusCircle, FiImage, FiVideo, FiPhone, FiPhoneOff, FiVideoOff,
  FiMicOff, FiVolume2, FiCornerUpLeft, FiEdit, FiFilm
} from 'react-icons/fi';
import { io } from 'socket.io-client';
import AudioPlayer from '../engines/AudioPlayer';
import ImagePreview from '../engines/ImagePreview';
import VideoPlayer from '../engines/VideoPlayer';
import MessageFormatter from '../engines/MessageFormatter';
import useCall from '../engines/useCall';
import { useVirtualScroll, LazyImage } from '../engines/PerformanceEngine';
import { encrypt, decrypt, generateKey, exportKey, importKey } from '../engines/EncryptionEngine';

const QUICK_EMOJIS = ['❤️','😂','👍','😮','😢','🔥'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ChatRoomPage = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const { messages, setMessages, sendMessage, onlineUsers, setSelectedUser } = useChat();
  const [newMsg, setNewMsg] = useState('');
  const [chatUser, setChatUser] = useState(null);
  const [typingUser, setTypingUser] = useState(null);
  const [reactionPicker, setReactionPicker] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editText, setEditText] = useState('');
  const [showGifModal, setShowGifModal] = useState(false);
  const [gifSearch, setGifSearch] = useState('');
  const [gifResults, setGifResults] = useState([]);
  const [searchingGif, setSearchingGif] = useState(false);
  const [reactingMsgId, setReactingMsgId] = useState(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // Call engine
  const {
    inCall, calling, incoming, callerSignal, callType, callDuration,
    localStream, remoteStream, micMuted, videoEnabled,
    localVideoRef, remoteVideoRef,
    startCall, acceptCall, rejectCall, endCall, toggleMic, toggleVideo, toggleSpeaker
  } = useCall(userId, user, socketRef);

  useEffect(() => {
    socketRef.current = io('https://updown-hms5.onrender.com');
    axios.get('https://updown-hms5.onrender.com/api/auth/users')
      .then(res => {
        const found = (Array.isArray(res.data) ? res.data : []).find(u => u._id === userId);
        if (found) { setChatUser(found); setSelectedUser(found); }
      }).catch(console.log);

    socketRef.current.on('user typing', setTypingUser);
    socketRef.current.on('user stop typing', () => setTypingUser(null));
    socketRef.current.on('message deleted', id => setMessages(prev => prev.filter(m => m._id !== id)));
    socketRef.current.on('message edited', (editedMsg) => setMessages(prev => prev.map(m => m._id === editedMsg._id ? editedMsg : m)));
    socketRef.current.on('message reaction updated', updated => setMessages(prev => prev.map(m => m._id === updated._id ? updated : m)));

    socketRef.current.emit('set-username', user.username);

    const container = document.querySelector('.overflow-y-auto');
    if (container) {
      const handleScroll = () => setShowScrollBtn(container.scrollTop < container.scrollHeight - container.clientHeight - 100);
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
    return () => socketRef.current.disconnect();
  }, [userId, setSelectedUser, user.username]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const uploadFile = async (file, type) => {
    if (file.size > MAX_FILE_SIZE) return alert(`File too large. Max ${MAX_FILE_SIZE/1048576}MB.`);
    setUploading(true);
    try {
      const reader = new FileReader();
      const result = await new Promise((res, rej) => { reader.onload = () => res(reader.result); reader.onerror = rej; reader.readAsDataURL(file); });
      const token = localStorage.getItem('token');
      const endpoint = type === 'image' ? '/api/upload/image' : '/api/upload/video';
      const field = type === 'image' ? 'image' : 'video';
      const { data } = await axios.post(`https://updown-hms5.onrender.com${endpoint}`, { [field]: result }, { headers: { Authorization: `Bearer ${token}` } });
      const url = type === 'image' ? data.imageUrl : data.videoUrl;
      socketRef.current.emit('send message', { senderId: user._id, receiverId: userId, text: '', image: url, mediaType: type, replyTo: replyTo?._id || null });
      socketRef.current?.emit('stop typing', { conversationId: [user._id, userId].sort().join('_') });
      setReplyTo(null);
    } catch (err) { alert(err.response?.data?.message || err.message || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const handleImageSelect = (e) => { if (e.target.files[0]) uploadFile(e.target.files[0], 'image'); e.target.value = ''; };
  const handleVideoSelect = (e) => { if (e.target.files[0]) uploadFile(e.target.files[0], 'video'); e.target.value = ''; };
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder; chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const token = localStorage.getItem('token');
            const { data } = await axios.post('https://updown-hms5.onrender.com/api/upload/audio', { audio: reader.result }, { headers: { Authorization: `Bearer ${token}` } });
            socketRef.current.emit('send message', { senderId: user._id, receiverId: userId, text: '', image: data.audioUrl, mediaType: 'audio', replyTo: replyTo?._id || null });
            socketRef.current?.emit('stop typing', { conversationId: [user._id, userId].sort().join('_') });
            setReplyTo(null);
          } catch (err) { alert('Audio upload failed'); }
        };
        reader.readAsDataURL(blob);
      };
      recorder.start(); setIsRecording(true); setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch { alert('Microphone access denied'); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      setIsRecording(false); clearInterval(recordingTimerRef.current);
    }
  };

  const deleteMsg = async (id) => {
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`https://updown-hms5.onrender.com/api/messages/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const convId = [user._id, userId].sort().join('_');
      socketRef.current?.emit('delete message', { messageId: id, conversationId: convId });
      setMessages(prev => prev.filter(m => m._id !== id));
    } catch (err) { alert(err.response?.data?.message || 'Delete failed'); }
  };

  const reactToMsg = (msgId, emoji) => {
    const convId = [user._id, userId].sort().join('_');
    socketRef.current?.emit('react to message', { messageId: msgId, emoji, userId: user._id, conversationId: convId });
    setReactionPicker(null);
    setReactingMsgId(msgId);
    setTimeout(() => setReactingMsgId(null), 350);
  };

  const startEdit = (msg) => { setEditingMsgId(msg._id); setEditText(msg.text); };
  const cancelEdit = () => { setEditingMsgId(null); setEditText(''); };
  const submitEdit = async (msgId) => {
    if (!editText.trim()) return;
    const token = localStorage.getItem('token');
    try {
      await axios.put(`https://updown-hms5.onrender.com/api/messages/${msgId}`, { text: editText }, { headers: { Authorization: `Bearer ${token}` } });
      const convId = [user._id, userId].sort().join('_');
      socketRef.current?.emit('edit message', { messageId: msgId, text: editText, conversationId: convId });
      setEditingMsgId(null); setEditText('');
    } catch (err) { alert(err.response?.data?.message || 'Edit failed'); }
  };

  const handleTyping = () => {
    if (!socketRef.current) return;
    const convId = [user._id, userId].sort().join('_');
    socketRef.current.emit('typing', { conversationId: convId, senderName: user.username });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => socketRef.current.emit('stop typing', { conversationId: convId }), 2000);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (newMsg.trim()) {
      sendMessage(newMsg, replyTo?._id);
      setNewMsg('');
      setReplyTo(null);
    }
  };

  const renderTick = (msg) => {
    if (msg.sender._id !== user._id) return null;
    switch (msg.status) {
      case 'sent': return <span className="text-xs opacity-60 ml-1">✔</span>;
      case 'delivered': return <span className="text-xs opacity-80 ml-1">✔✔</span>;
      case 'read': return <span className="text-xs ml-1" style={{ color: '#3b82f6' }}>✔✔</span>;
      default: return <span className="text-xs opacity-60 ml-1">✔</span>;
    }
  };

  const renderReactions = (msg) => {
    if (!msg.reactions || Object.keys(msg.reactions).length === 0) return null;
    return <div className="flex gap-1 mt-1">{Object.entries(msg.reactions).map(([emoji, ids]) => <span key={emoji} className="text-sm bg-gray-800 rounded-full px-1.5 py-0.5">{emoji} {ids.length > 1 && ids.length}</span>)}</div>;
  };

  const formatRecTime = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
  const getMediaType = (url) => {
    if (/\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(url)) return 'video';
    if (/\.(mp3|wav|aac|m4a|flac)$/i.test(url)) return 'audio';
    if (/\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(url)) return 'image';
    return 'unknown';
  };

  if (!chatUser) return <div className="h-screen bg-chat-bg flex items-center justify-center text-white">Loading...</div>;

  const isOnline = onlineUsers.includes(chatUser._id);
  const statusText = isOnline ? 'Online' : (() => { if (!chatUser.lastSeen) return 'Last seen long ago'; const date = new Date(chatUser.lastSeen); const diffSec = Math.floor((Date.now() - date) / 1000); if (diffSec < 60) return 'Last seen just now'; const diffMin = Math.floor(diffSec / 60); if (diffMin < 60) return `Last seen ${diffMin}m ago`; const diffHr = Math.floor(diffMin / 60); if (diffHr < 24) return `Last seen ${diffHr}h ago`; return 'Last seen long ago'; })();
  const callTime = `${Math.floor(callDuration/60)}:${(callDuration%60).toString().padStart(2,'0')}`;

  return (
    <div className="h-screen flex flex-col bg-chat-bg text-white w-full">
      {/* Call overlay */}
      {(inCall || calling || incoming) && (
        <div className="absolute inset-0 z-50 bg-gradient-to-b from-dark-blue to-black bg-opacity-95 flex flex-col items-center justify-center">
          {incoming && callerSignal && (
            <div className="text-center space-y-8">
              <div className="w-32 h-32 rounded-full bg-accent/20 flex items-center justify-center text-5xl mx-auto relative">
                <span className="animate-ping absolute inset-0 rounded-full bg-accent/20 opacity-20"></span>
                {chatUser.profilePic ? <img src={chatUser.profilePic} className="w-full h-full object-cover rounded-full" alt="" /> : <span className="text-accent font-bold">{chatUser.fullName?.[0] || chatUser.username[0].toUpperCase()}</span>}
              </div>
              <h2 className="text-3xl font-bold">{chatUser.fullName || chatUser.username}</h2>
              <p className="text-text-secondary text-lg">{callType === 'video' ? '📹 Video call' : '📞 Voice call'}</p>
              <div className="flex gap-8 justify-center mt-8">
                <button onClick={rejectCall} className="bg-red-600 hover:bg-red-700 rounded-full p-5 transform transition hover:scale-110"><FiPhoneOff size={32} /></button>
                <button onClick={acceptCall} className="bg-green-600 hover:bg-green-700 rounded-full p-5 transform transition hover:scale-110"><FiPhone size={32} /></button>
              </div>
            </div>
          )}
          {(calling || inCall) && (
            <div className="w-full h-full flex flex-col">
              <div className="flex-1 flex items-center justify-center relative">
                {callType === 'video' && (
                  <>
                    <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
                    <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-6 right-6 w-28 h-40 rounded-xl border-2 border-white object-cover z-10 shadow-2xl" />
                  </>
                )}
                {callType === 'audio' && (
                  <div className="flex flex-col items-center">
                    <div className="w-36 h-36 rounded-full bg-accent/20 flex items-center justify-center text-6xl mb-6 relative">
                      <span className="animate-ping absolute inset-0 rounded-full bg-accent/20 opacity-20"></span>
                      {chatUser.profilePic ? <img src={chatUser.profilePic} className="w-full h-full object-cover rounded-full" /> : <span className="text-accent font-bold">{chatUser.fullName?.[0] || chatUser.username[0].toUpperCase()}</span>}
                    </div>
                    <h2 className="text-2xl font-semibold">{chatUser.fullName || chatUser.username}</h2>
                    <p className="text-text-secondary mt-2 text-lg">{calling ? 'Ringing...' : callTime}</p>
                  </div>
                )}
              </div>
              <div className="bg-gray-900/90 backdrop-blur px-6 py-5 flex items-center justify-center gap-6 rounded-t-3xl">
                <button onClick={toggleMic} className={`p-4 rounded-full transition ${micMuted ? 'bg-red-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'}`}>
                  {micMuted ? <FiMicOff size={22} /> : <FiMic size={22} />}
                </button>
                {callType === 'video' && (
                  <button onClick={toggleVideo} className={`p-4 rounded-full transition ${!videoEnabled ? 'bg-red-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'}`}>
                    {!videoEnabled ? <FiVideoOff size={22} /> : <FiVideo size={22} />}
                  </button>
                )}
                <button onClick={() => {}} className={`p-4 rounded-full transition bg-gray-700 text-white hover:bg-gray-600`}>
                  <FiVolume2 size={22} />
                </button>
                <button onClick={endCall} className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition transform hover:scale-110"><FiPhoneOff size={28} /></button>
              </div>
            </div>
          )}
        </div>
      )}

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
        <button onClick={() => startCall('audio')} className="p-2 hover:bg-gray-700 rounded-full"><FiPhone size={18} /></button>
        <button onClick={() => startCall('video')} className="p-2 hover:bg-gray-700 rounded-full"><FiVideo size={18} /></button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.03\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')" }}>
        {showScrollBtn && (
          <button onClick={scrollToBottom} className="absolute bottom-20 right-4 w-10 h-10 bg-accent text-black rounded-full flex items-center justify-center shadow-lg z-10">↓</button>
        )}
        {messages.map((msg, i) => {
          const isMine = msg.sender._id === user._id;
          const mediaType = msg.mediaType || (msg.image ? getMediaType(msg.image) : 'text');
          const quotedMessage = msg.replyTo;
          return (
            <div key={i} className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              <div className="flex items-end gap-2 max-w-[80%] sm:max-w-[70%]">
                {!isMine && (
                  <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {chatUser.profilePic ? <img src={chatUser.profilePic} className="w-full h-full object-cover" alt="" /> : <span className="text-xs font-bold text-accent">{chatUser.fullName?.[0] || chatUser.username[0].toUpperCase()}</span>}
                  </div>
                )}
                <div className={`relative group px-3 py-1.5 rounded-lg shadow-sm ${isMine ? 'message-sent rounded-br-sm' : 'message-received rounded-bl-sm'}`}>
                  {quotedMessage && (
                    <div className={`text-xs p-1.5 rounded mb-1 opacity-80 ${isMine ? 'bg-black/20' : 'bg-gray-600'}`}>
                      <span className="font-medium text-accent">{quotedMessage.sender?.fullName || quotedMessage.sender?.username || 'User'}</span>
                      <p className="truncate">{quotedMessage.text || (quotedMessage.image ? '📷 Media' : '')}</p>
                    </div>
                  )}
                  {isMine && editingMsgId !== msg._id && (
                    <div className="absolute -top-3 -right-3 flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => startEdit(msg)} className="bg-yellow-500 text-black rounded-full p-0.5"><FiEdit size={10} /></button>
                      <button onClick={() => deleteMsg(msg._id)} className="bg-red-600 text-white rounded-full p-0.5"><FiTrash2 size={10} /></button>
                    </div>
                  )}
                  {editingMsgId === msg._id ? (
                    <div className="flex gap-1">
                      <input type="text" value={editText} onChange={e => setEditText(e.target.value)} className="flex-1 bg-white/20 text-white rounded px-2 py-1 text-xs outline-none" autoFocus />
                      <button onClick={() => submitEdit(msg._id)} className="text-green-400 p-0.5">✓</button>
                      <button onClick={cancelEdit} className="text-red-400 p-0.5">✕</button>
                    </div>
                  ) : (
                    <>
                      {mediaType === 'image' && <ImagePreview src={msg.image} />}
                      {mediaType === 'video' && <VideoPlayer src={msg.image} />}
                      {mediaType === 'audio' && <AudioPlayer src={msg.image} />}
                      {msg.text && <div className="text-sm leading-relaxed"><MessageFormatter text={msg.text} /></div>}
                      {msg.text && msg.updatedAt && msg.createdAt !== msg.updatedAt && new Date(msg.createdAt).getTime() !== new Date(msg.updatedAt).getTime() && <span className="text-xs opacity-60 ml-1">edited</span>}
                    </>
                  )}
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <span className="text-[10px] opacity-60">{(() => { const d = new Date(msg.createdAt); const now = new Date(); const diffDay = Math.floor((now - d) / 86400000); const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); if (diffDay === 0) return time; if (diffDay === 1) return 'Yesterday'; if (diffDay < 7) return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]; return d.toLocaleDateString('en-US',{day:'numeric',month:'short',year:'numeric'}); })()}</span>
                    {renderTick(msg)}
                  </div>
                  {renderReactions(msg)}
                </div>
                <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => setReplyTo(msg)} className="text-xs opacity-60 hover:opacity-100"><FiCornerUpLeft size={14} /></button>
                  <button onClick={() => setReactionPicker(reactionPicker === msg._id ? null : msg._id)} className="text-xs opacity-60 hover:opacity-100"><FiSmile size={14} /></button>
                </div>
                {reactionPicker === msg._id && (
                  <div className={`absolute -top-10 left-0 bg-gray-800 rounded-full px-2 py-1 flex gap-1 shadow-lg z-10 text-sm ${reactingMsgId === msg._id ? 'animate-react-pop' : ''}`}>
                    {QUICK_EMOJIS.map(e => <button key={e} onClick={() => reactToMsg(msg._id, e)} className="hover:scale-125 transition-transform">{e}</button>)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply bar */}
      {replyTo && (
        <div className="bg-sidebar-bg px-4 py-2 flex items-center gap-3 border-t border-gray-700">
          <FiCornerUpLeft size={16} className="text-accent" />
          <div className="flex-1 text-xs text-text-secondary truncate">
            <span className="font-medium text-accent">{replyTo.sender?.fullName || replyTo.sender?.username || 'User'}</span>
            <span className="ml-1">{replyTo.text || 'Media'}</span>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-white p-1">✕</button>
        </div>
      )}

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
              <button onClick={() => { setShowGifModal(!showGifModal); setShowAttachMenu(false); }} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-700 text-white"><FiFilm size={16} /> GIF</button>
            </div>
          )}
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
        {newMsg.trim() ? (
          <button type="submit" className="text-accent hover:text-accent-hover p-1"><FiSend size={22} /></button>
        ) : isRecording ? (
          <button type="button" onClick={stopRecording} className="text-red-400 p-1"><FiStopCircle size={22} /></button>
        ) : (
          <button type="button" onClick={startRecording} className="text-gray-400 hover:text-accent p-1"><FiMic size={22} /></button>
        )}
      </form>
    </div>
  );
};

export default ChatRoomPage;
