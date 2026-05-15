import { useEffect, useState } from 'react';
import api from '../services/api';
import Card from '../components/Card';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { MessageSquare, Globe, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProfileForm from './settings/ProfileForm';
import NotificationPreferences from './settings/NotificationPreferences';
import PasswordForm from './settings/PasswordForm';
import MessageModal from './settings/MessageModal';
import MessagesModal from './settings/MessagesModal';

const Settings = () => {
  const { user, setUser, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
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
    loadMessages();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMessages = async () => {
    try {
      setLoadingMessages(true);
      const response = await api.get('/admin/messages');
      setMyMessages(response.data.data || []);
    } catch (error) {
      setMyMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageSubject.trim() || !messageText.trim()) {
      showError(t('settings.messageRequired', { defaultValue: 'Mavzu va xabar to\'ldirilishi kerak' }));
      return;
    }

    setSendingMessage(true);
    try {
      await api.post('/admin/message-to-government', {
        subject: messageSubject.trim(),
        message: messageText.trim(),
      });
      success(t('settings.messageSent', { defaultValue: 'Xabar muvaffaqiyatli yuborildi' }));
      setMessageSubject('');
      setMessageText('');
      setShowMessageModal(false);
      await loadMessages();
    } catch (error) {
      showError(error.response?.data?.error || t('settings.messageError', { defaultValue: 'Xabar yuborishda xatolik' }));
    } finally {
      setSendingMessage(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await api.put('/user/profile', {
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        phone: profileForm.phone,
        notificationPreferences: profileForm.notificationPreferences,
      });
      success(t('settings.profileUpdated', { defaultValue: 'Profil muvaffaqiyatli yangilandi' }));
      if (setUser) {
        setUser(response.data.data ?? response.data);
      }
    } catch (error) {
      showError(error.response?.data?.error || t('settings.profileError', { defaultValue: 'Profilni yangilashda xatolik' }));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showError(t('settings.passwordMismatch', { defaultValue: 'Yangi parollar mos kelmadi' }));
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      showError(t('settings.passwordTooShort', { defaultValue: 'Parol kamida 8 ta belgidan iborat bo\'lishi kerak' }));
      return;
    }

    setSavingPassword(true);
    try {
      await api.put('/user/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      success(t('settings.passwordChanged', { defaultValue: 'Parol muvaffaqiyatli o\'zgartirildi' }));
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      showError(error.response?.data?.error || t('settings.passwordError', { defaultValue: 'Parolni o\'zgartirishda xatolik' }));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">{t('settings.title', { defaultValue: 'Sozlamalar' })}</h1>
        <p className="text-gray-500 font-medium mt-1">{t('settings.subtitle', { defaultValue: 'Profil va hisob sozlamalarini boshqarish' })}</p>
      </div>

      {/* Profile Settings */}
      <ProfileForm
        profileForm={profileForm}
        setProfileForm={setProfileForm}
        saving={saving}
        onSubmit={handleProfileSubmit}
      />

      {/* Notification Preferences */}
      <NotificationPreferences
        profileForm={profileForm}
        setProfileForm={setProfileForm}
        saving={saving}
        onSubmit={handleProfileSubmit}
      />

      {/* Language Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Globe className="w-6 h-6 text-primary-600" />
          <h2 className="text-xl font-bold text-gray-900">{t('settings.language', { defaultValue: 'Til' })}</h2>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">{t('settings.selectLanguage', { defaultValue: 'Interfeys tilini tanlang' })}</p>
          <LanguageSwitcher />
        </div>
      </Card>

      {/* Password Change */}
      <PasswordForm
        passwordForm={passwordForm}
        setPasswordForm={setPasswordForm}
        showPasswords={showPasswords}
        setShowPasswords={setShowPasswords}
        savingPassword={savingPassword}
        onSubmit={handlePasswordSubmit}
      />

      {/* Contact Government */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <MessageSquare className="w-6 h-6 text-primary-600" />
          <h2 className="text-xl font-bold text-gray-900">{t('settings.contactGovernment', { defaultValue: 'Davlat bilan bog\'lanish' })}</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          {t('settings.contactDescription', { defaultValue: 'Davlatga xabar yuborish uchun quyidagi tugmani bosing' })}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowMessageModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <MessageSquare className="w-5 h-5" />
            {t('settings.sendMessage', { defaultValue: 'Xabar yuborish' })}
          </button>
          {myMessages.length > 0 && (
            <button
              onClick={() => setShowMessagesModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-sm relative"
            >
              <MessageSquare className="w-5 h-5" />
              {t('settings.myMessages', { defaultValue: 'Mening xabarlarim' })}
              {myMessages.some(m => m.reply) && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {myMessages.filter(m => m.reply).length}
                </span>
              )}
            </button>
          )}
        </div>
      </Card>

      {/* Logout */}
      <Card className="p-6">
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-sm w-full"
        >
          <LogOut className="w-5 h-5" />
          {t('logout', { defaultValue: 'Chiqish' })}
        </button>
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
