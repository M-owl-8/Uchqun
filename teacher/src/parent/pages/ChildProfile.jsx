import { useEffect, useState } from 'react';
import { useChild } from '../context/ChildContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../../shared/context/SocketContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import LanguageSwitcher from '../components/LanguageSwitcher';
import {
  User,
  Calendar,
  School,
  Heart,
  ShieldAlert,
  Baby,
  Award,
  ChevronRight,
  LogOut,
  X,
  AlertCircle,
  MessageSquare,
  Send,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
// Default avatar - use first avatar as fallback
const defaultAvatar = '/avatars/avatar1.jfif';

const ChildProfile = () => {
  const { children, selectedChildId, selectChild, loading: childrenLoading } = useChild();
  const { logout } = useAuth();
  const { on, off, connected } = useSocket();
  const { success: toastSuccess, error: toastError } = useToast();
  const navigate = useNavigate();
  const [child, setChild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [photoTimestamp, setPhotoTimestamp] = useState(Date.now());
  const [imageLoading, setImageLoading] = useState(true);
  const [teacherName, setTeacherName] = useState('');
  const [parentGroupName, setParentGroupName] = useState('');
  const [weeklyStats, setWeeklyStats] = useState({
    activities: 0,
    meals: 0,
    media: 0,
  });
  const [uploading, setUploading] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageSubject, setMessageSubject] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [myMessages, setMyMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [monitoringRecords, setMonitoringRecords] = useState([]);
  
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toastError(t('profile.invalidImage', { defaultValue: 'Faqat rasm fayllari qabul qilinadi' }));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toastError(t('profile.imageTooLarge', { defaultValue: 'Rasm hajmi 5MB dan katta bo\'lmasligi kerak' }));
      return;
    }

    try {
      setUploading(true);
      
      // Convert file to base64 for Appwrite storage
      const reader = new FileReader();
      const photoBase64 = await new Promise((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result;
          if (typeof result === 'string') {
            resolve(result);
          } else {
            reject(new Error('Failed to read file as base64'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      // Upload to backend with base64 (will be saved to Appwrite)
      const response = await api.put(`/child/${child.id}`, { photoBase64 }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Get the photo URL from response
      const newPhotoUrl = response.data.photo || response.data.data?.photo;
      
      // Update timestamp to force image reload
      const timestamp = Date.now();
      setPhotoTimestamp(timestamp);
      setImageLoading(true);
      
      // Update local state with new photo URL
      const updatedChild = { 
        ...child, 
        photo: newPhotoUrl
      };
      setChild(updatedChild);
      setShowAvatarSelector(false);
      
      // Preload new image
      if (newPhotoUrl) {
        const img = new Image();
        // Appwrite URL or full URL - use as-is
        // Local path - prepend API_BASE
        const photoUrl = newPhotoUrl.startsWith('/avatars/')
          ? newPhotoUrl
          : newPhotoUrl.startsWith('http://') || newPhotoUrl.startsWith('https://')
          ? newPhotoUrl // Appwrite URL or full URL - use as-is
          : `${API_BASE}${newPhotoUrl.startsWith('/') ? '' : '/'}${newPhotoUrl}`;
        
        // For Appwrite URLs, don't add timestamp (they have query params)
        const finalUrl = newPhotoUrl.startsWith('http://') || newPhotoUrl.startsWith('https://')
          ? photoUrl
          : `${photoUrl}?t=${timestamp}`;
        
        img.src = finalUrl;
        img.onload = () => {
          setImageLoading(false);
        };
        img.onerror = () => {
          setImageLoading(false);
        };
      }
      
      // Reload child data from server to ensure we have the latest
      try {
        const childResponse = await api.get(`/child/${child.id}`);
        setChild(childResponse.data);
        setPhotoTimestamp(Date.now());
      } catch (reloadError) {
        // Continue with local update if reload fails
      }
      
      toastSuccess(t('profile.avatarUpdated', { defaultValue: 'Rasm muvaffaqiyatli yuklandi' }));
    } catch (err) {
      
      let errorMessage = t('profile.uploadError', { defaultValue: 'Rasm yuklashda xatolik yuz berdi' });
      
      if (err.response) {
        // Server responded with error
        if (err.response.status === 403) {
          // Check if it's an authentication issue
          const serverError = err.response.data?.error || '';
          if (serverError.includes('Account not approved') || serverError.includes('Account is not active')) {
            errorMessage = serverError;
          } else {
            errorMessage = err.response.data?.error || 'Ruxsat yo\'q. Iltimos, qayta kirib ko\'ring.';
          }
        } else if (err.response.status === 401) {
          errorMessage = 'Sessiya muddati tugagan. Iltimos, qayta kirib ko\'ring.';
          // Redirect to login
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        } else if (err.response.status === 500) {
          errorMessage = err.response.data?.message || err.response.data?.error || 'Server xatosi. Iltimos, qayta urinib ko\'ring.';
        } else {
          errorMessage = err.response.data?.error || err.response.data?.message || errorMessage;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      toastError(errorMessage);
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const { t, i18n } = useTranslation();
  
  // API base URL (rasmlar uchun)
  const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://uchqun-production-2d8a.up.railway.app';

  const locale = {
    uz: 'uz-UZ',
    ru: 'ru-RU',
    en: 'en-US',
  }[i18n.language] || 'en-US';

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    toastSuccess(t('profile.logoutSuccess', { defaultValue: 'Muvaffaqiyatli chiqildi' }));
    setTimeout(() => {
      logout();
      navigate('/login');
    }, 500);
  };

  const handleSendMessage = async () => {
    if (!messageSubject.trim() || !messageText.trim()) {
      toastError(t('profile.messageRequired', { defaultValue: 'Subject va xabar to\'ldirilishi kerak' }));
      return;
    }

    setSendingMessage(true);
    try {
      await api.post('/parent/message-to-super-admin', {
        subject: messageSubject.trim(),
        message: messageText.trim(),
      });
      toastSuccess(t('profile.messageSent', { defaultValue: 'Xabar muvaffaqiyatli yuborildi' }));
      setMessageSubject('');
      setMessageText('');
      setShowMessageModal(false);
      // Reload messages
      const response = await api.get('/parent/messages');
      setMyMessages(response.data.data || []);
    } catch (error) {
      toastError(error.response?.data?.error || t('profile.messageError', { defaultValue: 'Xabar yuborishda xatolik' }));
    } finally {
      setSendingMessage(false);
    }
  };

  // Load messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setLoadingMessages(true);
        const response = await api.get('/parent/messages');
        setMyMessages(response.data.data || []);
      } catch (error) {
        setMyMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    };
    loadMessages();
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      const loadChild = async () => {
        try {
          setLoading(true);
          setError(null);
          const [childResponse, activitiesResponse, mealsResponse, mediaResponse, profileResponse, monitoringResponse] = await Promise.all([
            api.get(`/child/${selectedChildId}`),
            api.get(`/activities?childId=${selectedChildId}`).catch(() => ({ data: [] })),
            api.get(`/meals?childId=${selectedChildId}`).catch(() => ({ data: [] })),
            api.get(`/media?childId=${selectedChildId}`).catch(() => ({ data: [] })),
            api.get('/parent/profile').catch(() => null),
            api.get(`/parent/emotional-monitoring/child/${selectedChildId}`).catch(() => ({ data: { data: [] } })),
          ]);

          setChild(childResponse.data);
          
          // Preload image for faster display
          if (childResponse.data?.photo) {
            const img = new Image();
            const photoUrl = childResponse.data.photo.startsWith('/avatars/')
              ? childResponse.data.photo
              : childResponse.data.photo.startsWith('http://') || childResponse.data.photo.startsWith('https://')
              ? childResponse.data.photo
              : `${API_BASE}${childResponse.data.photo.startsWith('/') ? '' : '/'}${childResponse.data.photo}`;
            img.src = photoUrl;
            img.onload = () => setImageLoading(false);
            img.onerror = () => setImageLoading(false);
          } else {
            setImageLoading(false);
          }
          
          const assignedTeacher = profileResponse?.data?.data?.user?.assignedTeacher;
          // Faqat guruh nomini parent'dan olamiz
          const parentGroup = profileResponse?.data?.data?.user?.group;
          setParentGroupName(parentGroup?.name || '');
          
          const combinedTeacherName = assignedTeacher
            ? [assignedTeacher.firstName, assignedTeacher.lastName].filter(Boolean).join(' ')
            : childResponse.data?.teacher;
          setTeacherName(combinedTeacherName || '');

          // Calculate weekly stats (last 7 days)
          const now = new Date();
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

          const activities = Array.isArray(activitiesResponse.data) ? activitiesResponse.data : [];
          const meals = Array.isArray(mealsResponse.data) ? mealsResponse.data : [];
          const media = Array.isArray(mediaResponse.data) ? mediaResponse.data : [];

          const activitiesThisWeek = activities.filter(a => {
            const activityDate = new Date(a.date);
            return activityDate >= weekAgo;
          }).length;

          const mealsThisWeek = meals.filter(m => {
            const mealDate = new Date(m.date);
            return mealDate >= weekAgo;
          }).length;

          const mediaThisWeek = media.filter(m => {
            const mediaDate = new Date(m.date);
            return mediaDate >= weekAgo;
          }).length;

          setWeeklyStats({
            activities: activitiesThisWeek,
            meals: mealsThisWeek,
            media: mediaThisWeek,
          });

          // Load monitoring records
          const monitoring = Array.isArray(monitoringResponse.data?.data) ? monitoringResponse.data.data : [];
          setMonitoringRecords(monitoring);
        } catch (error) {
          if (error.response?.status === 404) {
            setError(t('child.errorNotFound'));
          } else {
            setError(t('child.errorLoading'));
          }
        } finally {
          setLoading(false);
        }
      };
      loadChild();
    } else if (!childrenLoading && children.length === 0) {
      setError(t('child.errorNotFound'));
      setLoading(false);
    }
  }, [selectedChildId, children, childrenLoading, t, API_BASE]);

  // Real-time WebSocket listeners
  useEffect(() => {
    if (!connected || !selectedChildId) return;

    const handleChildUpdate = (data) => {
      if (data.child?.id === selectedChildId) {
        // Update photo timestamp to force image refresh
        setPhotoTimestamp(Date.now());
        // Trigger reload by updating a dependency
        window.location.reload(); // Simple but effective for now
      }
    };

    const handleDataChange = (data) => {
      // Check if event is for our selected child
      const eventChildId = data.activity?.childId || data.meal?.childId || data.media?.childId || data.childId;
      if (eventChildId === selectedChildId) {
        // Trigger reload by updating a dependency
        window.location.reload(); // Simple but effective for now
      }
    };

    // Subscribe to events
    on('child:updated', handleChildUpdate);
    on('activity:created', handleDataChange);
    on('activity:updated', handleDataChange);
    on('activity:deleted', handleDataChange);
    on('meal:created', handleDataChange);
    on('meal:updated', handleDataChange);
    on('meal:deleted', handleDataChange);
    on('media:created', handleDataChange);
    on('media:updated', handleDataChange);
    on('media:deleted', handleDataChange);

    // Cleanup
    return () => {
      off('child:updated', handleChildUpdate);
      off('activity:created', handleDataChange);
      off('activity:updated', handleDataChange);
      off('activity:deleted', handleDataChange);
      off('meal:created', handleDataChange);
      off('meal:updated', handleDataChange);
      off('meal:deleted', handleDataChange);
      off('media:created', handleDataChange);
      off('media:updated', handleDataChange);
      off('media:deleted', handleDataChange);
    };
  }, [connected, selectedChildId, on, off]);

  const calculateAge = (dateOfBirth) => {
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  if (childrenLoading || loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Show child selector if multiple children
  if (Array.isArray(children) && children.length > 1 && !selectedChildId) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="mb-10">
          <h1 className="text-4xl font-black text-white tracking-tight drop-shadow-sm">{t('child.title')}</h1>
          <p className="text-gray-500 font-medium">{t('child.selectPrompt')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {children.map((c) => (
            <Card
              key={c.id}
              onClick={() => selectChild(c.id)}
              className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl">
                  {c.firstName?.charAt(0)}{c.lastName?.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {c.firstName} {c.lastName}
                  </h3>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">{c.school}</p>
                    {parentGroupName && (
                      <p className="text-sm text-gray-500">{parentGroupName}</p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !child) {
    return (
      <div className="max-w-2xl mx-auto py-20">
        <Card className="text-center p-12">
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="w-12 h-12 text-blue-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-4">{t('child.notFoundTitle')}</h2>
          <p className="text-gray-600 font-medium mb-6">
            {error || t('child.notFoundDesc')}
          </p>
          <p className="text-sm text-gray-500">
            {t('child.notFoundHelp')}
          </p>
        </Card>
      </div>
    );
  }


  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Child Selector (if multiple children) - Prominent at top */}
      {Array.isArray(children) && children.length > 1 && (
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Users className="w-4 h-4 inline mr-2" />
                {t('child.selectLabel', { defaultValue: 'Farzandni tanlang' })}
              </label>
              <select
                value={selectedChildId || ''}
                onChange={(e) => {
                  selectChild(e.target.value);
                  // Reset state to trigger reload
                  setChild(null);
                  setLoading(true);
                  setImageLoading(true);
                  setPhotoTimestamp(Date.now());
                }}
                className="w-full sm:w-auto min-w-[250px] px-4 py-2.5 bg-white border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-gray-900 shadow-sm hover:border-blue-400 transition-colors"
              >
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} {c.school ? ` - ${c.school}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-sm text-gray-600 font-medium">
              {t('child.totalChildren', { count: children.length, defaultValue: `Jami: ${children.length} ta farzand` })}
            </div>
          </div>
        </Card>
      )}

      {/* --- Top Profile Hero --- */}
      <div className="relative overflow-hidden bg-white rounded-[2rem] shadow-xl border border-gray-100 p-8 md:p-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 opacity-50" />

        <div className="relative flex flex-col md:flex-row items-center gap-8">
          <div className="relative">
            <div className="relative group cursor-pointer">
              {imageLoading && (
                <div className="absolute inset-0 w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-gray-200 animate-pulse flex items-center justify-center">
                  <User className="w-12 h-12 md:w-16 md:h-16 text-gray-400" />
                </div>
              )}
              <img
                key={`${child.photo}-${photoTimestamp}`}
                src={
                  child.photo 
                    ? (child.photo.startsWith('/avatars/') 
                        // Local avatar - use as-is (frontend path)
                        ? child.photo
                        : child.photo.startsWith('http://') || child.photo.startsWith('https://')
                        // Appwrite URL or full URL - use as-is (Appwrite URLs already have query params)
                        ? child.photo
                        // Relative path - prepend API_BASE
                        : `${API_BASE}${child.photo.startsWith('/') ? '' : '/'}${child.photo}?t=${photoTimestamp}`)
                    : defaultAvatar
                }
                alt={`${child.firstName} ${child.lastName}`}
                className={`w-32 h-32 md:w-40 md:h-40 rounded-3xl object-cover shadow-2xl border-4 border-white transition-opacity duration-300 ${
                  imageLoading ? 'opacity-0' : 'opacity-100'
                }`}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                onLoad={(e) => {
                  setImageLoading(false);
                  e.target.style.opacity = '1';
                }}
                onError={(e) => {
                  setImageLoading(false);
                  // Try default avatar, if that fails, use placeholder
                  if (e.target.src !== defaultAvatar && e.target.src !== e.target.dataset.fallback) {
                    e.target.dataset.fallback = e.target.src;
                    e.target.src = defaultAvatar;
                  } else {
                    // If default avatar also fails, use data URI placeholder
                    e.target.onerror = null; // Prevent infinite loop
                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2U1ZTdlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
                  }
                  e.target.style.opacity = '1';
                }}
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                {uploading ? (
                  <LoadingSpinner size="md" />
                ) : (
                  <span className="text-white text-sm font-semibold">
                    Rasmni o&apos;zgartirish
                  </span>
                )}
              </div>

              {/* Avatar selector modal */}
              <button
                onClick={() => setShowAvatarSelector(true)}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={uploading}
              />

            </div>


            <div className="absolute -bottom-2 -right-2 bg-green-500 w-6 h-6 rounded-full border-4 border-white shadow-sm" title="Active" />
          </div>

          <div className="flex-1 text-center md:text-left space-y-4">
            <div>
              <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 mb-2">
                <h1 className="text-4xl font-black text-gray-900 leading-tight">
                  {child.firstName} {child.lastName}
                </h1>
                <span className="px-4 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider">
                  {t(`child.gender.${child.gender?.toLowerCase()}`) || child.gender}
                </span>
              </div>
              <p className="text-lg text-gray-700 font-medium flex items-center justify-center md:justify-start gap-2">
                <Baby className="w-5 h-5 text-blue-600" />
                {t('child.ageYears', { count: calculateAge(child.dateOfBirth) })}
              </p>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
                <School className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-bold text-gray-800">{child.school}</span>
              </div>
              {parentGroupName && (
                <div className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-bold text-gray-800">{parentGroupName}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* --- Left Column: Details --- */}
        <div className="lg:col-span-2 space-y-8">

          {/* Detailed Info Grid */}
          <section className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <User className="w-6 h-6 text-blue-600" /> {t('child.basicInfo')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <InfoItem label={t('child.fullName')} value={`${child.firstName} ${child.lastName}`} icon={User} />
              <InfoItem label={t('child.birthDate')} value={new Date(child.dateOfBirth).toLocaleDateString(locale)} icon={Calendar} />
              <InfoItem label={t('child.diagnosis')} value={child.disabilityType} icon={ShieldAlert} color="text-red-500" />
              <InfoItem label={t('child.teacher')} value={teacherName || child.teacher || '—'} icon={Award} color="text-blue-500" />
            </div>
          </section>

          {/* Special Needs Section */}
          <section className="bg-gradient-to-br from-red-50 to-blue-50 rounded-[2rem] p-8 border border-red-100 shadow-inner">
            <h3 className="text-xl font-bold text-red-900 mb-4 flex items-center gap-2">
              <Heart className="w-6 h-6 text-red-600 animate-pulse" /> {t('child.specialNeeds')}
            </h3>
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 text-red-800 font-medium leading-relaxed border border-white/50">
              {child.specialNeeds}
            </div>
          </section>

          {/* Emotional Monitoring Section */}
          {monitoringRecords.length > 0 && (
            <section className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Heart className="w-6 h-6 text-pink-600" /> {t('profile.monitoringJournal', { defaultValue: 'Monitoring Journal' })}
              </h3>
              <div className="space-y-4">
                {monitoringRecords.slice(0, 5).map((record) => {
                  const emotionalState = record.emotionalState || {};
                  const checkedCount = Object.values(emotionalState).filter(Boolean).length;
                  const totalCount = Object.keys(emotionalState).length;
                  const percentage = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;
                  
                  return (
                    <div key={record.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {new Date(record.date).toLocaleDateString('uz-UZ', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                          {record.teacher && (
                            <p className="text-sm text-gray-500 mt-1">
                              Тарбиячи: {record.teacher.firstName} {record.teacher.lastName}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">{percentage}%</div>
                          <div className="text-xs text-gray-500">
                            {checkedCount} / {totalCount}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        {Object.entries({
                          stable: 'Боланинг ҳиссий ҳолати барқарор',
                          positiveEmotions: 'Бола ижобий ҳис-туйғуларни намоён этади',
                          noAnxiety: 'Хавотирланиш белгилари йўқ',
                          noHostility: 'Душманлик муносабати кузатилмайди',
                          calmResponse: 'Танбеҳ ва илтимосларга хотиржам муносабат',
                          showsEmpathy: 'Бошқа болаларга ҳамдардлик кўрсатади',
                          quickRecovery: 'Стрессли вазиятдан кейин тезда ўзини ўнглаб олади',
                          stableMood: 'Кайфияти кун давомида барқарор туради',
                          trustingRelationship: 'Тарбиячи билан муносабати ишончли',
                        }).map(([key, label]) => (
                          emotionalState[key] && (
                            <div key={key} className="flex items-center gap-2 text-sm text-gray-700">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              <span>{label}</span>
                            </div>
                          )
                        ))}
                      </div>
                      
                      {record.notes && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-sm font-medium text-gray-700 mb-1">Изоҳ:</p>
                          <p className="text-sm text-gray-600">{record.notes}</p>
                        </div>
                      )}
                      
                      {record.teacherSignature && (
                        <div className="mt-2 text-xs text-gray-500">
                          Имзо: {record.teacherSignature}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {monitoringRecords.length > 5 && (
                <p className="text-sm text-gray-500 mt-4 text-center">
                  +{monitoringRecords.length - 5} та яна жумла
                </p>
              )}
            </section>
          )}
        </div>

        {/* --- Right Column: Sidebar --- */}
        <div className="space-y-8">
          {/* Account controls (Language + Exit) */}
          <section className="bg-white/95 backdrop-blur-sm rounded-[2rem] p-6 shadow-xl border border-white/20">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {t('profile.account', { defaultValue: 'Account' })}
            </h3>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-gray-700">
                {t('language', { defaultValue: 'Language' })}
              </div>
              <LanguageSwitcher />
            </div>
            <button
              onClick={() => setShowMessageModal(true)}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              {t('profile.contactSuperAdmin', { defaultValue: 'Super-adminga xabar yuborish' })}
            </button>
            {myMessages.length > 0 && (
              <button
                onClick={() => setShowMessagesModal(true)}
                className="mt-2 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-50 text-green-600 border border-green-100 hover:bg-green-100 transition-colors relative"
              >
                <MessageSquare className="w-4 h-4" />
                {t('profile.myMessages', { defaultValue: 'Mening xabarlarim' })}
                {myMessages.some(m => m.reply) && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
                    {myMessages.filter(m => m.reply).length}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={handleLogout}
              className="mt-2 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {t('nav.exit', { defaultValue: 'Exit' })}
            </button>
          </section>

          {/* Activity Summary - Weekly Results */}
          <section className="bg-gray-800 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute bottom-0 right-0 opacity-20">
              <Award className="w-40 h-40 text-gray-700" />
            </div>
            <h3 className="text-xl font-bold mb-6 text-white">{t('child.weeklyResults')}</h3>
            <div className="space-y-6 relative z-10">
              <StatRow
                label={t('child.activities')}
                value={weeklyStats.activities}
                color="bg-blue-500"
              />
              <StatRow
                label={t('child.meals')}
                value={weeklyStats.meals}
                color="bg-blue-500"
              />
              <StatRow
                label={t('child.media')}
                value={weeklyStats.media}
                color="bg-blue-500"
              />
            </div>
          </section>
        </div>

      </div>

      {/* Avatar Upload Modal */}
      {showAvatarSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAvatarSelector(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6 text-center">Rasm yuklash</h2>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                  id="avatar-upload"
                />
                <label
                  htmlFor="avatar-upload"
                  className={`cursor-pointer flex flex-col items-center gap-4 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {uploading ? (
                    <>
                      <LoadingSpinner size="md" />
                      <span className="text-gray-600 font-medium">Yuklanmoqda...</span>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-8 h-8 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-gray-700 font-semibold mb-1">Galeriyadan rasm tanlang</p>
                        <p className="text-sm text-gray-500">JPG, PNG yoki GIF (maks. 5MB)</p>
                      </div>
                    </>
                  )}
                </label>
              </div>
            </div>
            <button
              onClick={() => setShowAvatarSelector(false)}
              disabled={uploading}
              className="mt-6 w-full py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('profile.cancel', { defaultValue: 'Bekor qilish' })}
            </button>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300" onClick={() => setShowLogoutModal(false)}>
          <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{t('profile.logoutTitle', { defaultValue: 'Chiqish' })}</h2>
              </div>
              <button
                onClick={() => setShowLogoutModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <p className="text-gray-600 mb-8 text-lg">
              {t('profile.confirmLogout', { defaultValue: 'Chiqishni xohlaysizmi?' })}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
              >
                {t('profile.cancel', { defaultValue: 'Yo\'q' })}
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors shadow-md"
              >
                {t('profile.yes', { defaultValue: 'Ha' })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300" onClick={() => setShowMessageModal(false)}>
          <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-full">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{t('profile.contactSuperAdmin', { defaultValue: 'Super-adminga xabar yuborish' })}</h2>
              </div>
              <button
                onClick={() => setShowMessageModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('profile.subject', { defaultValue: 'Mavzu' })}</label>
                <input
                  type="text"
                  value={messageSubject}
                  onChange={(e) => setMessageSubject(e.target.value)}
                  placeholder={t('profile.subjectPlaceholder', { defaultValue: 'Xabar mavzusi...' })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('profile.message', { defaultValue: 'Xabar' })}</label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={6}
                  placeholder={t('profile.messagePlaceholder', { defaultValue: 'Xabaringizni yozing...' })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowMessageModal(false)}
                className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
                disabled={sendingMessage}
              >
                {t('profile.cancel', { defaultValue: 'Bekor qilish' })}
              </button>
              <button
                onClick={handleSendMessage}
                disabled={sendingMessage || !messageSubject.trim() || !messageText.trim()}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sendingMessage ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t('profile.sending', { defaultValue: 'Yuborilmoqda...' })}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{t('profile.send', { defaultValue: 'Yuborish' })}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* My Messages Modal */}
      {showMessagesModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300" onClick={() => setShowMessagesModal(false)}>
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-full">
                  <MessageSquare className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{t('profile.myMessages', { defaultValue: 'Mening xabarlarim' })}</h2>
              </div>
              <button
                onClick={() => setShowMessagesModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {loadingMessages ? (
              <div className="flex justify-center items-center py-12">
                <LoadingSpinner size="md" />
              </div>
            ) : myMessages.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">{t('profile.noMessages', { defaultValue: 'Hozircha xabarlar yo\'q' })}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myMessages.map((msg) => (
                  <div key={msg.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{msg.subject}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(msg.createdAt).toLocaleDateString('uz-UZ', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      {msg.reply && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                          {t('profile.replied', { defaultValue: 'Javob berildi' })}
                        </span>
                      )}
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">{t('profile.yourMessage', { defaultValue: 'Sizning xabaringiz' })}:</p>
                      <p className="text-gray-800 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap">{msg.message}</p>
                    </div>

                    {msg.reply && (
                      <div className="border-t border-gray-200 pt-4 mt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-2 bg-blue-100 rounded-full">
                            <MessageSquare className="w-4 h-4 text-blue-600" />
                          </div>
                          <p className="text-sm font-medium text-blue-700">{t('profile.superAdminReply', { defaultValue: 'Super-admin javobi' })}</p>
                          <span className="text-xs text-gray-500 ml-auto">
                            {new Date(msg.repliedAt).toLocaleDateString('uz-UZ', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-gray-800 bg-blue-50 rounded-lg p-4 whitespace-pre-wrap">{msg.reply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Yordamchi Komponentlar (Reusable Components) ---

const InfoItem = ({ label, value, icon: Icon, color = "text-blue-500" }) => (
  <div className="group">
    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">{label}</label>
    <div className="flex items-center gap-3">
      <div className={`p-2.5 rounded-xl bg-gray-50 group-hover:scale-110 transition-transform duration-200`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <p className="text-gray-900 font-bold text-lg">{value}</p>
    </div>
  </div>
);

const StatRow = ({ label, value, color }) => (
  <div className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity">
    <div className="flex items-center gap-3">
      <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="text-gray-300 text-sm font-medium">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-xl font-black text-white">{value}</span>
      <ChevronRight className="w-4 h-4 text-gray-400" />
    </div>
  </div>
);

export default ChildProfile;