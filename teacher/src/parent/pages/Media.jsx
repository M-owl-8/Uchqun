import { useEffect, useState, useRef } from 'react';
import { useChild } from '../context/ChildContext';
import api from '../services/api';
import * as cache from '../../../../shared/utils/cache';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Image as ImageIcon,
  Play,
  Pause,
  X,
  Calendar,
  LayoutGrid,
  Film,
  Maximize2,
  ChevronLeft,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Volume1,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Helper function to convert Appwrite URL to proxy URL
const getProxyUrl = (url, mediaId) => {
  if (!url) return url;
  if (!mediaId) {
    return url;
  }
  
  // If URL is from Appwrite, convert to proxy endpoint
  if (url.includes('appwrite.io') && (url.includes('/storage/buckets/') || url.includes('/files/'))) {
    // Use VITE_API_URL if available, otherwise use Railway backend URL (same as api.js)
    // This ensures consistency with the API base URL
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const apiBase = apiUrl.replace('/api', '');
    const proxyUrl = `${apiBase}/api/media/proxy/${mediaId}`;
    return proxyUrl;
  }
  
  // Otherwise return original URL
  return url;
};

// Helper function to get YouTube embed URL
const getYouTubeEmbedUrl = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  const videoId = (match && match[2].length === 11) ? match[2] : null;
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
};

// Helper function to get Vimeo embed URL
const getVimeoEmbedUrl = (url) => {
  const regExp = /(?:vimeo)\.com.*(?:videos|video|channels|)\/([\d]+)/i;
  const match = url.match(regExp);
  const videoId = match ? match[1] : null;
  return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
};

