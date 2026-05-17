import { useEffect, useRef, useState } from 'react';
import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const getYouTubeEmbedUrl = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  const videoId = (match && match[2].length === 11) ? match[2] : null;
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
};

const getVimeoEmbedUrl = (url) => {
  const regExp = /(?:vimeo)\.com.*(?:videos|video|channels|)\/([\d]+)/i;
  const match = url.match(regExp);
  const videoId = match ? match[1] : null;
  return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
};

const VideoPlayer = ({ url, autoPlay = false, onEnded }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const videoRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const { t } = useTranslation();

  const youtubeUrl = getYouTubeEmbedUrl(url);
  const vimeoUrl = getVimeoEmbedUrl(url);
  const isDirectVideo = url.match(/\.(mp4|webm|ogg|mov|avi)(\?.*)?$/i) ||
    (url.includes('/storage/buckets/') && url.includes('/files/') && url.includes('/view')) ||
    url.includes('/api/media/proxy/');

  const formatTime = (seconds) => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = (e) => {
    e?.stopPropagation();
    e?.preventDefault();
    const video = videoRef.current;
    if (video) {
      if (video.paused) {
        video.play().catch((_err) => {});
      } else {
        video.pause();
      }
      resetControlsTimeout();
    }
  };

  const skipBackward = (e) => {
    e?.stopPropagation();
    e?.preventDefault();
    const video = videoRef.current;
    if (video) {
      const current = video.currentTime || 0;
      const newTime = Math.max(0, current - 10);
      video.currentTime = newTime;
      setCurrentTime(newTime);
      resetControlsTimeout();
    }
  };

  const skipForward = (e) => {
    e?.stopPropagation();
    e?.preventDefault();
    const video = videoRef.current;
    if (video) {
      const current = video.currentTime || 0;
      const videoDuration = video.duration || 0;
      const newTime = Math.min(videoDuration, current + 10);
      video.currentTime = newTime;
      setCurrentTime(newTime);
      resetControlsTimeout();
    }
  };

  const handleVolumeChange = (e) => {
    e?.stopPropagation();
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    const video = videoRef.current;
    if (video) {
      video.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
    resetControlsTimeout();
  };

  const toggleMute = (e) => {
    e?.stopPropagation();
    e?.preventDefault();
    const video = videoRef.current;
    if (video) {
      if (isMuted || video.volume === 0) {
        const newVolume = volume > 0 ? volume : 0.5;
        video.volume = newVolume;
        setVolume(newVolume);
        setIsMuted(false);
      } else {
        video.volume = 0;
        setIsMuted(true);
      }
      resetControlsTimeout();
    }
  };

  const handleProgressChange = (e) => {
    e?.stopPropagation();
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    const video = videoRef.current;
    if (video) {
      video.currentTime = newTime;
    }
    resetControlsTimeout();
  };

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  useEffect(() => {
    setIsLoading(true);
    setError(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    if (autoPlay && videoRef.current && isDirectVideo) {
      videoRef.current.play().catch((_err) => {});
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [url, autoPlay, isDirectVideo]);

  if (youtubeUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <iframe
          src={youtubeUrl}
          className="w-full h-full min-h-[500px]"
          style={{ border: 'none' }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onLoad={() => setIsLoading(false)}
          onError={() => { setIsLoading(false); setError(true); }}
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white">{t('mediaPage.video.loading')}</div>
          </div>
        )}
      </div>
    );
  }

  if (vimeoUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <iframe
          src={vimeoUrl}
          className="w-full h-full min-h-[500px]"
          style={{ border: 'none' }}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          onLoad={() => setIsLoading(false)}
          onError={() => { setIsLoading(false); setError(true); }}
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white">{t('mediaPage.video.loading')}</div>
          </div>
        )}
      </div>
    );
  }

  if (isDirectVideo) {
    return (
      <div
        className="relative w-full h-full flex items-center justify-center bg-black"
        onMouseMove={resetControlsTimeout}
        onMouseLeave={() => { if (isPlaying) setShowControls(false); }}
      >
        <video
          ref={videoRef}
          src={url}
          autoPlay={autoPlay}
          crossOrigin="anonymous"
          className="w-full h-full object-contain"
          style={{ maxHeight: '100%', maxWidth: '100%' }}
          onLoadedData={() => {
            setIsLoading(false);
            if (videoRef.current) {
              setDuration(videoRef.current.duration);
              if (autoPlay) {
                videoRef.current.play().catch((_err) => {});
              }
            }
          }}
          onTimeUpdate={() => {
            if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false);
            if (onEnded) onEnded();
          }}
          onError={(_e) => { setIsLoading(false); setError(true); }}
        >
          Your browser does not support the video tag.
        </video>

        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleProgressChange}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / duration) * 100}%, #4b5563 ${(currentTime / duration) * 100}%, #4b5563 100%)`
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={togglePlay} className="text-white hover:text-brand-400 transition-colors p-2" aria-label={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>
              <button onClick={skipBackward} className="text-white hover:text-brand-400 transition-colors p-2" aria-label="Skip backward 10 seconds">
                <SkipBack className="w-5 h-5" />
              </button>
              <button onClick={skipForward} className="text-white hover:text-brand-400 transition-colors p-2" aria-label="Skip forward 10 seconds">
                <SkipForward className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <button onClick={toggleMute} className="text-white hover:text-brand-400 transition-colors p-2" aria-label={isMuted ? 'Unmute' : 'Mute'}>
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5" />
                  ) : volume < 0.5 ? (
                    <Volume1 className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(isMuted ? 0 : volume) * 100}%, #4b5563 ${(isMuted ? 0 : volume) * 100}%, #4b5563 100%)`
                  }}
                />
              </div>
              <div className="text-white text-sm font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white">Loading video...</div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white text-center p-4">
              <p className="text-lg font-bold mb-2">{t('mediaPage.video.failedTitle')}</p>
              <p className="text-sm">{t('mediaPage.video.failedDesc')}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-center text-white p-8">
        <Play className="w-20 h-20 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-bold mb-2">{t('mediaPage.video.unsupportedTitle')}</p>
        <p className="text-sm opacity-75">{t('mediaPage.video.unsupportedDesc')}</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block px-6 py-3 bg-brand-600 hover:bg-brand-700 rounded-lg font-bold transition-colors"
        >
          {t('mediaPage.video.openNewTab')}
        </a>
      </div>
    </div>
  );
};

export default VideoPlayer;
