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

/* ---------- helpers ---------- */
const getLastSeenText = (d) => {
  if (!d) return 'Last seen long ago';
  const date = new Date(d), now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return 'Last seen just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Last seen ${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `Last seen ${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'Last seen yesterday';
  if (diffDay < 7) return `Last seen ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getDay()]}`;
  return `Last seen ${date.toLocaleDateString('en-US',{day:'numeric',month:'short'})}`;
};

const formatMsgTime = (d) => {
  const date = new Date(d), now = new Date();
  const diffDay = Math.floor((now - date) / 86400000);
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDay === 0) return time;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getDay()];
  return date.toLocaleDateString('en-US',{day:'numeric',month:'short',year:'numeric'});
};

const QUICK_EMOJIS = ['❤️','😂','👍','😮','😢','🔥'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const isVideoLink = (url) => /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(url) || /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/.test(url) || /vimeo\.com\/(\d+)/.test(url);
const getYouTubeId = (url) => (url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/) || [])[1] || null;
const getVimeoId = (url) => (url.match(/vimeo\.com\/(\d+)/) || [])[1] || null;
const urlRegex = /(https?:\/\/[^\s]+)/g;

const renderTextWithLinks = (text) => {
  if (!text) return null;
  const elements = [];
  let lastIndex = 0, match;
  const regex = new RegExp(urlRegex);
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) elements.push(<span key={lastIndex}>{text.slice(lastIndex, match.index)}</span>);
    const url = match[0];
    const ytId = getYouTubeId(url);
    const vimeoId = getVimeoId(url);
    const isDirectVideo = /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(url);
    if (ytId || vimeoId || isDirectVideo) {
      elements.push(<a key={match.index} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-300 underline">{url}</a>);
      if (ytId) {
        elements.push(<div key={`yt-${match.index}`} className="mt-1"><img src={`https://img.youtube.com/vi/${ytId}/0.jpg`} className="rounded-lg max-w-full cursor-pointer" onClick={() => window.open(url, '_blank')} alt="" /></div>);
      } else if (vimeoId) {
        elements.push(<div key={`vimeo-${match.index}`} className="mt-1"><img src={`https://vumbnail.com/${vimeoId}.jpg`} className="rounded-lg max-w-full cursor-pointer" onClick={() => window.open(url, '_blank')} alt="" /></div>);
      } else if (isDirectVideo) {
        elements.push(<div key={`vid-${match.index}`} className="mt-1"><video controls className="max-w-full rounded-lg" style={{ maxHeight: '200px' }}><source src={url} /></video></div>);
      }
    } else {
      elements.push(<a key={match.index} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-300 underline">{url}</a>);
    }
    lastIndex = match.index + url.length;
  }
  if (lastIndex < text.length) elements.push(<span key={lastIndex}>{text.slice(lastIndex)}</span>);
  return elements;
};

/* ---------- ICE servers ---------- */
const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:updown.metered.live:443?transport=tcp',
      username: '81900d4e96d01f518684bc5a',
      credential: 'bo8JgogjdLo7sUNX',
    },
  ],
};

