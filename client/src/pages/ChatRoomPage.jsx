import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import axios from 'axios';
import {
  FiArrowLeft, FiSend, FiSmile, FiMic, FiStopCircle,
  FiPlusCircle, FiImage, FiVideo, FiPhone, FiPhoneOff,
  FiMicOff, FiVideoOff, FiVolume2, FiCornerUpLeft, FiEdit,
  FiTrash, FiSlash, FiCheckCircle, FiUserX
} from 'react-icons/fi';
import { io } from 'socket.io-client';
import BottomNav from '../components/BottomNav';

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
  if (diffDay < 7) return `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getDay()]}`;
  return date.toLocaleDateString('en-US',{day:'numeric',month:'short'});
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
      elements.push(<a key={match.index} href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">{url}</a>);
      if (ytId) {
        elements.push(<div key={`yt-${match.index}`} className="mt-1"><img src={`https://img.youtube.com/vi/${ytId}/0.jpg`} className="rounded-lg max-w-full cursor-pointer" onClick={() => window.open(url, '_blank')} alt="" /></div>);
      } else if (vimeoId) {
        elements.push(<div key={`vimeo-${match.index}`} className="mt-1"><img src={`https://vumbnail.com/${vimeoId}.jpg`} className="rounded-lg max-w-full cursor-pointer" onClick={() => window.open(url, '_blank')} alt="" /></div>);
      } else {
        elements.push(<div key={`vid-${match.index}`} className="mt-1"><video controls className="max-w-full rounded-lg" style={{ maxHeight: '200px' }}><source src={url} /></video></div>);
      }
    } else {
      elements.push(<a key={match.index} href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">{url}</a>);
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typingUser, setTypingUser] = useState(null);
  const [reactionPicker, setReactionPicker] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteMenuPos, setDeleteMenuPos] = useState({ x: 0, y: 0 });
  const socketRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const messagesEndRef = useRef(null);
  const longPressTimer = useRef(null);

  // Call states
  const [inCall, setInCall] = useState(false);
  const [calling, setCalling] = useState(false);
  const [incoming, setIncoming] = useState(false);
  const [callerSignal, setCallerSignal] = useState(null);
  const [callType, setCallType] = useState('audio');
  const [callDuration, setCallDuration] = useState(0);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [micMuted, setMicMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const callTimerRef = useRef(null);
  const ringtoneRef = useRef(null);

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  /* ---------- ringtone ---------- */
  const playRingtone = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      ringtoneRef.current = ctx;
      const beep = () => {
        if (ctx.state === 'closed') return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square'; osc.frequency.value = 800;
        gain.gain.value = 0.12;
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.stop(ctx.currentTime + 0.6);
      };
      beep();
      const interval = setInterval(() => { if (ctx.state !== 'closed') beep(); else clearInterval(interval); }, 2000);
      ctx.interval = interval;
    } catch (e) {}
  };

  const stopRingtone = () => {
    if (ringtoneRef.current) {
      if (ringtoneRef.current.interval) clearInterval(ringtoneRef.current.interval);
      ringtoneRef.current.close();
      ringtoneRef.current = null;
    }
  };

  useEffect(() => {
    setLoading(true);
    socketRef.current = io('https://updown-hms5.onrender.com');
    axios.get('https://updown-hms5.onrender.com/api/auth/users')
      .then(res => {
        const found = (Array.isArray(res.data) ? res.data : []).find(u => u._id === userId);
        if (found) { setChatUser(found); setSelectedUser(found); }
        else setChatUser({ _id: userId, username: 'Unknown', fullName: 'User' });
        return axios.get('https://updown-hms5.onrender.com/api/auth/blocked', config);
      })
      .then(res => {
        const blocked = Array.isArray(res.data) ? res.data : [];
        setIsBlocked(blocked.some(b => b._id === userId));
        setLoading(false);
      })
      .catch(() => {
        setChatUser({ _id: userId, username: 'Unknown', fullName: 'User' });
        setError('Could not load chat');
        setLoading(false);
      });

    socketRef.current.on('user typing', setTypingUser);
    socketRef.current.on('user stop typing', () => setTypingUser(null));

    // Call listeners
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
    socketRef.current.on('call-rejected', () => {
      stopRingtone();
      setCalling(false); setInCall(false); cleanupCall(); alert('Call rejected');
    });
    socketRef.current.on('call-ended', () => {
      stopRingtone();
      setInCall(false); setIncoming(false); setCalling(false); cleanupCall();
    });
    socketRef.current.on('call-failed', ({ message }) => {
      stopRingtone();
      alert(message); setCalling(false);
    });
    socketRef.current.on('ice-candidate', ({ candidate }) => {
      if (peerRef.current) {
        try { peerRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) {}
      }
    });

    return () => { stopRingtone(); socketRef.current.disconnect(); };
  }, [userId]);

  /* ---------- call logic ---------- */
  const startCall = async (type) => {
    if (!socketRef.current?.connected) { alert('Connection lost. Please refresh.'); return; }
    setCallType(type);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const peer = new RTCPeerConnection(iceServers);
      peerRef.current = peer;
      stream.getTracks().forEach(track => peer.addTrack(track, stream));
      peer.onicecandidate = (e) => {
        if (e.candidate) socketRef.current.emit('ice-candidate', { to: userId, candidate: e.candidate });
      };
      peer.ontrack = (e) => {
        if (e.streams && e.streams[0]) {
          setRemoteStream(e.streams[0]);
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
        }
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socketRef.current.emit('call-user', { callerId: user._id, receiverId: userId, signal: offer, callType: type });
      setCalling(true);
    } catch (err) {
      if (err.name === 'NotAllowedError') alert('Please allow camera & microphone in browser settings.');
      else if (err.name === 'NotFoundError') alert('No camera or microphone found.');
      else alert('Call failed: ' + err.message);
    }
  };

  const acceptIncomingCall = async () => {
    if (!callerSignal) return;
    stopRingtone();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callType === 'video' });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const peer = new RTCPeerConnection(iceServers);
      peerRef.current = peer;
      stream.getTracks().forEach(track => peer.addTrack(track, stream));
      peer.onicecandidate = (e) => {
        if (e.candidate) socketRef.current.emit('ice-candidate', { to: callerSignal.callerId, candidate: e.candidate });
      };
      peer.ontrack = (e) => {
        if (e.streams && e.streams[0]) {
          setRemoteStream(e.streams[0]);
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
        }
      };

      await peer.setRemoteDescription(new RTCSessionDescription(callerSignal.signal));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socketRef.current.emit('accept-call', { callerId: callerSignal.callerId, signal: answer });
      setIncoming(false); setInCall(true); startCallTimer();
    } catch (err) {
      if (err.name === 'NotAllowedError') alert('Please allow camera & microphone.');
      else alert('Could not answer: ' + err.message);
    }
  };

  const rejectIncomingCall = () => {
    stopRingtone();
    if (callerSignal) socketRef.current.emit('reject-call', { callerId: callerSignal.callerId });
    setIncoming(false); setCallerSignal(null);
  };

  const endCall = () => {
    stopRingtone();
    if (peerRef.current) peerRef.current.close();
    socketRef.current.emit('end-call', { to: userId });
    cleanupCall(); setInCall(false); setCalling(false); setIncoming(false);
  };

  const cleanupCall = () => {
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    setLocalStream(null); setRemoteStream(null);
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    clearInterval(callTimerRef.current);
    setCallDuration(0);
  };

  const startCallTimer = () => {
    callTimerRef.current = setInterval(() => setCallDuration(prev => prev + 1), 1000);
  };

  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = !t.enabled);
      setMicMuted(!micMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => t.enabled = !t.enabled);
      setVideoOff(!videoOff);
    }
  };

  const toggleSpeaker = () => setSpeakerOn(!speakerOn);

  const handleBlock = async () => {
    if (!confirm(isBlocked ? 'Unblock this user?' : 'Block this user?')) return;
    try {
      if (isBlocked) {
        await axios.put(`https://updown-hms5.onrender.com/api/auth/unblock/${userId}`, {}, config);
        setIsBlocked(false);
      } else {
        await axios.put(`https://updown-hms5.onrender.com/api/auth/block/${userId}`, {}, config);
        setIsBlocked(true);
      }
    } catch (err) { alert(err.response?.data?.message || 'Action failed'); }
  };

  const reactToMsg = (emoji) => {
    if (!reactionPicker) return;
    const convId = [user._id, userId].sort().join('_');
    socketRef.current?.emit('react to message', { messageId: reactionPicker, emoji, userId: user._id, conversationId: convId });
    setReactionPicker(null);
  };

  const deleteForMe = (msgId) => {
    setMessages(prev => prev.filter(m => m._id !== msgId));
    setDeleteTarget(null);
  };

  const deleteForEveryone = async (msgId) => {
    try {
      await axios.delete(`https://updown-hms5.onrender.com/api/messages/${msgId}`, config);
      const convId = [user._id, userId].sort().join('_');
      socketRef.current?.emit('delete message', { messageId: msgId, conversationId: convId });
      setMessages(prev => prev.filter(m => m._id !== msgId));
    } catch (err) { alert(err.response?.data?.message || 'Delete failed'); }
    setDeleteTarget(null);
  };

  const handleMessageClick = (e, msg) => setReactionPicker(reactionPicker === msg._id ? null : msg._id);

  const handleTouchStart = (e, msg) => {
    longPressTimer.current = setTimeout(() => {
      const rect = e.currentTarget.getBoundingClientRect();
      setDeleteTarget(msg);
      setDeleteMenuPos({ x: rect.left + rect.width / 2, y: rect.top - 10 });
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };

  const handleMouseDown = (e, msg) => {
    longPressTimer.current = setTimeout(() => {
      const rect = e.currentTarget.getBoundingClientRect();
      setDeleteTarget(msg);
      setDeleteMenuPos({ x: rect.left + rect.width / 2, y: rect.top - 10 });
    }, 500);
  };

  const handleMouseUp = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };

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
            const { data } = await axios.post('https://updown-hms5.onrender.com/api/upload/audio', { audio: reader.result }, config);
            socketRef.current?.emit('send message', { senderId: user._id, receiverId: userId, text: '', image: data.audioUrl, mediaType: 'audio' });
          } catch (err) { alert('Audio upload failed'); }
        };
        reader.readAsDataURL(blob);
      };
      recorder.start(); setIsRecording(true);
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
      const result = await new Promise((res, rej) => { reader.onload = () => res(reader.result); reader.onerror = rej; reader.readAsDataURL(file); });
      const endpoint = type === 'image' ? '/api/upload/image' : '/api/upload/video';
      const field = type === 'image' ? 'image' : 'video';
      const { data } = await axios.post(`https://updown-hms5.onrender.com${endpoint}`, { [field]: result }, config);
      const url = type === 'image' ? data.imageUrl : data.videoUrl;
      socketRef.current?.emit('send message', { senderId: user._id, receiverId: userId, text: '', image: url, mediaType: type });
    } catch (err) { alert(err.response?.data?.message || err.message || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const handleImageSelect = (e) => { if (e.target.files[0]) uploadFile(e.target.files[0], 'image'); e.target.value = ''; };
  const handleVideoSelect = (e) => { if (e.target.files[0]) uploadFile(e.target.files[0], 'video'); e.target.value = ''; };

  const handleSend = (e) => {
    e.preventDefault();
    if (isBlocked) return alert('You have blocked this user. Unblock to send messages.');
    if (newMsg.trim()) { sendMessage(newMsg, replyTo?._id); setNewMsg(''); setReplyTo(null); }
  };

  const renderTick = (msg) => {
    if (msg.sender?._id !== user._id) return null;
    switch (msg.status) {
      case 'sent': return <span className="text-[10px] opacity-60 ml-0.5">✔</span>;
      case 'delivered': return <span className="text-[10px] opacity-80 ml-0.5">✔✔</span>;
      case 'read': return <span className="text-[10px] text-primary ml-0.5">✔✔</span>;
      default: return <span className="text-[10px] opacity-40 ml-0.5">🕒</span>;
    }
  };

  const renderReactions = (msg) => {
    if (!msg.reactions || Object.keys(msg.reactions).length === 0) return null;
    return (
      <div className="flex gap-1 mt-1 flex-wrap">
        {Object.entries(msg.reactions).map(([emoji, ids]) => (
          <span key={emoji} className="text-xs bg-black/20 rounded-full px-1.5 py-0.5">{emoji} {ids.length > 1 && <span className="text-[10px]">{ids.length}</span>}</span>
        ))}
      </div>
    );
  };

  const formatRecTime = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
  const getMediaType = (url) => {
    if (/\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(url)) return 'video';
    if (/\.(mp3|wav|aac|m4a|flac)$/i.test(url)) return 'audio';
    if (/\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(url)) return 'image';
    return 'unknown';
  };

  if (loading) return <div className="h-screen bg-chat-bg flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div></div>;
  if (!chatUser) return <div className="h-screen bg-chat-bg flex flex-col items-center justify-center"><p className="mb-4 text-text-secondary">{error || 'Failed to load chat'}</p><button onClick={() => window.location.reload()} className="bg-primary text-white px-4 py-2 rounded-full text-sm font-medium">Retry</button></div>;

  const isOnline = onlineUsers.includes(chatUser._id);
  const statusText = isOnline ? 'Online' : getLastSeenText(chatUser.lastSeen);

  return (
    <div className="h-screen flex flex-col bg-chat-bg text-primary w-full pb-20">
      {/* Header */}
      <header className="h-16 sm:h-[72px] flex items-center gap-3 px-4 bg-dark-blue border-b border-border-light">
        <Link to="/" className="text-primary hover:text-primary p-1"><FiArrowLeft size={22} /></Link>
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
          {chatUser.profilePic ? <img src={chatUser.profilePic} className="w-full h-full object-cover" alt="" /> : <span className="text-lg font-bold text-primary">{chatUser.fullName?.[0] || chatUser.username[0].toUpperCase()}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-[15px] truncate">{chatUser.fullName || chatUser.username}</h2>
          <p className={`text-xs ${isOnline ? 'text-success' : 'text-text-secondary'}`}>{typingUser ? `${typingUser} is typing...` : statusText}</p>
        </div>
        <button onClick={() => startCall('audio')} className="p-2 hover:bg-gray-700 rounded-full"><FiPhone size={18} /></button>
        <button onClick={() => startCall('video')} className="p-2 hover:bg-gray-700 rounded-full"><FiVideo size={18} /></button>
        <div className="relative">
          <button onClick={handleBlock} className="p-2 hover:bg-gray-700 rounded-full">
            {isBlocked ? <FiCheckCircle size={18} className="text-success" /> : <FiSlash size={18} />}
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.03\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')" }}>
        {messages.map((msg, i) => {
          const isMine = msg.sender?._id === user._id;
          const mediaType = msg.mediaType || (msg.image ? (msg.image.match(/\.(mp4|webm|ogg)$/) ? 'video' : 'image') : 'text');
          return (
            <div key={i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`px-4 py-2.5 rounded-2xl max-w-[80%] sm:max-w-[70%] cursor-pointer select-none ${isMine ? 'message-sent rounded-br-md' : 'message-received rounded-bl-md'} relative group`}
                onClick={(e) => handleMessageClick(e, msg)}
                onTouchStart={(e) => handleTouchStart(e, msg)}
                onTouchEnd={handleTouchEnd}
                onMouseDown={(e) => handleMouseDown(e, msg)}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {mediaType === 'image' && <img src={msg.image} className="rounded-xl mb-2 max-w-full pointer-events-none" alt="" />}
                {mediaType === 'video' && <video controls className="max-w-full rounded-xl mb-2 pointer-events-none" style={{maxHeight:'200px'}}><source src={msg.image} /></video>}
                mediaType === 'audio' && <audio controls src={msg.image} className="w-full mb-1" style={{height:'30px'}} preload="metadata" />
                {msg.text && <div className="text-[13px] leading-relaxed pointer-events-none">{renderTextWithLinks(msg.text)}</div>}
                <div className="flex items-center justify-end gap-1.5 mt-1.5">
                  <span className="text-[11px] opacity-70 font-medium">{formatMsgTime(msg.createdAt)}</span>
                  {renderTick(msg)}
                </div>
                {renderReactions(msg)}
                {reactionPicker === msg._id && (
                  <div className="absolute -top-14 left-0 bg-surface rounded-full px-2 py-1.5 flex gap-1.5 shadow-2 z-50" onClick={(e) => e.stopPropagation()} style={{ pointerEvents: 'auto' }}>
                    {QUICK_EMOJIS.map(e => (
                      <button key={e} onClick={() => reactToMsg(e)} className="hover:scale-125 transition-transform text-lg">{e}</button>
                    ))}
                  </div>
                )}
                {deleteTarget === msg._id && (
                  <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-surface rounded-xl shadow-3 border border-border-light py-1 z-50 w-40 text-sm">
                    <button onClick={() => deleteForMe(msg._id)} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 transition text-left"><FiUserX size={14} /> Delete for me</button>
                    {isMine && <button onClick={() => deleteForEveryone(msg._id)} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 transition text-left text-danger"><FiTrash size={14} /> Delete for everyone</button>}
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
        <div className="bg-sidebar-bg px-4 py-2 flex items-center gap-3 border-t border-border-light">
          <FiCornerUpLeft size={16} className="text-primary" />
          <div className="flex-1 text-xs text-text-secondary truncate">
            <span className="font-medium text-primary">{replyTo.sender?.fullName || replyTo.sender?.username || 'User'}</span>
            <span className="ml-1">{replyTo.text || 'Media'}</span>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-primary p-1">✕</button>
        </div>
      )}

      {/* Composer */}
      <form onSubmit={handleSend} className="px-3 py-3 bg-sidebar-bg border-t border-border-light flex items-center gap-3">
        <input type="file" accept="image/*" ref={imageInputRef} onChange={handleImageSelect} className="hidden" />
        <input type="file" accept="video/*" ref={videoInputRef} onChange={handleVideoSelect} className="hidden" />
        <button type="button" onClick={() => setShowAttachMenu(!showAttachMenu)} className="text-gray-400 hover:text-primary p-1.5 relative">
          <FiPlusCircle size={24} />
          {showAttachMenu && (
            <div className="absolute bottom-full left-0 mb-2 bg-surface rounded-xl shadow-2 border border-border-light p-2 flex flex-col gap-1 z-20 text-sm">
              <button onClick={() => { imageInputRef.current?.click(); setShowAttachMenu(false); }} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50"><FiImage size={16} /> Image</button>
              <button onClick={() => { videoInputRef.current?.click(); setShowAttachMenu(false); }} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50"><FiVideo size={16} /> Video</button>
            </div>
          )}
        </button>
        <div className="flex-1 flex items-center bg-bg-input rounded-full h-12 px-5 border border-border-light focus-within:border-primary focus-within:shadow-sm transition">
          <input
            type="text"
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            placeholder={isBlocked ? "You blocked this user" : "Message"}
            className="flex-1 bg-transparent outline-none text-[14px] text-primary placeholder-text-muted"
            disabled={isBlocked}
          />
          <button type="button" onClick={() => setReactionPicker('composer')} className="text-gray-400 hover:text-primary p-1">
            <FiSmile size={20} />
          </button>
        </div>
        {isRecording ? (
          <button type="button" onClick={stopRecording} className="text-danger p-1.5 animate-pulse"><FiStopCircle size={24} /></button>
        ) : newMsg.trim() && !isBlocked ? (
          <button type="submit" className="text-primary hover:text-primary-dark p-1.5"><FiSend size={24} /></button>
        ) : !isBlocked ? (
          <button type="button" onClick={startRecording} className="text-gray-400 hover:text-primary p-1.5"><FiMic size={24} /></button>
        ) : null}
      </form>
      <BottomNav />
    </div>
  );
};

export default ChatRoomPage;
