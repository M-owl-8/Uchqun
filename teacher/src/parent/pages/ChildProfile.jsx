import { useEffect, useState } from 'react';
import { useChild } from '../context/ChildContext';
import { useSocket } from '../../shared/context/SocketContext';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { User, Calendar, Heart, ShieldAlert, Award, LogOut, MessageSquare, Users, TrendingUp, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatDateMedium } from '@shared/utils/formatDate';
import ChildProfileHero from './childProfile/ChildProfileHero';
import AvatarUploadModal from './childProfile/AvatarUploadModal';
import LogoutModal from './childProfile/LogoutModal';
import MessageModal from './childProfile/MessageModal';
import MessagesModal from './childProfile/MessagesModal';
import EmotionalMonitoringSection from './childProfile/EmotionalMonitoringSection';
import { InfoItem, StatRow } from './childProfile/childProfileUtils';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const ChildProfile = () => {
  const { children, selectedChildId, selectChild, loading: childrenLoading } = useChild();
  const { on, off, connected } = useSocket();
  const { t, i18n } = useTranslation();


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
  const [messagesError, setMessagesError] = useState(null);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [escalationTarget, setEscalationTarget] = useState(null); // { messageId, subject, currentLevel }
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
    const controller = new AbortController();
    const loadMessages = async () => {
      try {
        setLoadingMessages(true);
        setMessagesError(null);
        const response = await api.get('/parent/messages', { signal: controller.signal });
        setMyMessages(response.data.data || []);
      } catch (error) {
        if (error.code === 'ERR_CANCELED') return;
        setMyMessages([]);
        setMessagesError(t('profile.messageError'));
      } finally {
        setLoadingMessages(false);
      }
    };
    loadMessages();
    return () => controller.abort();
  }, [t]);

  useEffect(() => {
    if (selectedChildId) {
      const controller = new AbortController();
      const loadChild = async () => {
        try {
          setLoading(true);
          setError(null);
          const [childResponse, profileResponse, monitoringResponse] = await Promise.all([
            api.get(`/child/${selectedChildId}`, { signal: controller.signal }),
            api.get('/parent/profile', { signal: controller.signal }).catch(() => null),
            api.get(`/parent/emotional-monitoring/child/${selectedChildId}`, { signal: controller.signal }).catch(() => ({ data: { data: [] } })),
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
          if (err.code === 'ERR_CANCELED') return;
          setError(err.response?.status === 404 ? t('child.errorNotFound') : t('child.errorLoading'));
        } finally {
          setLoading(false);
        }
      };
      loadChild();
      return () => controller.abort();
    } else if (!childrenLoading && children.length === 0) {
      setError(t('child.errorNotFound'));
      setLoading(false);
    }
  }, [selectedChildId, childrenLoading, childRefreshKey, children, t]);

  useEffect(() => {
    if (!selectedChildId) return;
    const controller = new AbortController();
    const loadStats = async () => {
      try {
        const [activitiesRes, mealsRes, mediaRes] = await Promise.all([
          api.get(`/activities?childId=${selectedChildId}`, { signal: controller.signal }).catch(() => ({ data: [] })),
          api.get(`/meals?childId=${selectedChildId}`, { signal: controller.signal }).catch(() => ({ data: [] })),
          api.get(`/media?childId=${selectedChildId}`, { signal: controller.signal }).catch(() => ({ data: [] })),
        ]);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const inWeek = (item) => new Date(item.date) >= weekAgo;
        setWeeklyStats({
          activities: (Array.isArray(activitiesRes.data) ? activitiesRes.data : []).filter(inWeek).length,
          meals: (Array.isArray(mealsRes.data) ? mealsRes.data : []).filter(inWeek).length,
          media: (Array.isArray(mediaRes.data) ? mediaRes.data : []).filter(inWeek).length,
        });
      } catch (error) {
        if (error.code === 'ERR_CANCELED') return;
      }
    };
    loadStats();
    return () => controller.abort();
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
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <h1 className="font-serif text-[24px] text-p-ink font-semibold">{t('child.title')}</h1>
          <p className="text-[14px] text-p-sepia-500 mt-0.5">{t('child.selectPrompt')}</p>
        </div>
        <div className="space-y-3">
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => selectChild(c.id)}
              className="page-card page-corner w-full rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow text-left"
            >
              <div className="w-12 h-12 rounded-full bg-p-brand-100 flex items-center justify-center text-p-brand-700 font-semibold text-[16px] shrink-0">
                {c.firstName?.charAt(0)}{c.lastName?.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-p-ink">{c.firstName} {c.lastName}</p>
                <p className="text-[13px] text-p-sepia-500">{c.childSchool?.name || ''}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (error || !child) {
    return (
      <div className="py-20">
        <div className="page-card rounded-xl p-10 text-center">
          <div className="w-16 h-16 bg-p-brand-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <User className="w-8 h-8 text-p-brand-600" />
          </div>
          <h2 className="font-serif text-[20px] font-semibold text-p-ink mb-2">{t('child.notFoundTitle')}</h2>
          <p className="text-[14px] text-p-sepia-500">{error || t('child.notFoundDesc')}</p>
          <p className="text-[13px] text-p-sepia-400 mt-2">{t('child.notFoundHelp')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">

      {/* Multi-child switcher (inline) */}
      {Array.isArray(children) && children.length > 1 && (
        <div className="page-card rounded-lg px-4 py-3 flex items-center gap-3">
          <Users className="w-4 h-4 text-p-sepia-400 shrink-0" />
          <label className="text-[13px] font-medium text-p-sepia-600 shrink-0">
            {t('child.selectLabel')}
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
            className="flex-1 px-3 py-1.5 bg-p-surface border border-p-sepia-200 rounded-md text-[13px] text-p-ink focus:outline-none focus:border-p-brand-400"
          >
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}{c.childSchool?.name ? ` — ${c.childSchool.name}` : ''}
              </option>
            ))}
          </select>
        </div>
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

      {/* Basic info */}
      <section className="page-card page-corner rounded-xl p-5">
        <h3 className="font-serif text-[16px] font-semibold text-p-ink mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-p-brand-500" /> {t('child.basicInfo')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoItem label={t('child.fullName')} value={`${child.firstName} ${child.lastName}`} icon={User} />
          <InfoItem label={t('child.birthDate')} value={formatDateMedium(child.dateOfBirth, i18n.language)} icon={Calendar} />
          <InfoItem label={t('child.diagnosis')} value={child.disabilityType} icon={ShieldAlert} color="text-error-500" />
          <InfoItem label={t('child.teacher')} value={teacherName || child.teacher || '—'} icon={Award} color="text-p-brand-500" />
        </div>
      </section>

      {/* Special needs */}
      <section className="page-card rounded-xl p-5 border-l-2 border-l-p-sepia-300">
        <h3 className="text-[15px] font-semibold text-p-ink mb-3 flex items-center gap-2">
          <Heart className="w-4 h-4 text-error-500" /> {t('child.specialNeeds')}
        </h3>
        <p className="text-[14px] text-p-sepia-700 leading-relaxed">{child.specialNeeds}</p>
      </section>

      <EmotionalMonitoringSection records={monitoringRecords} />

      {/* Weekly stats */}
      <section className="bg-p-sepia-800 rounded-xl p-5 text-white">
        <h3 className="font-serif text-[16px] font-semibold mb-4 text-white">{t('child.weeklyResults')}</h3>
        <div className="space-y-4">
          <StatRow label={t('child.activities')} value={weeklyStats.activities} color="bg-p-brand-400" />
          <StatRow label={t('child.meals')} value={weeklyStats.meals} color="bg-p-brand-400" />
          <StatRow label={t('child.media')} value={weeklyStats.media} color="bg-p-brand-400" />
        </div>
      </section>

      {/* Account section */}
      <section className="page-card rounded-xl p-5">
        <h3 className="text-[15px] font-semibold text-p-ink mb-4">
          {t('profile.account')}
        </h3>
        <div className="stitch mb-3" />
        <div className="space-y-2">
          <Link
            to="/irr"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-p-brand-50 text-p-brand-700 border border-p-brand-200 hover:bg-p-brand-100 transition-colors text-[13px] font-medium"
          >
            <TrendingUp className="w-4 h-4" />
            {t('irr.title')}
          </Link>
          <Link
            to="/settings"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-p-sepia-50 text-p-sepia-700 border border-p-sepia-200 hover:bg-p-sepia-100 transition-colors text-[13px] font-medium"
          >
            <Settings className="w-4 h-4" />
            {t('settings.title')}
          </Link>
          <button
            onClick={() => setShowMessageModal(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-p-brand-50 text-p-brand-700 border border-p-brand-200 hover:bg-p-brand-100 transition-colors text-[13px] font-medium"
          >
            <MessageSquare className="w-4 h-4" />
            {t('profile.contactGovernment')}
          </button>
          <button
            onClick={() => myMessages.length > 0 && setShowMessagesModal(true)}
            disabled={myMessages.length === 0}
            title={myMessages.length === 0 ? t('profile.noMessagesSent') : undefined}
            className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-colors text-[13px] font-medium relative ${
              myMessages.length > 0
                ? 'bg-p-sepia-50 text-p-sepia-700 border-p-sepia-200 hover:bg-p-sepia-100 cursor-pointer'
                : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            {t('profile.myMessages')}
            {myMessages.some((m) => m.reply) && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-p-brand-600 text-white text-[10px] rounded-full flex items-center justify-center">
                {myMessages.filter((m) => m.reply).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-error-50 text-error-600 border border-error-200 hover:bg-error-100 transition-colors text-[13px] font-medium"
          >
            <LogOut className="w-4 h-4" />
            {t('nav.exit')}
          </button>
        </div>
      </section>

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
        onClose={() => { setShowMessageModal(false); setEscalationTarget(null); }}
        onSent={(messages) => setMyMessages(messages)}
        escalatedFromId={escalationTarget?.messageId ?? null}
        escalatedFromSubject={escalationTarget?.subject ?? null}
        escalatedFromLevel={escalationTarget?.currentLevel ?? null}
      />
      <MessagesModal
        show={showMessagesModal}
        onClose={() => setShowMessagesModal(false)}
        messages={myMessages}
        loadingMessages={loadingMessages}
        messagesError={messagesError}
        onEscalate={(target) => {
          setEscalationTarget(target);
          setShowMessagesModal(false);
          setShowMessageModal(true);
        }}
      />
    </div>
  );
};

export default ChildProfile;