/* ---------- component ---------- */
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

  // call states (same as before, omitted for brevity but keep them)
  const [inCall, setInCall] = useState(false);
  const [calling, setCalling] = useState(false);
  const [incoming, setIncoming] = useState(false);
  const [callerSignal, setCallerSignal] = useState(null);
  const [callType, setCallType] = useState('audio');
  const [callDuration, setCallDuration] = useState(0);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [micMuted, setMicMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const callTimerRef = useRef(null);
  const ringtoneRef = useRef(null);

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

    socketRef.current.on('incoming-call', ({ callerId, signal, callType }) => {
      setCallerSignal({ callerId, signal });
      setCallType(callType);
      setIncoming(true);
      playRingtone();
    });

    socketRef.current.on('call-accepted', ({ signal }) => {
      stopRingtone();
      if (peerRef.current) peerRef.current.setRemoteDescription(new RTCSessionDescription(signal));
      setCalling(false); setInCall(true); startCallTimer();
    });

    socketRef.current.on('call-rejected', () => { stopRingtone(); setCalling(false); setInCall(false); cleanupCall(); alert('Call rejected'); });
    socketRef.current.on('call-ended', () => { stopRingtone(); setInCall(false); setIncoming(false); setCalling(false); cleanupCall(); });
    socketRef.current.on('call-failed', ({ message }) => { stopRingtone(); alert(message); setCalling(false); });
    socketRef.current.on('ice-candidate', ({ candidate }) => { if (peerRef.current) try { peerRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) {} });

    socketRef.current.emit('set-username', user.username);
    return () => { stopRingtone(); socketRef.current.disconnect(); };
  }, [userId, setSelectedUser, user.username]);

  // call functions (keep existing, omitted for brevity)
  const startCall = async (type) => { /* ... */ };
  const acceptIncomingCall = async () => { /* ... */ };
  const rejectIncomingCall = () => { /* ... */ };
  const endCall = () => { /* ... */ };
  const cleanupCall = () => { /* ... */ };
  const startCallTimer = () => { /* ... */ };
  const toggleMic = () => { /* ... */ };
  const toggleVideo = () => { /* ... */ };
  const toggleSpeaker = () => { /* ... */ };
  const playRingtone = () => { /* ... */ };
  const stopRingtone = () => { /* ... */ };

  // file upload
  const uploadFile = async (file, type) => { /* same as before */ };
  const handleImageSelect = (e) => { /* same */ };
  const handleVideoSelect = (e) => { /* same */ };
  const startRecording = async () => { /* same */ };
  const stopRecording = () => { /* same */ };
  const deleteMsg = async (id) => { /* same */ };
  const reactToMsg = (msgId, emoji) => { /* same */ };
  const startEdit = (msg) => { /* same */ };
  const cancelEdit = () => { /* same */ };
  const submitEdit = async (msgId) => { /* same */ };
  const handleTyping = () => { /* same */ };
  const handleSend = (e) => { e.preventDefault(); if (newMsg.trim()) { sendMessage(newMsg, replyTo?._id); setNewMsg(''); setReplyTo(null); } };

  const renderTick = (msg) => { /* same */ };
  const renderReactions = (msg) => { /* same */ };
  const formatRecTime = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
  const getMediaType = (url) => { /* same */ };

  if (!chatUser) return <div className="h-screen bg-chat-bg flex items-center justify-center text-white">Loading...</div>;

  const isOnline = onlineUsers.includes(chatUser._id);
  const statusText = isOnline ? 'Online' : getLastSeenText(chatUser.lastSeen);

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
        <button onClick={() => startCall('audio')} className="p-2 hover:bg-gray-700 rounded-full"><FiPhone size={18} /></button>
        <button onClick={() => startCall('video')} className="p-2 hover:bg-gray-700 rounded-full"><FiVideo size={18} /></button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.03\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')" }}>
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
                      {mediaType === 'image' && <img src={msg.image} className="rounded-lg mb-0.5 max-w-full" alt="" />}
                      {mediaType === 'video' && <video controls className="max-w-full rounded-lg mb-0.5" style={{maxHeight:'180px'}}><source src={msg.image} /></video>}
                      {mediaType === 'audio' && <audio controls className="w-full mb-0.5" style={{height:'30px'}}><source src={msg.image} /></audio>}
                      {msg.text && <div className="text-sm leading-relaxed">{renderTextWithLinks(msg.text)}</div>}
                      {msg.text && msg.updatedAt && msg.createdAt !== msg.updatedAt && new Date(msg.createdAt).getTime() !== new Date(msg.updatedAt).getTime() && <span className="text-xs opacity-60 ml-1">edited</span>}
                    </>
                  )}
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <span className="text-[10px] opacity-60">{formatMsgTime(msg.createdAt)}</span>
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
          <button type="button" onClick={() => setReactionPicker('input')} className="text-gray-400 hover:text-accent p-1">
            <FiSmile size={18} />
          </button>
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
