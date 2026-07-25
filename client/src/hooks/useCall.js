import { useState, useRef, useEffect } from 'react';

const useCall = (userId, user, socketRef) => {
  const [inCall, setInCall] = useState(false);
  const [calling, setCalling] = useState(false);
  const [incoming, setIncoming] = useState(false);
  const [callerSignal, setCallerSignal] = useState(null);
  const [callType, setCallType] = useState('audio');
  const [callDuration, setCallDuration] = useState(0);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [micMuted, setMicMuted] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const callTimerRef = useRef(null);
  const ringtoneRef = useRef(null);

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

  const startCall = async (type) => {
    setCallType(type);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const peer = new RTCPeerConnection(iceServers);
      peerRef.current = peer;
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

  const acceptCall = async () => {
    if (!callerSignal) return;
    stopRingtone();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callType === 'video' });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const peer = new RTCPeerConnection(iceServers);
      peerRef.current = peer;
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

  const rejectCall = () => { stopRingtone(); socketRef.current.emit('reject-call', { callerId: callerSignal.callerId }); setIncoming(false); setCallerSignal(null); };
  const endCall = () => { stopRingtone(); if (peerRef.current) peerRef.current.close(); socketRef.current.emit('end-call', { to: userId }); cleanupCall(); setInCall(false); setCalling(false); setIncoming(false); };
  const cleanupCall = () => { if (localStream) localStream.getTracks().forEach(t => t.stop()); setLocalStream(null); setRemoteStream(null); if (peerRef.current) { peerRef.current.close(); peerRef.current = null; } clearInterval(callTimerRef.current); setCallDuration(0); };
  const startCallTimer = () => { callTimerRef.current = setInterval(() => setCallDuration(p => p + 1), 1000); };
  const toggleMic = () => { if (localStream) { localStream.getAudioTracks().forEach(t => t.enabled = !t.enabled); setMicMuted(!micMuted); } };
  const toggleVideo = () => { if (localStream) { localStream.getVideoTracks().forEach(t => t.enabled = !t.enabled); setVideoEnabled(!videoEnabled); } };

  useEffect(() => {
    if (!socketRef.current) return;
    const sock = socketRef.current;
    sock.on('incoming-call', ({ callerId, signal, callType }) => { setCallerSignal({ callerId, signal }); setCallType(callType); setIncoming(true); playRingtone(); });
    sock.on('call-accepted', ({ signal }) => { stopRingtone(); if (peerRef.current) peerRef.current.setRemoteDescription(new RTCSessionDescription(signal)); setCalling(false); setInCall(true); startCallTimer(); });
    sock.on('call-rejected', () => { stopRingtone(); setCalling(false); setInCall(false); cleanupCall(); alert('Call rejected'); });
    sock.on('call-ended', () => { stopRingtone(); setInCall(false); setIncoming(false); setCalling(false); cleanupCall(); });
    sock.on('call-failed', ({ message }) => { stopRingtone(); alert(message); setCalling(false); });
    sock.on('ice-candidate', ({ candidate }) => { if (peerRef.current) try { peerRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) {} });
    return () => { stopRingtone(); sock.off('incoming-call'); sock.off('call-accepted'); sock.off('call-rejected'); sock.off('call-ended'); sock.off('call-failed'); sock.off('ice-candidate'); };
  }, [socketRef.current]);

  return { inCall, calling, incoming, callerSignal, callType, callDuration, localStream, remoteStream, micMuted, videoEnabled, localVideoRef, remoteVideoRef, startCall, acceptCall, rejectCall, endCall, toggleMic, toggleVideo };
};

export default useCall;
