import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import axios from 'axios';
import {
  FiArrowLeft, FiSend, FiSmile, FiMic, FiStopCircle,
  FiPlusCircle, FiImage, FiVideo, FiMoreVertical,
  FiSlash, FiCheckCircle, FiUserX, FiTrash, FiCornerUpLeft, FiEdit,
  FiPhone, FiPhoneOff, FiMicOff, FiVideoOff, FiVolume2
} from 'react-icons/fi';
import { io } from 'socket.io-client';
import AudioPlayer from '../engines/AudioPlayer';

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
  const [showMoreMenu, setShowMoreMenu] = useState(false);
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
      setShowMoreMenu(false);
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

  if (loading) return <div className="h-screen bg-chat-bg flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div></div>;
  if (!chatUser) return <div className="h-screen bg-chat-bg flex flex-col items-center justify-center"><p className="mb-4 text-text-secondary">{error || 'Failed to load chat'}</p><button onClick={() => window.location.reload()} className="bg-primary text-white px-4 py-2 rounded-full text-sm font-medium">Retry</button></div>;

  const isOnline = onlineUsers.includes(chatUser._id);
  const statusText = isOnline ? 'Online' : getLastSeenText(chatUser.lastSeen);

  return (
    <div className="h-screen flex flex-col bg-chat-bg text-white w-full">
      {/* Call Overlay */}
      {(inCall || calling || incoming) && (
        <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center">
          {incoming && callerSignal && (
            <div className="text-center space-y-6">
              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto text-4xl font-bold text-primary">
                {chatUser.fullName?.[0] || chatUser.username[0].toUpperCase()}
              </div>
              <h2 className="text-2xl font-bold">{chatUser.fullName || chatUser.username}</h2>
              <p className="text-text-secondary">{callType === 'video' ? 'Video call' : 'Voice call'}</p>
              <div className="flex gap-6 justify-center mt-4">
                <button onClick={rejectIncomingCall} className="bg-danger text-white rounded-full p-5"><FiPhoneOff size={28} /></button>
                <button onClick={acceptIncomingCall} className="bg-success text-white rounded-full p-5"><FiPhone size={28} /></button>
              </div>
            </div>
          )}
          {(calling || inCall) && (
            <div className="w-full h-full flex flex-col">
              <div className="flex-1 flex items-center justify-center">
                {callType === 'video' && (
                  <>
                    <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
                    <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-6 right-6 w-24 h-36 rounded-xl border-2 border-white object-cover z-10" />
                  </>
                )}
                {callType === 'audio' && (
                  <div className="text-center">
                    <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center text-5xl font-bold text-primary mx-auto mb-4">
                      {chatUser.fullName?.[0] || chatUser.username[0].toUpperCase()}
                    </div>
                    <h2 className="text-xl font-semibold">{chatUser.fullName || chatUser.username}</h2>
                    <p className="text-text-secondary mt-2">{calling ? 'Ringing...' : `${Math.floor(callDuration/60)}:${(callDuration%60).toString().padStart(2,'0')}`}</p>
                  </div>
                )}
              </div>
              <div className="bg-gray-900/90 backdrop-blur px-6 py-5 flex items-center justify-center gap-6 rounded-t-3xl">
                <button onClick={toggleMic} className={`p-4 rounded-full ${micMuted ? 'bg-danger text-white' : 'bg-gray-700'}`}>
                  {micMuted ? <FiMicOff size={22} /> : <FiMic size={22} />}
                </button>
                {callType === 'video' && (
                  <button onClick={toggleVideo} className={`p-4 rounded-full ${videoOff ? 'bg-danger text-white' : 'bg-gray-700'}`}>
                    {videoOff ? <FiVideoOff size={22} /> : <FiVideo size={22} />}
                  </button>
                )}
                <button onClick={toggleSpeaker} className={`p-4 rounded-full ${speakerOn ? 'bg-gray-700' : 'bg-primary'}`}>
                  <FiVolume2 size={22} />
                </button>
                <button onClick={endCall} className="p-4 rounded-full bg-danger text-white"><FiPhoneOff size={28} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <header className="h-16 sm:h-[72px] flex items-center gap-3 px-4 bg-dark-blue border-b border-gray-700/50">
        <Link to="/" className="text-white hover:text-primary p-1"><FiArrowLeft size={22} /></Link>
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
          <button onClick={() => setShowMoreMenu(!showMoreMenu)} className="p-2 hover:bg-gray-700 rounded-full"><FiMoreVertical size={18} /></button>
          {showMoreMenu && (
            <div className="absolute right-0 top-full mt-1 bg-surface rounded-xl shadow-2 border border-border-light py-1 z-30 w-40 text-sm">
              <button onClick={handleBlock} className={`w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 transition ${isBlocked ? 'text-success' : 'text-danger'}`}>
                {isBlocked ? <><FiCheckCircle size={14} /> Unblock User</> : <><FiSlash size={14} /> Block User</>}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Rest of the component (messages, input) unchanged, use same as last working version */}
    </div>
  );
};

export default ChatRoomPage;
