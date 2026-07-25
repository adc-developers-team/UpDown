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

  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showPinned, setShowPinned] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchIndex, setSearchIndex] = useState(0);
  const [forwardMsg, setForwardMsg] = useState(null);

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
    socketRef.current.on('message edited', (editedMsg) => setMessages(prev => prev.map(m => m._id === editedMsg._id ? editedMsg : m)));
    socketRef.current.on('message reaction updated', updated => setMessages(prev => prev.map(m => m._id === updated._id ? updated : m)));
    socketRef.current.on('message pinned', (pinnedMsg) => {
      setMessages(prev => prev.map(m => m._id === pinnedMsg._id ? pinnedMsg : m));
    });

    socketRef.current.on('incoming-call', ({ callerId, signal, callType }) => {
      console.log('Incoming call from', callerId, 'type', callType);
      setCallerSignal({ callerId, signal });
      setCallType(callType);
      setIncoming(true);
      playRingtone();
    });

    socketRef.current.on('call-accepted', ({ signal }) => {
      console.log('Call accepted, signal received');
      stopRingtone();
      if (peerRef.current) {
        peerRef.current.setRemoteDescription(new RTCSessionDescription(signal));
      }
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
        try {
          peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('ICE candidate error:', e);
        }
      }
    });

    socketRef.current.emit('set-username', user.username);

    return () => {
      stopRingtone();
      socketRef.current.disconnect();
    };
  }, [userId, setSelectedUser, user.username]);

  useEffect(() => {
    const container = document.querySelector('.overflow-y-auto');
    if (container) {
      const handleScroll = () => setShowScrollBtn(container.scrollTop < container.scrollHeight - container.clientHeight - 100);
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [messages]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  /* ---------- call logic ---------- */
  const startCall = async (type) => {
    if (!socketRef.current?.connected) {
      alert('Connection lost. Please refresh the page.');
      return;
    }
    console.log('Starting call, type:', type);
    setCallType(type);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });
      console.log('Local stream acquired');
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const peer = new RTCPeerConnection(iceServers);
      peerRef.current = peer;

      stream.getTracks().forEach(track => peer.addTrack(track, stream));

      peer.onicecandidate = (e) => {
        if (e.candidate) {
          console.log('Sending ICE candidate');
          socketRef.current.emit('ice-candidate', { to: userId, candidate: e.candidate });
        }
      };

      peer.ontrack = (e) => {
        console.log('Remote track received');
        if (e.streams && e.streams[0]) {
          setRemoteStream(e.streams[0]);
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
        }
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      console.log('Sending call-user with offer');
      socketRef.current.emit('call-user', {
        callerId: user._id,
        receiverId: userId,
        signal: offer,
        callType: type,
      });
      setCalling(true);
    } catch (err) {
      console.error('Call start error:', err);
      if (err.name === 'NotAllowedError') alert('Please allow camera & microphone in browser settings.');
      else if (err.name === 'NotFoundError') alert('No camera or microphone found.');
      else alert('Call failed: ' + err.message);
    }
  };

  const acceptIncomingCall = async () => {
    if (!callerSignal) return;
    console.log('Accepting call');
    stopRingtone();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video',
      });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const peer = new RTCPeerConnection(iceServers);
      peerRef.current = peer;

      stream.getTracks().forEach(track => peer.addTrack(track, stream));

      peer.onicecandidate = (e) => {
        if (e.candidate) {
          socketRef.current.emit('ice-candidate', { to: callerSignal.callerId, candidate: e.candidate });
        }
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
      console.log('Sending accept-call');
      socketRef.current.emit('accept-call', { callerId: callerSignal.callerId, signal: answer });
      setIncoming(false); setInCall(true); startCallTimer();
    } catch (err) {
      console.error('Accept call error:', err);
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

  const uploadFile = async (file, type) => { /* unchanged */ };
  const handleImageSelect = (e) => { if (e.target.files[0]) uploadFile(e.target.files[0], 'image'); e.target.value = ''; };
  const handleVideoSelect = (e) => { if (e.target.files[0]) uploadFile(e.target.files[0], 'video'); e.target.value = ''; };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

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

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch (err) {
      alert('Microphone access denied. ' + (err.message || ''));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  const deleteMsg = async (id) => { /* unchanged */ };
  const reactToMsg = (msgId, emoji) => { /* unchanged */ };
  const startEdit = (msg) => { /* unchanged */ };
  const cancelEdit = () => { /* unchanged */ };
  const submitEdit = async (msgId) => { /* unchanged */ };
  const handleTyping = () => { /* unchanged */ };

  const handleSend = (e) => {
    e.preventDefault();
    if (newMsg.trim()) {
      sendMessage(newMsg, replyTo?._id);
      setNewMsg('');
      setReplyTo(null);
      socketRef.current?.emit('stop typing', { conversationId: [user._id, userId].sort().join('_') });
    }
  };

  const renderTick = (msg) => { /* unchanged */ };
  const renderReactions = (msg) => { /* unchanged */ };
  const formatRecTime = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
  const getMediaType = (url) => { /* unchanged */ };

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
              <div className="w-32 h-32 rounded-full bg-accent/20 flex items-center justify-center text-5xl mx-auto relative">
                <span className="animate-ping absolute inset-0 rounded-full bg-accent/20 opacity-20"></span>
                {chatUser.profilePic ? <img src={chatUser.profilePic} className="w-full h-full object-cover rounded-full" alt="" /> : <span className="text-accent font-bold">{chatUser.fullName?.[0] || chatUser.username[0].toUpperCase()}</span>}
              </div>
              <h2 className="text-3xl font-bold">{chatUser.fullName || chatUser.username}</h2>
              <p className="text-text-secondary text-lg">{callType === 'video' ? '📹 Video call' : '📞 Voice call'}</p>
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
                      {mediaType === 'image' && <img src={msg.image} className="rounded-lg mb-0.5 max-w-full" alt="" />}
                      {mediaType === 'video' && <video controls className="max-w-full rounded-lg mb-0.5" style={{maxHeight:'180px'}}><source src={msg.image} /></video>}
                      {mediaType === 'audio' && <audio controls src={msg.image} className="w-full mb-0.5" style={{height:'30px'}} />}
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
