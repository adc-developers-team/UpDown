import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import axios from 'axios';
import {
  FiArrowLeft, FiSend, FiSmile, FiMic, FiStopCircle,
  FiPlus, FiImage, FiVideo, FiPhone, FiVideo as FiVideoCall,
  FiMicOff, FiVideoOff, FiVolume2, FiCornerUpLeft,
  FiTrash2, FiSlash, FiCheckCircle, FiMoreVertical
} from 'react-icons/fi';
import { io } from 'socket.io-client';

const API = 'https://updown-hms5.onrender.com';
const QUICK_EMOJIS = ['❤️', '😂', '👍', '😮', '😢', '🔥'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const getLastSeenText = (d) => {
  if (!d) return 'Last seen long ago';
  const date = new Date(d);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return 'Last seen just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Last seen ${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `Last seen ${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'Last seen yesterday';
  if (diffDay < 7) return `Last seen ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getDay()]}`;
  return `Last seen ${date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`;
};

const formatMsgTime = (d) => {
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDateSeparator = (d) => {
  const date = new Date(d);
  const now = new Date();
  const diffDay = Math.floor((now - date) / 86400000);
  if (diffDay === 0) return 'Today';
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][date.getDay()];
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
};

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
  const [menuMsg, setMenuMsg] = useState(null);

  const socketRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const messagesEndRef = useRef(null);
  const longPressTimer = useRef(null);
  const messagesContainerRef = useRef(null);

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
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const callTimerRef = useRef(null);
  const ringtoneRef = useRef(null);

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUser]);

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
        if (ctx.state !== 'closed') beep();
        else clearInterval(interval);
      }, 2000);
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
    socketRef.current = io(API);

    axios
      .get(`${API}/api/auth/users`)
      .then((res) => {
        const found = (Array.isArray(res.data) ? res.data : []).find((u) => u._id === userId);
        if (found) {
          setChatUser(found);
          setSelectedUser(found);
        } else {
          setChatUser({ _id: userId, username: 'Unknown', fullName: 'User' });
        }
        return axios.get(`${API}/api/auth/blocked`, config);
      })
      .then((res) => {
        const blocked = Array.isArray(res.data) ? res.data : [];
        setIsBlocked(blocked.some((b) => b._id === userId));
        setLoading(false);
      })
      .catch(() => {
        setChatUser({ _id: userId, username: 'Unknown', fullName: 'User' });
        setError('Could not load chat');
        setLoading(false);
      });

    socketRef.current.on('user typing', setTypingUser);
    socketRef.current.on('user stop typing', () => setTypingUser(null));

    socketRef.current.on('incoming-call', ({ callerId, signal, callType }) => {
      setCallerSignal({ callerId, signal });
      setCallType(callType);
      setIncoming(true);
      playRingtone();
    });
    socketRef.current.on('call-accepted', ({ signal }) => {
      stopRingtone();
      if (peerRef.current) peerRef.current.setRemoteDescription(new RTCSessionDescription(signal));
      setCalling(false);
      setInCall(true);
      startCallTimer();
    });
    socketRef.current.on('call-rejected', () => {
      stopRingtone();
      setCalling(false);
      setInCall(false);
      cleanupCall();
      alert('Call rejected');
    });
    socketRef.current.on('call-ended', () => {
      stopRingtone();
      setInCall(false);
      setIncoming(false);
      setCalling(false);
      cleanupCall();
    });
    socketRef.current.on('call-failed', ({ message }) => {
      stopRingtone();
      alert(message);
      setCalling(false);
    });
    socketRef.current.on('ice-candidate', ({ candidate }) => {
      if (peerRef.current) {
        try {
          peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {}
      }
    });

    return () => {
      stopRingtone();
      socketRef.current?.disconnect();
    };
  }, [userId]);

  // Call functions (kept same logic)
  const startCall = async (type) => {
    if (!socketRef.current?.connected) {
      alert('Connection lost. Please refresh.');
      return;
    }
    setCallType(type);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const peer = new RTCPeerConnection(iceServers);
      peerRef.current = peer;
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      peer.onicecandidate = (e) => {
        if (e.candidate)
          socketRef.current.emit('ice-candidate', { to: userId, candidate: e.candidate });
      };
      peer.ontrack = (e) => {
        if (e.streams?.[0]) {
          setRemoteStream(e.streams[0]);
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
        }
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socketRef.current.emit('call-user', {
        callerId: user._id,
        receiverId: userId,
        signal: offer,
        callType: type,
      });
      setCalling(true);
    } catch (err) {
      if (err.name === 'NotAllowedError')
        alert('Please allow camera & microphone in browser settings.');
      else if (err.name === 'NotFoundError') alert('No camera or microphone found.');
      else alert('Call failed: ' + err.message);
    }
  };

  const acceptIncomingCall = async () => {
    if (!callerSignal) return;
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
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      peer.onicecandidate = (e) => {
        if (e.candidate)
          socketRef.current.emit('ice-candidate', {
            to: callerSignal.callerId,
            candidate: e.candidate,
          });
      };
      peer.ontrack = (e) => {
        if (e.streams?.[0]) {
          setRemoteStream(e.streams[0]);
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
        }
      };

      await peer.setRemoteDescription(new RTCSessionDescription(callerSignal.signal));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socketRef.current.emit('accept-call', {
        callerId: callerSignal.callerId,
        signal: answer,
      });
      setIncoming(false);
      setInCall(true);
      startCallTimer();
    } catch (err) {
      if (err.name === 'NotAllowedError') alert('Please allow camera & microphone.');
      else alert('Could not answer: ' + err.message);
    }
  };

  const rejectIncomingCall = () => {
    stopRingtone();
    if (callerSignal) socketRef.current.emit('reject-call', { callerId: callerSignal.callerId });
    setIncoming(false);
    setCallerSignal(null);
  };

  const endCall = () => {
    stopRingtone();
    if (peerRef.current) peerRef.current.close();
    socketRef.current.emit('end-call', { to: userId });
    cleanupCall();
    setInCall(false);
    setCalling(false);
    setIncoming(false);
  };

  const cleanupCall = () => {
    if (localStream) localStream.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    clearInterval(callTimerRef.current);
    setCallDuration(0);
  };

  const startCallTimer = () => {
    callTimerRef.current = setInterval(() => setCallDuration((prev) => prev + 1), 1000);
  };

  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
      setMicMuted(!micMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
      setVideoOff(!videoOff);
    }
  };

  const handleBlock = async () => {
    if (!confirm(isBlocked ? 'Unblock this user?' : 'Block this user?')) return;
    try {
      if (isBlocked) {
        await axios.put(`\( {API}/api/auth/unblock/ \){userId}`, {}, config);
        setIsBlocked(false);
      } else {
        await axios.put(`\( {API}/api/auth/block/ \){userId}`, {}, config);
        setIsBlocked(true);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  const reactToMsg = (emoji) => {
    if (!reactionPicker) return;
    const convId = [user._id, userId].sort().join('_');
    socketRef.current?.emit('react to message', {
      messageId: reactionPicker,
      emoji,
      userId: user._id,
      conversationId: convId,
    });
    setReactionPicker(null);
  };

  const deleteForMe = (msgId) => {
    setMessages((prev) => prev.filter((m) => m._id !== msgId));
    setMenuMsg(null);
  };

  const deleteForEveryone = async (msgId) => {
    try {
      await axios.delete(`\( {API}/api/messages/ \){msgId}`, config);
      const convId = [user._id, userId].sort().join('_');
      socketRef.current?.emit('delete message', { messageId: msgId, conversationId: convId });
      setMessages((prev) => prev.filter((m) => m._id !== msgId));
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
    setMenuMsg(null);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const { data } = await axios.post(
              `${API}/api/upload/audio`,
              { audio: reader.result },
              config
            );
            socketRef.current?.emit('send message', {
              senderId: user._id,
              receiverId: userId,
              text: '',
              image: data.audioUrl,
              mediaType: 'audio',
            });
          } catch (err) {
            alert('Audio upload failed');
          }
        };
        reader.readAsDataURL(blob);
      };
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      alert('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
    }
  };

  const uploadFile = async (file, type) => {
    if (file.size > MAX_FILE_SIZE) return alert(`File too large. Max ${MAX_FILE_SIZE / 1048576}MB.`);
    setUploading(true);
    try {
      const reader = new FileReader();
      const result = await new Promise((res, rej) => {
        reader.onload = () => res(reader.result);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const endpoint = type === 'image' ? '/api/upload/image' : '/api/upload/video';
      const field = type === 'image' ? 'image' : 'video';
      const { data } = await axios.post(`\( {API} \){endpoint}`, { [field]: result }, config);
      const url = type === 'image' ? data.imageUrl : data.videoUrl;
      socketRef.current?.emit('send message', {
        senderId: user._id,
        receiverId: userId,
        text: '',
        image: url,
        mediaType: type,
      });
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
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
    if (isBlocked) return alert('You have blocked this user. Unblock to send messages.');
    if (newMsg.trim()) {
      sendMessage(newMsg, replyTo?._id);
      setNewMsg('');
      setReplyTo(null);
    }
  };

  const renderTick = (msg) => {
    if (msg.sender?._id !== user._id) return null;
    switch (msg.status) {
      case 'sent':
        return <span className="text-[11px] opacity-60 ml-1">✓</span>;
      case 'delivered':
        return <span className="text-[11px] opacity-80 ml-1">✓✓</span>;
      case 'read':
        return <span className="text-[11px] text-sky-400 ml-1">✓✓</span>;
      default:
        return <span className="text-[11px] opacity-40 ml-1">•</span>;
    }
  };

  // Group messages by date
  const groupedMessages = [];
  let lastDate = null;
  messages.forEach((msg) => {
    const dateKey = new Date(msg.createdAt).toDateString();
    if (dateKey !== lastDate) {
      groupedMessages.push({ type: 'date', date: msg.createdAt });
      lastDate = dateKey;
    }
    groupedMessages.push({ type: 'message', data: msg });
  });

  if (loading) {
    return (
      <div className="h-screen bg-chat-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  if (!chatUser) {
    return (
      <div className="h-screen bg-chat-bg flex flex-col items-center justify-center">
        <p className="mb-4 text-text-secondary">{error || 'Failed to load chat'}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-primary text-white px-5 py-2.5 rounded-full text-sm font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  const isOnline = onlineUsers.includes(chatUser._id);
  const statusText = isOnline ? 'Online' : getLastSeenText(chatUser.lastSeen);

  return (
    <div className="h-screen flex flex-col bg-[#e5ddd5] dark:bg-chat-bg text-primary w-full">
      {/* Header - WhatsApp style */}
      <header className="h-16 sm:h-[68px] flex items-center gap-3 px-3 bg-[#075e54] dark:bg-surface text-white border-b border-black/10 sticky top-0 z-30">
        <Link to="/" className="p-1.5 -ml-1 rounded-full hover:bg-white/10">
          <FiArrowLeft size={22} />
        </Link>

        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
          {chatUser.profilePic ? (
            <img src={chatUser.profilePic} className="w-full h-full object-cover" alt="" />
          ) : (
            <span className="text-lg font-bold">
              {chatUser.fullName?.[0] || chatUser.username?.[0]?.toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-[16px] truncate leading-tight">
            {chatUser.fullName || chatUser.username}
          </h2>
          <p className="text-[12px] opacity-90 leading-tight">
            {typingUser ? 'typing...' : statusText}
          </p>
        </div>

        <button
          onClick={() => startCall('audio')}
          className="p-2.5 rounded-full hover:bg-white/10"
          title="Voice call"
        >
          <FiPhone size={20} />
        </button>
        <button
          onClick={() => startCall('video')}
          className="p-2.5 rounded-full hover:bg-white/10"
          title="Video call"
        >
          <FiVideoCall size={20} />
        </button>
        <button
          onClick={handleBlock}
          className="p-2.5 rounded-full hover:bg-white/10"
          title={isBlocked ? 'Unblock' : 'Block'}
        >
          {isBlocked ? <FiCheckCircle size={20} /> : <FiSlash size={20} />}
        </button>
      </header>

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-1"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      >
        {groupedMessages.map((item, idx) => {
          if (item.type === 'date') {
            return (
              <div key={`date-${idx}`} className="flex justify-center my-3">
                <span className="bg-white/80 dark:bg-surface text-xs text-text-secondary px-3 py-1 rounded-lg shadow-sm">
                  {formatDateSeparator(item.date)}
                </span>
              </div>
            );
          }

          const msg = item.data;
          const isMine = msg.sender?._id === user._id;
          const mediaType =
            msg.mediaType ||
            (msg.image
              ? msg.image.match(/\.(mp4|webm|ogg)$/i)
                ? 'video'
                : msg.image.match(/\.(mp3|wav|webm)$/i)
                ? 'audio'
                : 'image'
              : 'text');

          return (
            <div
              key={msg._id || idx}
              className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1`}
            >
              <div
                className={`relative max-w-[78%] sm:max-w-[65%] px-3 py-1.5 rounded-lg shadow-sm ${
                  isMine
                    ? 'bg-[#dcf8c6] dark:bg-primary/30 rounded-tr-none'
                    : 'bg-white dark:bg-surface rounded-tl-none'
                }`}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenuMsg(menuMsg === msg._id ? null : msg);
                }}
                onTouchStart={() => {
                  longPressTimer.current = setTimeout(() => setMenuMsg(msg), 500);
                }}
                onTouchEnd={() => clearTimeout(longPressTimer.current)}
              >
                {/* Media */}
                {mediaType === 'image' && (
                  <img
                    src={msg.image}
                    className="rounded-md mb-1 max-w-full max-h-60 object-cover"
                    alt=""
                  />
                )}
                {mediaType === 'video' && (
                  <video
                    controls
                    className="rounded-md mb-1 max-w-full"
                    style={{ maxHeight: 220 }}
                  >
                    <source src={msg.image} />
                  </video>
                )}
                {mediaType === 'audio' && (
                  <audio controls src={msg.image} className="w-full mb-1" style={{ height: 36 }} />
                )}

                {/* Text */}
                {msg.text && (
                  <p className="text-[14.5px] leading-snug whitespace-pre-wrap break-words">
                    {msg.text}
                  </p>
                )}

                {/* Time + ticks */}
                <div className="flex items-center justify-end gap-1 mt-0.5 -mb-0.5">
                  <span className="text-[11px] opacity-60">{formatMsgTime(msg.createdAt)}</span>
                  {renderTick(msg)}
                </div>

                {/* Reactions */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {Object.entries(msg.reactions).map(([emoji, ids]) => (
                      <span
                        key={emoji}
                        className="text-xs bg-black/10 dark:bg-white/10 rounded-full px-1.5 py-0.5"
                      >
                        {emoji} {ids.length > 1 ? ids.length : ''}
                      </span>
                    ))}
                  </div>
                )}

                {/* Long press / context menu */}
                {menuMsg?._id === msg._id && (
                  <div className="absolute z-50 top-0 right-0 translate-x-2 -translate-y-full bg-surface border border-border-light rounded-xl shadow-xl py-1 min-w-[150px] text-sm">
                    <button
                      onClick={() => {
                        setReplyTo(msg);
                        setMenuMsg(null);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <FiCornerUpLeft size={15} /> Reply
                    </button>
                    <button
                      onClick={() => {
                        setReactionPicker(msg._id);
                        setMenuMsg(null);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <FiSmile size={15} /> React
                    </button>
                    <button
                      onClick={() => deleteForMe(msg._id)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <FiTrash2 size={15} /> Delete for me
                    </button>
                    {isMine && (
                      <button
                        onClick={() => deleteForEveryone(msg._id)}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-danger hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <FiTrash2 size={15} /> Delete for everyone
                      </button>
                    )}
                  </div>
                )}

                {/* Reaction picker */}
                {reactionPicker === msg._id && (
                  <div className="absolute -top-12 left-0 bg-surface rounded-full px-2 py-1.5 flex gap-1 shadow-lg z-50 border border-border-light">
                    {QUICK_EMOJIS.map((e) => (
                      <button
                        key={e}
                        onClick={() => reactToMsg(e)}
                        className="text-xl hover:scale-125 transition-transform px-0.5"
                      >
                        {e}
                      </button>
                    ))}
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
        <div className="bg-surface px-4 py-2.5 flex items-center gap-3 border-t border-border-light">
          <div className="w-1 h-10 bg-primary rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary">
              {replyTo.sender?.fullName || replyTo.sender?.username || 'User'}
            </p>
            <p className="text-xs text-text-secondary truncate">
              {replyTo.text || 'Media'}
            </p>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="p-1.5 text-text-muted hover:text-primary"
          >
            ✕
          </button>
        </div>
      )}

      {/* Input bar - WhatsApp style */}
      <form
        onSubmit={handleSend}
        className="px-2 py-2 bg-[#f0f2f5] dark:bg-surface border-t border-border-light flex items-end gap-2"
      >
        <input type="file" accept="image/*" ref={imageInputRef} onChange={handleImageSelect} className="hidden" />
        <input type="file" accept="video/*" ref={videoInputRef} onChange={handleVideoSelect} className="hidden" />

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className="p-2.5 text-text-secondary hover:text-primary rounded-full"
          >
            <FiPlus size={24} />
          </button>
          {showAttachMenu && (
            <div className="absolute bottom-full left-0 mb-2 bg-surface rounded-xl shadow-xl border border-border-light p-2 flex flex-col gap-1 z-20 min-w-[140px]">
              <button
                type="button"
                onClick={() => {
                  imageInputRef.current?.click();
                  setShowAttachMenu(false);
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
              >
                <FiImage size={18} className="text-purple-500" /> Image
              </button>
              <button
                type="button"
                onClick={() => {
                  videoInputRef.current?.click();
                  setShowAttachMenu(false);
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
              >
                <FiVideo size={18} className="text-pink-500" /> Video
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 flex items-center bg-white dark:bg-bg-input rounded-3xl px-4 py-2 border border-border-light min-h-[44px]">
          <input
            type="text"
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            placeholder={isBlocked ? 'You blocked this user' : 'Type a message'}
            className="flex-1 bg-transparent outline-none text-[15px] text-primary placeholder-text-muted"
            disabled={isBlocked}
          />
        </div>

        {isRecording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="p-3 bg-red-500 text-white rounded-full animate-pulse"
          >
            <FiStopCircle size={22} />
          </button>
        ) : newMsg.trim() && !isBlocked ? (
          <button
            type="submit"
            className="p-3 bg-[#00a884] text-white rounded-full shadow-md active:scale-95 transition"
          >
            <FiSend size={20} />
          </button>
        ) : !isBlocked ? (
          <button
            type="button"
            onClick={startRecording}
            className="p-3 text-text-secondary hover:text-primary rounded-full"
          >
            <FiMic size={22} />
          </button>
        ) : null}
      </form>

      {/* Incoming call overlay would go here if needed */}
    </div>
  );
};

export default ChatRoomPage;
