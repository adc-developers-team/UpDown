import { useState, useRef } from 'react';
import { FiPlay, FiPause, FiMaximize, FiVolume2, FiVolumeX } from 'react-icons/fi';

const VideoPlayer = ({ src }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const videoRef = useRef(null);

  const togglePlay = () => {
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    videoRef.current.muted = !muted;
    setMuted(!muted);
  };

  const toggleFullscreen = () => {
    if (videoRef.current.requestFullscreen) videoRef.current.requestFullscreen();
  };

  return (
    <div className="relative group rounded-lg overflow-hidden">
      <video ref={videoRef} src={src} className="max-w-full max-h-48 rounded-lg" onClick={togglePlay} />
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2 opacity-0 group-hover:opacity-100 transition flex items-center gap-2">
        <button onClick={togglePlay} className="text-white"><FiPlay size={14} /></button>
        <button onClick={toggleMute} className="text-white">{muted ? <FiVolumeX size={14} /> : <FiVolume2 size={14} />}</button>
        <button onClick={toggleFullscreen} className="text-white ml-auto"><FiMaximize size={14} /></button>
      </div>
    </div>
  );
};

export default VideoPlayer;
