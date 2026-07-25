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
  if (diffDay === 1) return 'Yesterday ' + time;
  if (diffDay < 7) return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getDay()] + ' ' + time;
  return date.toLocaleDateString('en-US',{day:'numeric',month:'short',year:'numeric'}) + ' ' + time;
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
        elements.push(<div key={`yt-${match.index}`} className="mt-1"><img src={`https://img.youtube.com/vi/${ytId}/0.jpg`} className="rounded-lg max-w-full cursor-pointer" onClick={() => window.open(url, '_blank')} alt="YouTube" /></div>);
      } else if (vimeoId) {
        elements.push(<div key={`vimeo-${match.index}`} className="mt-1"><img src={`https://vumbnail.com/${vimeoId}.jpg`} className="rounded-lg max-w-full cursor-pointer" onClick={() => window.open(url, '_blank')} alt="Vimeo" /></div>);
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

const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
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
  const [reactingMsgId, setReactingMsgId] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editText, setEditText] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showGifModal, setShowGifModal] = useState(false);
  const [gifSearch, setGifSearch] = useState('');
  const [gifResults, setGifResults] = useState([]);
  const [searchingGif, setSearchingGif] = useState(false);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // call states
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

  const playRingtone = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      ringtoneRef.current = ctx;
      const beep = () => {
        if (ctx.state === 'closed') return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = 800;
        gain.gain.value = 0.12;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.stop(ctx.currentTime + 0.6);
      };
      beep();
      const interval = setInterval(() => {
        if (ctx.state === 'closed') clearInterval(interval);
        else beep();
      }, 2000);
      ctx.interval = interval;
    } catch (e) {}
  };

  const stopRingtone = () => {
    if (ringtoneRef.current) {
      const ctx = ringtoneRef.current;
      if (ctx.interval) clearInterval(ctx.interval);
      ctx.close();
      ringtoneRef.current = null;
    }
  };

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
    socketRef.current.on('message edited', (editedMsg) => {
      setMessages(prev => prev.map(m => m._id === editedMsg._id ? editedMsg : m));
    });
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
      if (peerRef.current) try { peerRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) {}
    });

    socketRef.current.emit('set-username', user.username);

    return () => {
      stopRingtone();
      socketRef.current.disconnect();
    };
  }, [userId, setSelectedUser, user.username]);

  // call logic
  const startCall = async (type) => {
    setCallType(type);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const peer = new RTCPeerConnection(iceServers); peerRef.current = peer;
      stream.getTracks().forEach(track => peer.addTrack(track, stream));
      peer.onicecandidate = (e) => { if (e.candidate) socketRef.current.emit('ice-candidate', { to: userId, candidate: e.candidate }); };
      peer.ontrack = (e) => { if (e.streams && e.streams[0]) { setRemoteStream(e.streams[0]); if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0]; } };
      const offer = await peer.createOffer(); await peer.setLocalDescription(offer);
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
      const peer = new RTCPeerConnection(iceServers); peerRef.current = peer;
      stream.getTracks().forEach(track => peer.addTrack(track, stream));
      peer.onicecandidate = (e) => { if (e.candidate) socketRef.current.emit('ice-candidate', { to: callerSignal.callerId, candidate: e.candidate }); };
      peer.ontrack = (e) => { if (e.streams && e.streams[0]) { setRemoteStream(e.streams[0]); if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0]; } };
      await peer.setRemoteDescription(new RTCSessionDescription(callerSignal.signal));
      const answer = await peer.createAnswer(); await peer.setLocalDescription(answer);
      socketRef.current.emit('accept-call', { callerId: callerSignal.callerId, signal: answer });
      setIncoming(false); setInCall(true); startCallTimer();
    } catch (err) {
      if (err.name === 'NotAllowedError') alert('Please allow camera & microphone.');
      else alert('Could not answer: ' + err.message);
    }
  };

  const rejectIncomingCall = () => {
    stopRingtone();
    socketRef.current.emit('reject-call', { callerId: callerSignal.callerId });
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
    clearInterval(callTimerRef.current); setCallDuration(0);
  };

  const startCallTimer = () => { callTimerRef.current = setInterval(() => setCallDuration(p => p + 1), 1000); };
  const toggleMic = () => { if (localStream) { localStream.getAudioTracks().forEach(t => t.enabled = !t.enabled); setMicMuted(!micMuted); } };
  const toggleVideo = () => { if (localStream) { localStream.getVideoTracks().forEach(t => t.enabled = !t.enabled); setVideoEnabled(!videoEnabled); } };
  const toggleSpeaker = () => setSpeakerOn(!speakerOn);

  // file upload
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
      socketRef.current.emit('send message', { senderId: user._id, receiverId: userId, text: '', image: url, mediaType: type });
      socketRef.current?.emit('stop typing', { conversationId: [user._id, userId].sort().join('_') });
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
            socketRef.current.emit('send message', { senderId: user._id, receiverId: userId, text: '', image: data.audioUrl, mediaType: 'audio' });
            socketRef.current?.emit('stop typing', { conversationId: [user._id, userId].sort().join('_') });
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
      setReactingMsgId(msgId); setTimeout(() => setReactingMsgId(null), 350);
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
    if (newMsg.trim()) { sendMessage(newMsg, replyTo?._id); setReplyTo(null); setNewMsg(''); socketRef.current?.emit('stop typing', { conversationId: [user._id, userId].sort().join('_') }); }
  };

  const renderTick = (msg) => {
    if (msg.sender._id !== user._id) return null;
    switch (msg.status) {
      case 'sent': return <span className="text-xs opacity-60 ml-1"><span>✔</span></span>;
      case 'delivered': return <span className="text-xs opacity-80 ml-1"><span>✔✔</span></span>;
      case 'read': return <span className="text-xs ml-1" style={{ color: '#3b82f6' }}><span>✔✔</span></span>;
      default: return <span className="text-xs opacity-60 ml-1"><span>✔</span></span>;
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
  const statusText = isOnline ? 'Online' : getLastSeenText(chatUser.lastSeen);
  const callTime = `${Math.floor(callDuration/60)}:${(callDuration%60).toString().padStart(2,'0')}`;

  return (
    <div className="h-screen flex flex-col bg-chat-bg text-white w-full">
      {/* Call overlay */}
      {(inCall || calling || incoming) && (
        <div className="absolute inset-0 z-50 bg-gradient-to-b from-dark-blue to-black bg-opacity-95 flex flex-col items-center justify-center">
          {incoming && callerSignal && (
            <div className="text-center space-y-8">
              <div className="w-32 h-32 rounded-full bg-light-blue flex items-center justify-center text-5xl mx-auto relative">
                <span className="animate-ping absolute inset-0 rounded-full bg-light-blue opacity-20"></span>
                {chatUser.profilePic ? <img src={chatUser.profilePic} className="w-full h-full object-cover rounded-full" alt="" /> : (chatUser.fullName?.[0] || chatUser.username[0].toUpperCase())}
              </div>
              <h2 className="text-3xl font-bold">{chatUser.fullName || chatUser.username}</h2>
              <p className="text-gray-300 text-lg">{callType === 'video' ? '📹 Video call' : '📞 Voice call'}</p>
              <div className="flex gap-8 justify-center mt-8">
                <button onClick={rejectIncomingCall} className="bg-red-600 hover:bg-red-700 rounded-full p-5 transform transition hover:scale-110"><FiPhoneOff size={32} /></button>
                <button onClick={acceptIncomingCall} className="bg-green-600 hover:bg-green-700 rounded-full p-5 transform transition hover:scale-110"><FiPhone size={32} /></button>
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
                    <div className="w-36 h-36 rounded-full bg-light-blue flex items-center justify-center text-6xl mb-6 relative">
                      <span className="animate-ping absolute inset-0 rounded-full bg-light-blue opacity-20"></span>
                      {chatUser.profilePic ? <img src={chatUser.profilePic} className="w-full h-full object-cover rounded-full" /> : (chatUser.fullName?.[0] || chatUser.username[0].toUpperCase())}
                    </div>
                    <h2 className="text-2xl font-semibold">{chatUser.fullName || chatUser.username}</h2>
                    <p className="text-gray-400 mt-2 text-lg">{calling ? 'Ringing...' : callTime}</p>
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
                <button onClick={toggleSpeaker} className={`p-4 rounded-full transition ${speakerOn ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-blue-600 text-white'}`}>
                  <FiVolume2 size={22} />
                </button>
                <button onClick={endCall} className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition transform hover:scale-110"><FiPhoneOff size={28} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <header className="flex items-center gap-2 sm:gap-4 px-2 sm:px-4 py-2 sm:py-3 bg-dark-blue border-b border-gray-700">
        <Link to="/" className="text-white hover:text-light-blue p-1"><FiArrowLeft size={20} /></Link>
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-light-blue overflow-hidden flex items-center justify-center flex-shrink-0">
          {chatUser.profilePic ? <img src={chatUser.profilePic} className="w-full h-full object-cover" alt="" /> : <span className="text-sm sm:text-lg font-semibold">{chatUser.fullName?.[0] || chatUser.username[0].toUpperCase()}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm sm:text-base truncate">{chatUser.fullName || chatUser.username}</h2>
          <p className={`text-xs ${isOnline ? 'text-green-400' : 'text-gray-400'}`}>{typingUser ? `${typingUser} is typing...` : statusText}</p>
        </div>
        <button onClick={() => startCall('audio')} className="p-1 sm:p-2 hover:bg-gray-700 rounded-full"><FiPhone size={16} /></button>
        <button onClick={() => startCall('video')} className="p-1 sm:p-2 hover:bg-gray-700 rounded-full"><FiVideo size={16} /></button>
      </header>

      {/* Messages */}
      <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3 sm:space-y-4">
      {showScrollBtn && (
        <button onClick={scrollToBottom} className="absolute bottom-20 right-4 w-10 h-10 bg-light-blue rounded-full flex items-center justify-center shadow-lg z-10">
          ↓
        </button>
      )}
        {messages.map((msg, i) => {
          const isMine = msg.sender._id === user._id;
          const mediaType = msg.mediaType || (msg.image ? getMediaType(msg.image) : 'text');
          return (
            <div key={i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] sm:max-w-[75%] px-3 py-2 sm:px-4 sm:py-2 rounded-2xl relative group ${isMine ? 'message-sent rounded-br-none' : 'message-received rounded-bl-none'}`}>
                {isMine && editingMsgId !== msg._id && (
                  <button onClick={() => startEdit(msg)} className="absolute -top-2 -right-8 bg-yellow-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"><FiEdit size={12} /></button>
                )}
                {isMine && <button onClick={() => deleteMsg(msg._id)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"><FiTrash2 size={12} /></button>}
                {mediaType === 'image' && <img src={msg.image} className="rounded-lg mb-1 max-w-full" alt="" />}
                {mediaType === 'video' && <video controls className="max-w-full rounded-lg mb-1" style={{maxHeight:'200px'}}><source src={msg.image} /></video>}
                {mediaType === 'audio' && <audio controls className="w-full mb-1" style={{height:'35px'}}><source src={msg.image} /></audio>}
                {editingMsgId === msg._id ? (
                  <div className="flex gap-1">
                    <input type="text" value={editText} onChange={e => setEditText(e.target.value)} className="flex-1 bg-gray-600 text-white rounded px-2 py-1 text-sm outline-none" autoFocus />
                    <button onClick={() => submitEdit(msg._id)} className="text-green-400 p-1">✓</button>
                    <button onClick={cancelEdit} className="text-red-400 p-1">✕</button>
                  </div>
                ) : (
                  <>
                    {msg.text && <div className="text-sm sm:text-base">{renderTextWithLinks(msg.text)}</div>}
                    {msg.text && msg.createdAt !== msg.updatedAt && <span className="text-xs opacity-50 ml-1">(edited)</span>}
                  </>
                )}
                {renderReactions(msg)}
                <div className="flex items-center justify-end gap-1 mt-1">
                  <button onClick={() => setReactionPicker(reactionPicker === msg._id ? null : msg._id)} className="text-xs opacity-50 hover:opacity-100"><FiSmile size={12} /></button>
                  <span className="text-xs opacity-70">{formatMsgTime(msg.createdAt)}</span>
                  {renderTick(msg)}
                  <button onClick={() => setReplyTo(msg)} className="text-xs opacity-50 hover:opacity-100"><FiCornerUpLeft size={12} /></button>
import { FiEdit } from 'react-icons/fi';
                </div>
                {reactionPicker === msg._id && (
                  <div className="absolute bottom-8 left-0 bg-gray-800 rounded-full px-2 py-1 flex gap-1 shadow-lg z-10 text-sm">
                    {QUICK_EMOJIS.map(e => <button key={e} className={} onClick={() => reactToMsg(msg._id, e)} className="hover:scale-125 transition-transform">{e}</button>)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-2 sm:p-3 bg-sidebar-bg border-t border-gray-700 flex items-center gap-1 sm:gap-2">
        <input type="file" accept="image/*" ref={imageInputRef} onChange={handleImageSelect} className="hidden" />
        <input type="file" accept="video/*" ref={videoInputRef} onChange={handleVideoSelect} className="hidden" />
        <div className="relative">
          <button type="button" onClick={() => setShowAttachMenu(!showAttachMenu)} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-700 text-gray-400 flex items-center justify-center"><FiPlusCircle size={18} /></button>
          {showAttachMenu && (
            <div className="absolute bottom-full left-0 mb-2 bg-gray-800 rounded-xl shadow-lg p-2 flex flex-col gap-1 z-20 text-sm">
              <button onClick={() => { imageInputRef.current?.click(); setShowAttachMenu(false); }} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-700 text-white"><FiImage size={16} /> Image</button>
              <button onClick={() => { videoInputRef.current?.click(); setShowAttachMenu(false); }} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-700 text-white"><FiVideo size={16} /> Video</button>
            </div>
          )}
        </div>
      {replyTo && (
        <div className="bg-gray-800 px-3 py-2 flex items-center gap-2 border-t border-gray-700">
          <FiCornerUpLeft size={14} className="text-light-blue" />
import { FiEdit } from 'react-icons/fi';
          <div className="flex-1 text-xs text-gray-300 truncate">
            Replying to {replyTo.sender?.fullName || replyTo.sender?.username || 'User'}:
            <span className="text-gray-400 ml-1">{replyTo.text || 'Media'}</span>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-white">✕</button>
        </div>
      )}
        {isRecording ? (
          <button type="button" onClick={stopRecording} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-600 flex items-center justify-center"><FiStopCircle size={18} /></button>
        ) : (
          <button type="button" onClick={startRecording} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-700 text-gray-400 flex items-center justify-center"><FiMic size={18} /></button>
        )}
      {replyTo && (
        <div className="bg-gray-800 px-3 py-2 flex items-center gap-2 border-t border-gray-700">
          <FiCornerUpLeft size={14} className="text-light-blue" />
import { FiEdit } from 'react-icons/fi';
          <div className="flex-1 text-xs text-gray-300 truncate">
            Replying to {replyTo.sender?.fullName || replyTo.sender?.username || 'User'}:
            <span className="text-gray-400 ml-1">{replyTo.text || 'Media'}</span>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-white">✕</button>
        </div>
      )}
        {isRecording ? (
          <div className="flex-1 bg-gray-800 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 flex items-center text-red-400 text-xs sm:text-sm"><span className="animate-pulse">● Recording {formatRecTime(recordingTime)}</span></div>
        ) : (
          <input type="text" value={newMsg} onChange={e => { setNewMsg(e.target.value); handleTyping(); }} placeholder="Message..." className="flex-1 bg-gray-800 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 outline-none text-white placeholder-gray-400 text-xs sm:text-sm" />
        )}
        <button type="submit" className="w-8 h-8 sm:w-10 sm:h-10 bg-light-blue rounded-full flex items-center justify-center hover:bg-blue-600 transition"><FiSend size={18} /></button>
      </form>
    </div>
  );
};

export default ChatRoomPage;
