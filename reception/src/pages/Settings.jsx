import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { 
  User,
  Lock,
  Bell,
  Save,
  Mail,
  Phone,
  MessageSquare,
  Send,
  X,
  Eye,
  EyeOff
} from 'lucide-react';

const Settings = () => {
  const { t, i18n } = useTranslation();
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notificationPreferences: {
      email: true,
      push: true,
    },
  });
  const { success, error: showError } = useToast();
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageSubject, setMessageSubject] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [myMessages, setMyMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);

  useEffect(() => {
    loadUserProfile();
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      setLoadingMessages(true);
      const response = await api.get('/reception/messages');
      setMyMessages(response.data.data || []);
    } catch (error) {
      setMyMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageSubject.trim() || !messageText.trim()) {
      showError(t('profile.messageRequired'));
      return;
    }

    setSendingMessage(true);
    try {
      await api.post('/reception/message-to-government', {
        subject: messageSubject.trim(),
        message: messageText.trim(),
      });
      success(t('profile.messageSent'));
      setMessageSubject('');
      setMessageText('');
      setShowMessageModal(false);
      // Reload messages
      await loadMessages();
    } catch (error) {
      showError(error.response?.data?.error || t('profile.messageError'));
    } finally {
      setSendingMessage(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/auth/me');
      const userData = response.data;
      setProfileForm({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        phone: userData.phone || '',
        notificationPreferences: userData.notificationPreferences || {
          email: true,
          push: true,
        },
      });
      if (setUser) {
        setUser(userData);
      }
    } catch (error) {
      showError(error.response?.data?.error || t('settings.loadProfileError'));
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await api.put('/user/profile', profileForm);
      success(t('settings.profileUpdateSuccess'));
      if (setUser) {
        setUser(response.data);
      }
    } catch (error) {
      showError(error.response?.data?.error || t('settings.profileUpdateError'));
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showError(t('settings.passwordsDoNotMatch'));
      return;
    }

    try {
      await api.put('/user/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      success(t('settings.passwordChangeSuccess'));
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      showError(error.response?.data?.error || t('settings.passwordChangeError'));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">{t('settings.title')}</h1>
        <p className="text-gray-500 font-medium mt-1">{t('settings.subtitle')}</p>
      </div>

      {/* Profile Settings */}
      <form onSubmit={handleProfileSubmit} className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-6 h-6 text-primary-600" />
            <h2 className="text-xl font-bold text-gray-900">{t('settings.profileInfo')}</h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.firstName')}</label>
                <input
                  type="text"
                  value={profileForm.firstName}
                  onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.lastName')}</label>
                <input
                  type="text"
                  value={profileForm.lastName}
                  onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email
              </label>
              <input
                type="email"
                value={profileForm.email}
                disabled
                className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">{t('settings.emailCannotChange')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="w-4 h-4 inline mr-2" />
                {t('profile.phone')}
              </label>
              <input
                type="tel"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder={t('settings.phonePlaceholder', { defaultValue: '+998 90 123 45 67' })}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-sm"
            >
              <Save className="w-5 h-5" />
              {t('settings.saveProfile')}
            </button>
          </div>
        </Card>
      </form>

      {/* Notification Preferences */}
      <form onSubmit={handleProfileSubmit} className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-6 h-6 text-primary-600" />
            <h2 className="text-xl font-bold text-gray-900">{t('settings.notificationPreferences')}</h2>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={profileForm.notificationPreferences.email}
                onChange={(e) => setProfileForm({
                  ...profileForm,
                  notificationPreferences: {
                    ...profileForm.notificationPreferences,
                    email: e.target.checked,
                  },
                })}
                className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">{t('settings.emailNotifications')}</span>
                <p className="text-xs text-gray-500">{t('settings.emailNotificationsDesc')}</p>
              </div>
            </label>

          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-sm"
            >
              <Save className="w-5 h-5" />
              {t('settings.savePreferences')}
            </button>
          </div>
        </Card>
      </form>

      {/* Password Change */}
      <form onSubmit={handlePasswordSubmit} className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-6 h-6 text-primary-600" />
            <h2 className="text-xl font-bold text-gray-900">{t('settings.changePassword')}</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.currentPassword')}</label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                >
                  {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.newPassword')}</label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                >
                  {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">{t('settings.passwordMinLength')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.confirmNewPassword')}</label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                >
                  {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-sm"
            >
              <Save className="w-5 h-5" />
              {t('settings.changePasswordButton')}
            </button>
          </div>
        </Card>
      </form>

      {/* Contact Government */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <MessageSquare className="w-6 h-6 text-primary-600" />
          <h2 className="text-xl font-bold text-gray-900">{t('profile.contactGovernment')}</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          {t('profile.contactDescription')}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowMessageModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <MessageSquare className="w-5 h-5" />
            {t('profile.sendMessage')}
          </button>
          {myMessages.length > 0 && (
            <button
              onClick={() => setShowMessagesModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-sm relative"
            >
              <MessageSquare className="w-5 h-5" />
              {t('profile.myMessages')}
              {myMessages.some(m => m.reply) && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
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
          <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-full">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{t('settings.sendMessageToGovt', { defaultValue: 'Davlatga xabar yuborish' })}</h2>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('profile.subject')}</label>
                <input
                  type="text"
                  value={messageSubject}
                  onChange={(e) => setMessageSubject(e.target.value)}
                  placeholder={t('profile.subjectPlaceholder')}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('profile.message')}</label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={6}
                  placeholder={t('profile.messagePlaceholder')}
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
                {t('profile.cancel')}
              </button>
              <button
                onClick={handleSendMessage}
                disabled={sendingMessage || !messageSubject.trim() || !messageText.trim()}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sendingMessage ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t('profile.sending')}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{t('profile.send')}</span>
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
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-full">
                  <MessageSquare className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{t('profile.myMessages')}</h2>
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
                <p className="text-gray-500">{t('profile.noMessages')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myMessages.map((msg) => (
                  <div key={msg.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{msg.subject}</h3>
                        <p className="text-sm text-gray-500 mt-1">
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
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                          {t('settings.replied', { defaultValue: 'Javob berildi' })}
                        </span>
                      )}
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">{t('profile.yourMessage')}:</p>
                      <p className="text-gray-800 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap">{msg.message}</p>
                    </div>

                    {msg.reply && (
                      <div className="border-t border-gray-200 pt-4 mt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-2 bg-blue-100 rounded-full">
                            <MessageSquare className="w-4 h-4 text-blue-600" />
                          </div>
                          <p className="text-sm font-medium text-blue-700">{t('settings.govtReply', { defaultValue: 'Davlat javobi' })}</p>
                          <span className="text-xs text-gray-500 ml-auto">
                            {new Date(msg.repliedAt).toLocaleDateString(i18n.language, { 
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

export default Settings;
