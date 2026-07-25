import { useState, useRef, useEffect } from 'react';
import { FiPlay, FiPause } from 'react-icons/fi';

const AudioPlayer = ({ src }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
    };
  }, []);

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (time) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2 w-full max-w-xs">
      <button onClick={togglePlay} className="text-accent hover:text-accent-hover">
        {isPlaying ? <FiPause size={16} /> : <FiPlay size={16} />}
      </button>
      <div className="flex-1 h-1 bg-gray-600 rounded-full overflow-hidden">
        <div className="h-full bg-accent transition-all" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
      </div>
      <span className="text-xs text-text-secondary">{formatTime(currentTime)}</span>
      <audio ref={audioRef} src={src} onEnded={() => setIsPlaying(false)} preload="metadata" />
    </div>
  );
};

export default AudioPlayer;