// Video Player Component
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
  // Check if URL is a direct video file (has video extension, is from Appwrite storage, or is a proxy URL)
  const isDirectVideo = url.match(/\.(mp4|webm|ogg|mov|avi)(\?.*)?$/i) || 
                        (url.includes('/storage/buckets/') && url.includes('/files/') && url.includes('/view')) ||
                        url.includes('/api/media/proxy/');

  // Format time helper
  const formatTime = (seconds) => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle play/pause
  const togglePlay = (e) => {
    e?.stopPropagation();
    e?.preventDefault();
    const video = videoRef.current;
    if (video) {
      if (video.paused) {
        video.play().catch((_err) => {
        });
      } else {
        video.pause();
      }
      resetControlsTimeout();
    }
  };

  // Handle skip backward (10 seconds)
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

  // Handle skip forward (10 seconds)
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

  // Handle volume change
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

  // Handle mute toggle
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

  // Handle progress bar change
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

  // Hide controls after 3 seconds of inactivity
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
    
    // Auto-play video when it loads if autoPlay is true
    if (autoPlay && videoRef.current && isDirectVideo) {
      videoRef.current.play().catch((_err) => {
      });
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
          onError={() => {
            setIsLoading(false);
            setError(true);
          }}
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white">{t('media.video.loading')}</div>
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
          onError={() => {
            setIsLoading(false);
            setError(true);
          }}
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white">{t('media.video.loading')}</div>
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
        onMouseLeave={() => {
          if (isPlaying) {
            setShowControls(false);
          }
        }}
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
              // Try to play if autoPlay is enabled
              if (autoPlay) {
                videoRef.current.play().catch((_err) => {
                });
              }
            }
          }}
          onTimeUpdate={() => {
            if (videoRef.current) {
              setCurrentTime(videoRef.current.currentTime);
            }
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false);
            if (onEnded) {
              onEnded();
            }
          }}
          onError={(_e) => {
            setIsLoading(false);
            setError(true);
          }}
        >
          Your browser does not support the video tag.
        </video>

        {/* Custom Controls */}
        <div 
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Progress Bar */}
          <div className="mb-4">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleProgressChange}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / duration) * 100}%, #4b5563 ${(currentTime / duration) * 100}%, #4b5563 100%)`
              }}
            />
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between gap-4">
            {/* Left Controls */}
            <div className="flex items-center gap-3">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="text-white hover:text-primary-400 transition-colors p-2"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6" />
                )}
              </button>

              {/* Skip Backward */}
              <button
                onClick={skipBackward}
                className="text-white hover:text-primary-400 transition-colors p-2"
                aria-label="Skip backward 10 seconds"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              {/* Skip Forward */}
              <button
                onClick={skipForward}
                className="text-white hover:text-primary-400 transition-colors p-2"
                aria-label="Skip forward 10 seconds"
              >
                <SkipForward className="w-5 h-5" />
              </button>

              {/* Volume Control */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-primary-400 transition-colors p-2"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
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
                  className="w-20 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(isMuted ? 0 : volume) * 100}%, #4b5563 ${(isMuted ? 0 : volume) * 100}%, #4b5563 100%)`
                  }}
                />
              </div>

              {/* Time Display */}
              <div className="text-white text-sm font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>
          </div>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white">Loading video...</div>
          </div>
        )}

        {/* Error Overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white text-center p-4">
              <p className="text-lg font-bold mb-2">{t('media.video.failedTitle')}</p>
              <p className="text-sm">{t('media.video.failedDesc')}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Fallback for unrecognized video URLs
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-center text-white p-8">
        <Play className="w-20 h-20 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-bold mb-2">{t('media.video.unsupportedTitle')}</p>
        <p className="text-sm opacity-75">
          {t('media.video.unsupportedDesc')}
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block px-6 py-3 bg-primary-600 hover:bg-primary-700 rounded-lg font-bold transition-colors"
        >
          {t('media.video.openNewTab')}
        </a>
      </div>
    </div>
  );
};

const Media = () => {
  const { selectedChildId } = useChild();
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [filter, setFilter] = useState('all');
  const { t, i18n } = useTranslation();

  const locale = {
    uz: 'uz-UZ',
    ru: 'ru-RU',
    en: 'en-US',
  }[i18n.language] || 'en-US';

  const typeLabels = {
    photo: t('media.photoLabel'),
    video: t('media.videoLabel'),
  };

  useEffect(() => {
    if (!selectedChildId) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const loadMedia = async () => {
      const key = `parent:media:${selectedChildId}`;
      const cached = cache.get(key);
      if (cached) { setMedia(cached); setLoading(false); return; }
      try {
        const response = await api.get(`/media?childId=${selectedChildId}`, { signal: controller.signal });
        const mediaData = response.data?.media || response.data || [];
        const data = Array.isArray(mediaData) ? mediaData : [];
        cache.set(key, data);
        setMedia(data);
      } catch (error) {
        if (error.code === 'ERR_CANCELED') return;
        setMedia([]);
      } finally {
        setLoading(false);
      }
    };
    loadMedia();
    return () => controller.abort();
  }, [selectedChildId]);

  const filteredMedia = filter === 'all' ? media : media.filter((item) => item.type === filter);

  if (loading) return <div className="flex justify-center items-center h-96"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 pb-24">
      
      {/* --- Dynamic Header --- */}
      <Card className="bg-gradient-to-r from-primary-500 to-primary-400 rounded-2xl p-6 md:p-8 shadow-xl border-0 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{t('media.title')}</h1>
            <p className="text-white/90 text-sm md:text-base">{t('media.subtitle')}</p>
          </div>

          {/* --- Glassmorphism Filters --- */}
          <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm p-1.5 rounded-2xl border border-white/30">
          {[
            { id: 'all', label: t('media.filterAll'), icon: LayoutGrid },
            { id: 'photo', label: t('media.filterPhoto'), icon: ImageIcon },
            { id: 'video', label: t('media.filterVideo'), icon: Film },
          ].map((option) => (
            <button
              key={option.id}
              onClick={() => setFilter(option.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                filter === option.id 
                ? 'bg-white text-primary-600 shadow-md scale-105' 
                : 'text-white/80 hover:text-white hover:bg-white/20'
              }`}
            >
              <option.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{option.label}</span>
            </button>
          ))}
        </div>
        </div>
      </Card>

      {/* --- Media Grid --- */}
      {filteredMedia.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMedia.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedMedia(item)}
              className="group relative bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer border border-gray-100"
            >
              {/* Image/Video Container */}
              <div className="relative aspect-[4/5] overflow-hidden">
                {item.type === 'video' ? (
                  // Video preview with play on hover
                  <div className="relative w-full h-full">
                    <video
                      src={getProxyUrl(item.url, item.id)}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      muted
                      loop
                      playsInline
                      onMouseEnter={(e) => {
                        // Play video on hover
                        e.target.play().catch(() => {
                          // Ignore autoplay errors
                        });
                      }}
                      onMouseLeave={(e) => {
                        // Pause video when mouse leaves
                        e.target.pause();
                        e.target.currentTime = 0; // Reset to beginning
                      }}
                      onError={(_e) => {
                        const originalUrl = item.url;
                        const _proxyUrl = getProxyUrl(originalUrl, item.id);
                      }}
                    />
                    {/* Video Play Icon - Always visible */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-white/30 shadow-lg">
                        <Play className="w-8 h-8 text-white fill-current" />
                      </div>
                    </div>
                  </div>
                ) : (
                  // Image
                  <img
                    src={getProxyUrl(item.url || item.imageUrl || item.photoUrl, item.id)}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => {
                      const originalUrl = item.url || item.imageUrl || item.photoUrl;
                      const _proxyUrl = getProxyUrl(originalUrl, item.id);
                      e.target.style.display = 'none';
                    }}
                  />
                )}
                
                {/* Overlay on Hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6 text-white">
                    <p className="text-xs font-bold uppercase tracking-widest text-primary-400 mb-1">
                        {typeLabels[item.type] || item.type}
                    </p>
                    <h3 className="text-lg font-bold leading-tight">{item.title}</h3>
                </div>

                {/* Video Play Icon */}
                {item.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-white/30">
                      <Play className="w-8 h-8 text-white fill-current" />
                    </div>
                  </div>
                )}

                <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-4 h-4 text-white" />
                </div>
              </div>

              {/* Bottom Info (Always visible or not, depending on preference) */}
              <div className="p-5">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {new Date(item.date).toLocaleDateString(locale)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="text-center py-32 bg-white/95 backdrop-blur-sm">
          <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-bold text-lg">{t('media.empty')}</p>
        </Card>
      )}

      {/* --- Premium Media Modal --- */}
      {selectedMedia && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-gray-900/95 backdrop-blur-xl"
            onClick={() => setSelectedMedia(null)}
          />
          
          <div className="relative w-full max-w-6xl bg-white rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col lg:flex-row max-h-[90vh] h-[90vh]">
            
            {/* Close Button Mobile */}
            <button 
                onClick={() => setSelectedMedia(null)}
                className="absolute top-4 right-4 z-10 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full backdrop-blur-md lg:hidden"
            >
                <X className="w-6 h-6" />
            </button>

            {/* Media Content Area */}
            <div className="flex-[2] bg-black flex items-center justify-center overflow-hidden relative w-full h-full">
              {selectedMedia.type === 'video' ? (
                <VideoPlayer 
                  url={getProxyUrl(selectedMedia.url, selectedMedia.id)} 
                  autoPlay={true}
                  onEnded={() => setSelectedMedia(null)}
                />
              ) : (
                <img
                  src={getProxyUrl(selectedMedia.url || selectedMedia.imageUrl || selectedMedia.photoUrl, selectedMedia.id)}
                  alt={selectedMedia.title}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    const originalUrl = selectedMedia.url || selectedMedia.imageUrl || selectedMedia.photoUrl;
                    const _proxyUrl = getProxyUrl(originalUrl, selectedMedia.id);
                    e.target.style.display = 'none';
                  }}
                />
              )}
            </div>

            {/* Sidebar Info Area */}
            <div className="flex-1 p-8 lg:p-12 overflow-y-auto bg-white">
              <button 
                onClick={() => setSelectedMedia(null)}
                className="hidden lg:flex items-center gap-2 text-gray-400 hover:text-primary-600 font-bold text-sm mb-10 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" /> {t('media.back')}
              </button>

              <div className="space-y-6">
                <div>
                  <span className="px-4 py-1.5 bg-primary-50 text-primary-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {selectedMedia.type === 'video' ? t('media.videoLabel') : t('media.photoLabel')}
                  </span>
                  <h3 className="text-3xl font-black text-gray-900 mt-4 leading-tight">
                    {selectedMedia.title}
                  </h3>
                </div>

                <p className="text-gray-600 leading-relaxed text-lg">
                  {selectedMedia.description}
                </p>

                <div className="pt-8 border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="bg-gray-100 p-3 rounded-2xl">
                        <Calendar className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('media.date')}</p>
                        <p className="text-gray-900 font-bold">
                            {new Date(selectedMedia.date).toLocaleDateString(locale, { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })}
                        </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Media;