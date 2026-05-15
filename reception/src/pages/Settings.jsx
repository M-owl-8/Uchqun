import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import Card from '../components/Card';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { MessageSquare } from 'lucide-react';
import ProfileForm from './settings/ProfileForm';
import NotificationPreferences from './settings/NotificationPreferences';
import PasswordForm from './settings/PasswordForm';
import MessageModal from './settings/MessageModal';
import MessagesModal from './settings/MessagesModal';

const Settings = () => {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
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
    if (user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        notificationPreferences: user.notificationPreferences || { email: true, push: true },
      });
    }
  }, [user]);

  const loadMessages = useCallback(async () => {
    try {
      setLoadingMessages(true);
      const response = await api.get('/reception/messages');
      setMyMessages(response.data.data || []);
    } catch (error) {
      setMyMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

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
      await loadMessages();
    } catch (error) {
      showError(error.response?.data?.error || t('profile.messageError'));
    } finally {
      setSendingMessage(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await api.put('/user/profile', profileForm);
      success(t('settings.profileUpdateSuccess'));
      if (setUser) {
        setUser(response.data.data ?? response.data);
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

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">{t('settings.title')}</h1>
        <p className="text-gray-500 font-medium mt-1">{t('settings.subtitle')}</p>
      </div>

      {/* Profile Settings */}
      <ProfileForm
        profileForm={profileForm}
        setProfileForm={setProfileForm}
        onSubmit={handleProfileSubmit}
      />

      {/* Notification Preferences */}
      <NotificationPreferences
        profileForm={profileForm}
        setProfileForm={setProfileForm}
        onSubmit={handleProfileSubmit}
      />

      {/* Password Change */}
      <PasswordForm
        passwordForm={passwordForm}
        setPasswordForm={setPasswordForm}
        showPasswords={showPasswords}
        setShowPasswords={setShowPasswords}
        onSubmit={handlePasswordSubmit}
      />

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
        <MessageModal
          messageSubject={messageSubject}
          setMessageSubject={setMessageSubject}
          messageText={messageText}
          setMessageText={setMessageText}
          sendingMessage={sendingMessage}
          onSend={handleSendMessage}
          onClose={() => setShowMessageModal(false)}
        />
      )}

      {/* My Messages Modal */}
      {showMessagesModal && (
        <MessagesModal
          myMessages={myMessages}
          loadingMessages={loadingMessages}
          onClose={() => setShowMessagesModal(false)}
        />
      )}
    </div>
  );
};

export default Settings;
