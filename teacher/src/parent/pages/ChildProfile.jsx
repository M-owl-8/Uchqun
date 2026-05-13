import { useEffect, useState } from 'react';
import { useChild } from '../context/ChildContext';
import { useSocket } from '../../shared/context/SocketContext';
import api from '../services/api';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { User, Calendar, Heart, ShieldAlert, Award, LogOut, MessageSquare, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ChildProfileHero from './childProfile/ChildProfileHero';
import AvatarUploadModal from './childProfile/AvatarUploadModal';
import LogoutModal from './childProfile/LogoutModal';
import MessageModal from './childProfile/MessageModal';
import MessagesModal from './childProfile/MessagesModal';
import EmotionalMonitoringSection from './childProfile/EmotionalMonitoringSection';
import { InfoItem, StatRow } from './childProfile/childProfileUtils';

const ChildProfile = () => {
  const { children, selectedChildId, selectChild, loading: childrenLoading } = useChild();
  const { on, off, connected } = useSocket();
  const { t, i18n } = useTranslation();
  const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
  const locale = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' }[i18n.language] || 'en-US';

  const [child, setChild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [childRefreshKey, setChildRefreshKey] = useState(0);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);
  const [photoTimestamp, setPhotoTimestamp] = useState(Date.now());
  const [imageLoading, setImageLoading] = useState(true);
  const [teacherName, setTeacherName] = useState('');
  const [parentGroupName, setParentGroupName] = useState('');
  const [weeklyStats, setWeeklyStats] = useState({ activities: 0, meals: 0, media: 0 });
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [myMessages, setMyMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [monitoringRecords, setMonitoringRecords] = useState([]);

  const handleUploadSuccess = (updatedChild) => {
    if (updatedChild) setChild(updatedChild);
    setPhotoTimestamp(Date.now());
    setImageLoading(true);
  };

  const handleImageLoad = (e) => {
    setImageLoading(false);
    e.target.style.opacity = '1';
  };

  const handleImageError = (e) => {
    setImageLoading(false);
    const defaultAvatar = '/avatars/avatar1.jfif';
    if (e.target.src !== defaultAvatar && e.target.src !== e.target.dataset.fallback) {
      e.target.dataset.fallback = e.target.src;
      e.target.src = defaultAvatar;
    } else {
      e.target.onerror = null;
      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2U1ZTdlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
    }
    e.target.style.opacity = '1';
  };

  useEffect(() => {
    const loadMessages = async () => {
      try {
        setLoadingMessages(true);
        const response = await api.get('/parent/messages');
        setMyMessages(response.data.data || []);
      } catch {
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
          const [childResponse, profileResponse, monitoringResponse] = await Promise.all([
            api.get(`/child/${selectedChildId}`),
            api.get('/parent/profile').catch(() => null),
            api.get(`/parent/emotional-monitoring/child/${selectedChildId}`).catch(() => ({ data: { data: [] } })),
          ]);
          setChild(childResponse.data);
          if (childResponse.data?.photo) {
            const img = new Image();
            const p = childResponse.data.photo;
            img.src = p.startsWith('/avatars/') || p.startsWith('http://') || p.startsWith('https://')
              ? p
              : `${API_BASE}${p.startsWith('/') ? '' : '/'}${p}`;
            img.onload = () => setImageLoading(false);
            img.onerror = () => setImageLoading(false);
          } else {
            setImageLoading(false);
          }
          const assignedTeacher = profileResponse?.data?.data?.user?.assignedTeacher;
          const parentGroup = profileResponse?.data?.data?.user?.group;
          setParentGroupName(parentGroup?.name || '');
          setTeacherName(
            assignedTeacher
              ? [assignedTeacher.firstName, assignedTeacher.lastName].filter(Boolean).join(' ')
              : childResponse.data?.teacher || ''
          );
          setMonitoringRecords(
            Array.isArray(monitoringResponse.data?.data) ? monitoringResponse.data.data : []
          );
        } catch (err) {
          setError(err.response?.status === 404 ? t('child.errorNotFound') : t('child.errorLoading'));
        } finally {
          setLoading(false);
        }
      };
      loadChild();
    } else if (!childrenLoading && children.length === 0) {
      setError(t('child.errorNotFound'));
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChildId, childrenLoading, childRefreshKey]);

  useEffect(() => {
    if (!selectedChildId) return;
    const loadStats = async () => {
      try {
        const [activitiesRes, mealsRes, mediaRes] = await Promise.all([
          api.get(`/activities?childId=${selectedChildId}`).catch(() => ({ data: [] })),
          api.get(`/meals?childId=${selectedChildId}`).catch(() => ({ data: [] })),
          api.get(`/media?childId=${selectedChildId}`).catch(() => ({ data: [] })),
        ]);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const inWeek = (item) => new Date(item.date) >= weekAgo;
        setWeeklyStats({
          activities: (Array.isArray(activitiesRes.data) ? activitiesRes.data : []).filter(inWeek).length,
          meals: (Array.isArray(mealsRes.data) ? mealsRes.data : []).filter(inWeek).length,
          media: (Array.isArray(mediaRes.data) ? mediaRes.data : []).filter(inWeek).length,
        });
      } catch { /* non-critical */ }
    };
    loadStats();
  }, [selectedChildId, statsRefreshKey]);

  useEffect(() => {
    if (!connected || !selectedChildId) return;
    const handleChildUpdate = (data) => {
      if (data.child?.id === selectedChildId) {
        setPhotoTimestamp(Date.now());
        setChildRefreshKey((k) => k + 1);
      }
    };
    const handleDataChange = (data) => {
      const eventChildId = data.activity?.childId || data.meal?.childId || data.media?.childId || data.childId;
      if (eventChildId === selectedChildId) setStatsRefreshKey((k) => k + 1);
    };
    const events = ['activity:created','activity:updated','activity:deleted','meal:created','meal:updated','meal:deleted','media:created','media:updated','media:deleted'];
    on('child:updated', handleChildUpdate);
    events.forEach((e) => on(e, handleDataChange));
    return () => {
      off('child:updated', handleChildUpdate);
      events.forEach((e) => off(e, handleDataChange));
    };
  }, [connected, selectedChildId, on, off]);

  if (childrenLoading || loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (Array.isArray(children) && children.length > 1 && !selectedChildId) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="mb-10">
          <h1 className="text-4xl font-black text-white tracking-tight drop-shadow-sm">{t('child.title')}</h1>
          <p className="text-gray-500 font-medium">{t('child.selectPrompt')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {children.map((c) => (
            <Card key={c.id} onClick={() => selectChild(c.id)} className="p-6 cursor-pointer hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl">
                  {c.firstName?.charAt(0)}{c.lastName?.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{c.firstName} {c.lastName}</h3>
                  <p className="text-sm text-gray-500">{c.childSchool?.name || ''}</p>
                  {parentGroupName && <p className="text-sm text-gray-500">{parentGroupName}</p>}
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
          <p className="text-gray-600 font-medium mb-6">{error || t('child.notFoundDesc')}</p>
          <p className="text-sm text-gray-500">{t('child.notFoundHelp')}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

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
                  setChild(null);
                  setLoading(true);
                  setImageLoading(true);
                  setPhotoTimestamp(Date.now());
                }}
                className="w-full sm:w-auto min-w-[250px] px-4 py-2.5 bg-white border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-gray-900 shadow-sm hover:border-blue-400 transition-colors"
              >
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}{c.childSchool?.name ? ` - ${c.childSchool.name}` : ''}
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

      <ChildProfileHero
        child={child}
        photoTimestamp={photoTimestamp}
        imageLoading={imageLoading}
        onImageLoad={handleImageLoad}
        onImageError={handleImageError}
        onAvatarClick={() => setShowAvatarSelector(true)}
        parentGroupName={parentGroupName}
        API_BASE={API_BASE}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
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

          <section className="bg-gradient-to-br from-red-50 to-blue-50 rounded-[2rem] p-8 border border-red-100 shadow-inner">
            <h3 className="text-xl font-bold text-red-900 mb-4 flex items-center gap-2">
              <Heart className="w-6 h-6 text-red-600 animate-pulse" /> {t('child.specialNeeds')}
            </h3>
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 text-red-800 font-medium leading-relaxed border border-white/50">
              {child.specialNeeds}
            </div>
          </section>

          <EmotionalMonitoringSection records={monitoringRecords} />
        </div>

        <div className="space-y-8">
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
              {t('profile.contactGovernment', { defaultValue: 'Davlatga xabar yuborish' })}
            </button>
            {myMessages.length > 0 && (
              <button
                onClick={() => setShowMessagesModal(true)}
                className="mt-2 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-50 text-green-600 border border-green-100 hover:bg-green-100 transition-colors relative"
              >
                <MessageSquare className="w-4 h-4" />
                {t('profile.myMessages', { defaultValue: 'Mening xabarlarim' })}
                {myMessages.some((m) => m.reply) && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
                    {myMessages.filter((m) => m.reply).length}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={() => setShowLogoutModal(true)}
              className="mt-2 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {t('nav.exit', { defaultValue: 'Exit' })}
            </button>
          </section>

          <section className="bg-gray-800 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute bottom-0 right-0 opacity-20">
              <Award className="w-40 h-40 text-gray-700" />
            </div>
            <h3 className="text-xl font-bold mb-6 text-white">{t('child.weeklyResults')}</h3>
            <div className="space-y-6 relative z-10">
              <StatRow label={t('child.activities')} value={weeklyStats.activities} color="bg-blue-500" />
              <StatRow label={t('child.meals')} value={weeklyStats.meals} color="bg-blue-500" />
              <StatRow label={t('child.media')} value={weeklyStats.media} color="bg-blue-500" />
            </div>
          </section>
        </div>
      </div>

      <AvatarUploadModal
        show={showAvatarSelector}
        childId={child.id}
        onClose={() => setShowAvatarSelector(false)}
        onUploadSuccess={handleUploadSuccess}
      />
      <LogoutModal
        show={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
      />
      <MessageModal
        show={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        onSent={(messages) => setMyMessages(messages)}
      />
      <MessagesModal
        show={showMessagesModal}
        onClose={() => setShowMessagesModal(false)}
        messages={myMessages}
        loadingMessages={loadingMessages}
      />
    </div>
  );
};

export default ChildProfile;
