import { LogOut, MessageSquare, Send, X, Camera } from 'lucide-react';
import { useAuth } from '../shared/context/AuthContext';
import Card from '../shared/components/Card';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import LanguageSwitcher from '../components/LanguageSwitcher';
import api from '../shared/services/api';
import { useToast } from '../shared/context/ToastContext';
import { useState, useEffect, useRef } from 'react';
import LoadingSpinner from '../shared/components/LoadingSpinner';

const Profile = () => {
  const { user, logout, setUser } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageSubject, setMessageSubject] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [myMessages, setMyMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    const controller = new AbortController();
    loadMessages(controller.signal);
    return () => controller.abort();
  }, []);

  const loadMessages = async (signal) => {
    try {
      setLoadingMessages(true);
      const response = await api.get('/teacher/messages', { signal });
      setMyMessages(response.data.data || []);
    } catch (error) {
      if (error.code === 'ERR_CANCELED') return;
      setMyMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError(t('profile.invalidImage', { defaultValue: 'Faqat rasm fayllari qabul qilinadi' }));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError(t('profile.imageTooLarge', { defaultValue: 'Rasm hajmi 5MB dan katta bo\'lmasligi kerak' }));
      return;
    }

    try {
      setUploadingAvatar(true);
      
      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append('avatar', file);

      // Upload to backend
      const response = await api.put('/user/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update user in context
      if (setUser) {
        setUser(response.data);
      }
      
      success(t('profile.avatarUpdated', { defaultValue: 'Rasm muvaffaqiyatli yuklandi' }));
    } catch (err) {
      showError(err.response?.data?.error || t('profile.uploadError', { defaultValue: 'Rasm yuklashda xatolik yuz berdi' }));
    } finally {
      setUploadingAvatar(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleSendMessage = async () => {
    if (!messageSubject.trim() || !messageText.trim()) {
      showError(t('profile.messageRequired', { defaultValue: 'Subject va xabar to\'ldirilishi kerak' }));
      return;
    }

    setSendingMessage(true);
    try {
      await api.post('/teacher/message-to-government', {
        subject: messageSubject.trim(),
        message: messageText.trim(),
      });
      success(t('profile.messageSent', { defaultValue: 'Xabar muvaffaqiyatli yuborildi' }));
      setMessageSubject('');
      setMessageText('');
      setShowMessageModal(false);
      // Reload messages
      await loadMessages();
    } catch (error) {
      showError(error.response?.data?.error || t('profile.messageError', { defaultValue: 'Xabar yuborishda xatolik' }));
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white drop-shadow-sm">{t('profile.title', { defaultValue: 'Profile' })}</h1>
          <p className="text-white/90 font-medium mt-1 drop-shadow-sm">{t('profile.subtitle', { defaultValue: 'Manage your account' })}</p>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-error-50 text-error-600 border border-error-100 hover:bg-error-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {t('nav.logout')}
          </button>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xl font-bold overflow-hidden shrink-0 cursor-pointer hover:opacity-80 transition-opacity" onClick={handleAvatarClick}>
              {user?.avatar ? (
                <img src={user.avatar.startsWith('http') ? user.avatar : `${API_BASE.replace(/\/api\/?$/, '')}${user.avatar.startsWith('/') ? '' : '/'}${user.avatar}`} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
              )}
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <button
              onClick={handleAvatarClick}
              className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center hover:bg-brand-700 transition-colors shadow-md"
              title={t('profile.changeAvatar', { defaultValue: 'Rasmni o\'zgartirish' })}
            >
              <Camera className="w-3 h-3" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="text-sm text-slate-500">{user?.email}</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-xs uppercase text-slate-400 font-bold">Role</div>
            <div className="text-slate-900 font-semibold mt-1">{user?.role}</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-xs uppercase text-slate-400 font-bold">ID</div>
            <div className="text-slate-900 font-semibold mt-1">{user?.id}</div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <MessageSquare className="w-6 h-6 text-brand-600" />
          <h2 className="text-xl font-bold text-slate-900">{t('profile.contactGovernment', { defaultValue: 'Contact Government' })}</h2>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          {t('profile.contactDescription', { defaultValue: 'Davlatga xabar yuborish uchun quyidagi tugmani bosing' })}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowMessageModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors shadow-sm"
          >
            <MessageSquare className="w-5 h-5" />
            {t('profile.sendMessage', { defaultValue: 'Davlatga xabar yuborish' })}
          </button>
          {myMessages.length > 0 && (
            <button
              onClick={() => setShowMessagesModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-success-600 text-white rounded-xl font-bold hover:bg-success-700 transition-colors shadow-sm relative"
            >
              <MessageSquare className="w-5 h-5" />
              {t('profile.myMessages', { defaultValue: 'Mening xabarlarim' })}
              {myMessages.some(m => m.reply) && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-error-500 text-white text-xs rounded-full flex items-center justify-center">
                  {myMessages.filter(m => m.reply).length}
                </span>
              )}
            </button>
          )}
        </div>
      </Card>

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowMessageModal(false)}>
          <div className="bg-surface rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-brand-100 rounded-full">
                  <MessageSquare className="w-6 h-6 text-brand-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">{t('profile.sendMessage', { defaultValue: 'Davlatga xabar yuborish' })}</h2>
              </div>
              <button
                onClick={() => setShowMessageModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{t('profile.subject', { defaultValue: 'Mavzu' })}</label>
                <input
                  type="text"
                  value={messageSubject}
                  onChange={(e) => setMessageSubject(e.target.value)}
                  placeholder={t('profile.subjectPlaceholder', { defaultValue: 'Xabar mavzusi...' })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{t('profile.message', { defaultValue: 'Xabar' })}</label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={6}
                  placeholder={t('profile.messagePlaceholder', { defaultValue: 'Xabaringizni yozing...' })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowMessageModal(false)}
                className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
                disabled={sendingMessage}
              >
                {t('profile.cancel', { defaultValue: 'Bekor qilish' })}
              </button>
              <button
                onClick={handleSendMessage}
                disabled={sendingMessage || !messageSubject.trim() || !messageText.trim()}
                className="flex-1 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowMessagesModal(false)}>
          <div className="bg-surface rounded-3xl p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-success-100 rounded-full">
                  <MessageSquare className="w-6 h-6 text-success-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">{t('profile.myMessages', { defaultValue: 'Mening xabarlarim' })}</h2>
              </div>
              <button
                onClick={() => setShowMessagesModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            {loadingMessages ? (
              <div className="flex justify-center items-center py-12">
                <LoadingSpinner size="md" />
              </div>
            ) : myMessages.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">{t('profile.noMessages', { defaultValue: 'Hozircha xabarlar yo\'q' })}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myMessages.map((msg) => (
                  <div key={msg.id} className="border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg">{msg.subject}</h3>
                        <p className="text-sm text-slate-500 mt-1">
                          {new Date(msg.createdAt).toLocaleDateString(i18n.language, { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      {msg.reply && (
                        <span className="px-3 py-1 bg-success-100 text-success-700 rounded-full text-xs font-semibold">
                          {t('profile.replied', { defaultValue: 'Javob berildi' })}
                        </span>
                      )}
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-sm font-medium text-slate-700 mb-2">{t('profile.yourMessage', { defaultValue: 'Sizning xabaringiz' })}:</p>
                      <p className="text-slate-800 bg-slate-50 rounded-lg p-4 whitespace-pre-wrap">{msg.message}</p>
                    </div>

                    {msg.reply && (
                      <div className="border-t border-slate-200 pt-4 mt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-2 bg-brand-100 rounded-full">
                            <MessageSquare className="w-4 h-4 text-brand-600" />
                          </div>
                          <p className="text-sm font-medium text-brand-700">{t('profile.governmentReply', { defaultValue: 'Davlat javobi' })}</p>
                          <span className="text-xs text-slate-500 ml-auto">
                            {new Date(msg.repliedAt).toLocaleDateString(i18n.language, { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-slate-800 bg-brand-50 rounded-lg p-4 whitespace-pre-wrap">{msg.reply}</p>
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

export default Profile;

