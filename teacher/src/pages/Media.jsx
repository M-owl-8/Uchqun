import { useEffect, useState, useRef } from 'react';
import { 
  Calendar, 
  ChevronLeft,
  Edit2,
  Film, 
  Image as ImageIcon, 
  LayoutGrid, 
  Maximize2,
  Play, 
  Pause,
  Plus,
  Save,
  Trash2,
  X,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Volume1
} from 'lucide-react';
import Card from '../shared/components/Card';
import LoadingSpinner from '../shared/components/LoadingSpinner';
import { useAuth } from '../shared/context/AuthContext';
import { useToast } from '../shared/context/ToastContext';
import api from '../shared/services/api';
import { useTranslation } from 'react-i18next';

// Helper function to convert Appwrite URL to proxy URL
const getProxyUrl = (url, mediaId) => {
  if (!url) return url;
  if (!mediaId) {
    console.warn('getProxyUrl: mediaId is missing', { url });
    return url;
  }
  
  // If URL is from Appwrite, convert to proxy endpoint
  if (url.includes('appwrite.io') && (url.includes('/storage/buckets/') || url.includes('/files/'))) {
    // Use VITE_API_URL if available, otherwise use Railway backend URL (same as api.js)
    // This ensures consistency with the API base URL
    const apiUrl = import.meta.env.VITE_API_URL || 'https://uchqun-production-2d8a.up.railway.app/api';
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
        video.play().catch((err) => {
          console.warn('Play failed:', err);
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
      videoRef.current.play().catch((err) => {
        console.warn('Auto-play failed:', err);
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
          onError={() => {
            setIsLoading(false);
            setError(true);
          }}
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
                videoRef.current.play().catch((err) => {
                  console.warn('Auto-play failed:', err);
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
          onError={(e) => {
            console.error('Video load error:', url, e);
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
                className="text-white hover:text-blue-400 transition-colors p-2"
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
                className="text-white hover:text-blue-400 transition-colors p-2"
                aria-label="Skip backward 10 seconds"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              {/* Skip Forward */}
              <button
                onClick={skipForward}
                className="text-white hover:text-blue-400 transition-colors p-2"
                aria-label="Skip forward 10 seconds"
              >
                <SkipForward className="w-5 h-5" />
              </button>

              {/* Volume Control */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-blue-400 transition-colors p-2"
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
              <p className="text-lg font-bold mb-2">{t('mediaPage.video.failedTitle')}</p>
              <p className="text-sm">{t('mediaPage.video.failedDesc')}</p>
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
        <p className="text-lg font-bold mb-2">{t('mediaPage.video.unsupportedTitle')}</p>
        <p className="text-sm opacity-75">
          {t('mediaPage.video.unsupportedDesc')}
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-colors"
        >
          {t('mediaPage.video.openNewTab')}
        </a>
      </div>
    </div>
  );
};

const Media = () => {
  const { isTeacher } = useAuth();
  const { success, error: showError } = useToast();
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingMedia, setEditingMedia] = useState(null);
  const [formData, setFormData] = useState({
    childId: '',
    title: '',
    description: '',
    type: 'photo',
    date: new Date().toISOString().split('T')[0],
  });
  const [children, setChildren] = useState([]);
  const { t, i18n } = useTranslation();
  const [file, setFile] = useState(null);
  // Defensive: remove any legacy thumbnail field rendered from old bundles
  useEffect(() => {
    if (!showModal) return;
    const thumbInput = document.querySelector('input[placeholder="https://example.com/thumbnail.jpg"]');
    if (thumbInput) {
      const container = thumbInput.closest('div');
      if (container && container.parentElement) {
        container.parentElement.removeChild(container);
      } else {
        thumbInput.remove();
      }
    }
  }, [showModal]);

  const locale = (() => {
    if (i18n.language === 'uz') return 'uz-UZ';
    if (i18n.language === 'ru') return 'ru-RU';
    return 'en-US';
  })();

  const typeLabels = {
    photo: t('mediaPage.photoLabel'),
    video: t('mediaPage.videoLabel'),
  };

  useEffect(() => {
    loadMedia();
    if (isTeacher) {
      loadChildren();
    }
  }, [isTeacher]);

  const loadChildren = async () => {
    try {
      const parentsRes = await api.get('/teacher/parents');
      const allChildren = [];
      parentsRes.data.parents.forEach(parent => {
        if (parent.children && Array.isArray(parent.children)) {
          allChildren.push(...parent.children);
        }
      });
      setChildren(allChildren);
      if (allChildren.length > 0 && !formData.childId) {
        setFormData(prev => ({ ...prev, childId: allChildren[0].id }));
      }
    } catch (error) {
      console.error('Error loading children:', error);
    }
  };

  const loadMedia = async () => {
    try {
      setLoading(true);
      const response = await api.get('/media');
      setMedia(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading media:', error);
      showError(error.response?.data?.error || t('mediaPage.toastLoadError'));
      setMedia([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingMedia(null);
    setFormData({
      childId: children.length > 0 ? children[0].id : '',
      title: '',
      description: '',
      type: 'photo',
      date: new Date().toISOString().split('T')[0],
    });
    setShowModal(true);
    setFile(null);
  };

  const handleEdit = (mediaItem, e) => {
    e?.stopPropagation();
    setEditingMedia(mediaItem);
    setFormData({
      childId: mediaItem.childId || '',
      title: mediaItem.title || '',
      description: mediaItem.description || '',
      type: mediaItem.type || 'photo',
      date: mediaItem.date ? mediaItem.date.split('T')[0] : new Date().toISOString().split('T')[0],
    });
    setShowModal(true);
    setFile(null);
  };

  const handleDelete = async (mediaId, e) => {
    e?.stopPropagation();
    if (!window.confirm(t('mediaPage.confirmDelete'))) {
      return;
    }

    try {
      await api.delete(`/media/${mediaId}`);
      success(t('mediaPage.toastDelete'));
      loadMedia();
    } catch (error) {
      console.error('Error deleting media:', error);
      showError(error.response?.data?.error || t('mediaPage.toastError'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingMedia) {
        // Only metadata update in edit flow
        await api.put(`/media/${editingMedia.id}`, {
          childId: formData.childId,
          title: formData.title,
          description: formData.description,
          type: formData.type,
          date: formData.date
        });
        success(t('mediaPage.toastUpdate'));
      } else {
        if (!formData.childId) {
          showError(t('mediaPage.modal.selectChild'));
          return;
        }
        if (!formData.title || formData.title.trim() === '') {
          showError(t('mediaPage.modal.title'));
          return;
        }
        if (!file) {
          showError(t('mediaPage.modal.fileRequired'));
          return;
        }

        const payload = new FormData();
        payload.append('childId', formData.childId);
        payload.append('title', formData.title.trim());
        if (formData.description) payload.append('description', formData.description.trim());
        if (formData.date) payload.append('date', formData.date);
        payload.append('file', file);

        await api.post('/media/upload', payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        success(t('mediaPage.toastCreate'));
      }

      setShowModal(false);
      loadMedia();
    } catch (error) {
      console.error('Error saving media:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.details?.join(', ') || error.message || t('mediaPage.toastError');
      showError(errorMessage);
    }
  };

  const filteredMedia = filter === 'all' ? media : media.filter((item) => item.type === filter);

  if (loading) return <div className="flex justify-center items-center h-96"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight drop-shadow-sm">{t('mediaPage.title')}</h1>
          <p className="text-white/90 font-medium mt-1 drop-shadow-sm">{t('mediaPage.subtitle')}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filters */}
          <div className="flex items-center gap-1 bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
            {[
              { id: 'all', label: t('mediaPage.filters.all'), icon: LayoutGrid },
              { id: 'photo', label: t('mediaPage.filters.photo'), icon: ImageIcon },
              { id: 'video', label: t('mediaPage.filters.video'), icon: Film },
            ].map((option) => (
              <button
              key={option.id}
              onClick={() => setFilter(option.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  filter === option.id 
                  ? 'bg-white text-blue-600 shadow-md scale-105' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                }`}
              >
                <option.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{option.label}</span>
              </button>
            ))}
          </div>

          {/* Add Button (Teachers only) */}
          {isTeacher && (
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">{t('mediaPage.add')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Media Grid */}
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
                  // Video preview with play on click
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
                      onError={(e) => {
                        const originalUrl = item.url;
                        const proxyUrl = getProxyUrl(originalUrl, item.id);
                        console.error('Video load error:', {
                          original: originalUrl,
                          proxy: proxyUrl,
                          mediaId: item.id,
                          error: e
                        });
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
                  <>
                    <img
                      src={getProxyUrl(item.url || item.imageUrl || item.photoUrl, item.id)}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      onError={(e) => {
                        const originalUrl = item.url || item.imageUrl || item.photoUrl;
                        const proxyUrl = getProxyUrl(originalUrl, item.id);
                        console.error('Image load error:', {
                          original: originalUrl,
                          proxy: proxyUrl,
                          mediaId: item.id,
                          error: e
                        });
                        e.target.style.display = 'none';
                      }}
                    />
                  </>
                )}
                
                {/* Overlay on Hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6 text-white pointer-events-none">
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-1">
                    {typeLabels[item.type] || item.type}
                  </p>
                  <h3 className="text-lg font-bold leading-tight">{item.title}</h3>
                </div>

                {/* Action Buttons (Teachers only) */}
                {isTeacher && (
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleEdit(item, e)}
                      className="bg-blue-500/90 hover:bg-blue-600 backdrop-blur-md p-2 rounded-xl text-white transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      className="bg-red-500/90 hover:bg-red-600 backdrop-blur-md p-2 rounded-xl text-white transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="absolute top-4 left-4 bg-white/10 backdrop-blur-md p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="w-4 h-4 text-white" />
                </div>
              </div>

              {/* Bottom Info */}
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
        <div className="text-center py-32 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
          <ImageIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 font-bold text-lg">{t('mediaPage.empty')}</p>
        </div>
      )}

      {/* Media Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
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
                    const proxyUrl = getProxyUrl(originalUrl, selectedMedia.id);
                    console.error('Image load error in modal:', {
                      original: originalUrl,
                      proxy: proxyUrl,
                      mediaId: selectedMedia.id,
                      error: e
                    });
                    e.target.style.display = 'none';
                  }}
                />
              )}
            </div>

            {/* Sidebar Info Area */}
            <div className="flex-1 p-8 lg:p-12 overflow-y-auto bg-white">
              <button 
                onClick={() => setSelectedMedia(null)}
                className="hidden lg:flex items-center gap-2 text-gray-400 hover:text-blue-600 font-bold text-sm mb-10 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" /> {t('mediaPage.back')}
              </button>

              <div className="space-y-6">
                <div>
                  <span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {selectedMedia.type === 'video' ? t('mediaPage.videoLabel') : t('mediaPage.photoLabel')}
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
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('mediaPage.date')}</p>
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingMedia ? t('mediaPage.modal.editTitle') : t('mediaPage.modal.addTitle')}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {isTeacher && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('mediaPage.modal.child')} <span className="text-red-500">*</span>
                  </label>
                  {children.length === 0 ? (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        {t('mediaPage.modal.childHelp')}
                      </p>
                    </div>
                  ) : (
                    <select
                      required
                      value={formData.childId}
                      onChange={(e) => setFormData({ ...formData, childId: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">{t('mediaPage.modal.selectChild')}</option>
                      {children.map(child => (
                        <option key={child.id} value={child.id}>
                          {child.firstName} {child.lastName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('mediaPage.modal.title')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter media title"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('mediaPage.modal.description')}
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('mediaPage.modal.date')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('mediaPage.modal.type')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="photo">{t('mediaPage.photoLabel')}</option>
                    <option value="video">{t('mediaPage.videoLabel')}</option>
                  </select>
                </div>
              </div>

              {!editingMedia && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('mediaPage.modal.file')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('mediaPage.modal.fileHelp')}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  {t('mediaPage.modal.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {editingMedia ? t('mediaPage.modal.update') : t('mediaPage.modal.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Media;

