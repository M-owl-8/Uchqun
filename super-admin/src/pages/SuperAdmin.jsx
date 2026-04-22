import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  Crown,
  Mail,
  Lock,
  Plus,
  User,
  LogOut,
  Building2,
  Star,
  MessageSquare,
  Send,
  Check,
  X,
  Phone,
  FileText,
  Eye,
  EyeOff,
  Calendar
} from 'lucide-react';
import Card from '../components/Card';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import SuperAdminBackground from '../components/SuperAdminBackground';

const SuperAdmin = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    create: false,
    edit: false,
  });
  const [schools, setSchools] = useState([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [activeTab, setActiveTab] = useState('admins'); // 'admins', 'schools', 'messages', 'registrations', 'government', 'payments'
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [govFirstName, setGovFirstName] = useState('');
  const [govLastName, setGovLastName] = useState('');
  const [govEmail, setGovEmail] = useState('');
  const [govPassword, setGovPassword] = useState('');
  const [govLoading, setGovLoading] = useState(false);
  const [governments, setGovernments] = useState([]);
  const [loadingGovernments, setLoadingGovernments] = useState(true);
  const [editingGovernment, setEditingGovernment] = useState(null);
  const [editGovFirstName, setEditGovFirstName] = useState('');
  const [editGovLastName, setEditGovLastName] = useState('');
  const [editGovEmail, setEditGovEmail] = useState('');
  const [editGovPassword, setEditGovPassword] = useState('');
  const [editGovSaving, setEditGovSaving] = useState(false);
  const [registrationRequests, setRegistrationRequests] = useState([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvingRequest, setApprovingRequest] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvedCredentials, setApprovedCredentials] = useState(null);
  const { success, error: showError } = useToast();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Load existing admins
  useEffect(() => {
    const loadAdmins = async () => {
      try {
        setLoadingAdmins(true);
        const res = await api.get('/super-admin/admins');
        setAdmins(res.data?.data || []);
      } catch (error) {
        console.error('Failed to load admins', error);
        showError(t('superAdmin.toastLoadError'));
        setAdmins([]);
      } finally {
        setLoadingAdmins(false);
      }
    };

    loadAdmins();
  }, [showError, t]);

  // Load existing governments
  useEffect(() => {
    const loadGovernments = async () => {
      try {
        setLoadingGovernments(true);
        const res = await api.get('/super-admin/government');
        setGovernments(res.data?.data || []);
      } catch (error) {
        console.error('Failed to load governments', error);
        showError(t('superAdmin.governmentLoadError', { defaultValue: 'Government foydalanuvchilarini yuklashda xatolik' }));
        setGovernments([]);
      } finally {
        setLoadingGovernments(false);
      }
    };

    loadGovernments();
  }, [showError, t]);

  // Load schools
  useEffect(() => {
    const loadSchools = async () => {
      try {
        setLoadingSchools(true);
        const res = await api.get('/super-admin/schools');
        setSchools(res.data?.data || []);
      } catch (error) {
        console.error('Failed to load schools', error);
        setSchools([]);
      } finally {
        setLoadingSchools(false);
      }
    };

    loadSchools();
  }, []);

  // Load messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setLoadingMessages(true);
        const res = await api.get('/super-admin/messages');
        setMessages(res.data?.data || []);
      } catch (error) {
        console.error('Failed to load messages', error);
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
  }, []);

  // Load admin registration requests
  useEffect(() => {
    const loadRegistrationRequests = async () => {
      try {
        setLoadingRegistrations(true);
        const res = await api.get('/super-admin/admin-registrations?status=pending');
        setRegistrationRequests(res.data?.data || []);
      } catch (error) {
        console.error('Failed to load registration requests', error);
        setRegistrationRequests([]);
      } finally {
        setLoadingRegistrations(false);
      }
    };

    if (activeTab === 'registrations') {
      loadRegistrationRequests();
    }
  }, [activeTab]);

  // Load payments
  useEffect(() => {
    const loadPayments = async () => {
      try {
        setLoadingPayments(true);
        const res = await api.get('/super-admin/payments?limit=50');
        setPayments(res.data?.data?.payments || []);
      } catch (error) {
        console.error('Failed to load payments', error);
        setPayments([]);
      } finally {
        setLoadingPayments(false);
      }
    };

    if (activeTab === 'payments') {
      loadPayments();
    }
  }, [activeTab]);


  const handleReply = async (messageId) => {
    if (!replyText.trim()) return;

    setReplying(true);
    try {
      await api.post(`/super-admin/messages/${messageId}/reply`, { reply: replyText.trim() });
      success(t('superAdmin.replySent', { defaultValue: 'Javob yuborildi' }));
      setReplyText('');
      setSelectedMessage(null);
      // Reload messages
      const res = await api.get('/super-admin/messages');
      setMessages(res.data?.data || []);
    } catch (error) {
      showError(error.response?.data?.error || t('superAdmin.replyError', { defaultValue: 'Javob yuborishda xatolik' }));
    } finally {
      setReplying(false);
    }
  };

  const handleMarkRead = async (messageId, isRead) => {
    try {
      await api.put(`/super-admin/messages/${messageId}/read`, { isRead });
      // Reload messages
      const res = await api.get('/super-admin/messages');
      setMessages(res.data?.data || []);
    } catch (error) {
      console.error('Failed to mark message as read', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!firstName || !lastName || !email || !password) {
      showError(t('superAdmin.validation.required'));
      return;
    }

    try {
      setLoading(true);
      await api.post('/super-admin/admins', {
        firstName,
        lastName,
        email,
        password,
      });
      
      success(t('superAdmin.toastCreate'));
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');

      // Reload or append new admin
      try {
        const res = await api.get('/super-admin/admins');
        setAdmins(res.data?.data || []);
      } catch (err) {
        // fallback: do nothing if reload fails
      }
    } catch (error) {
      showError(error.response?.data?.error || t('superAdmin.toastSaveError'));
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (adm) => {
    setEditingAdmin(adm);
    setEditFirstName(adm.firstName || '');
    setEditLastName(adm.lastName || '');
    setEditEmail(adm.email || '');
    setEditPhone(adm.phone || '');
    setEditPassword('');
  };

  const handleUpdateAdmin = async (e) => {
    e.preventDefault();
    if (!editingAdmin) return;
    try {
      setEditSaving(true);
      await api.put(`/super-admin/admins/${editingAdmin.id}`, {
        firstName: editFirstName,
        lastName: editLastName,
        email: editEmail,
        phone: editPhone,
        password: editPassword || undefined,
      });
      success(t('superAdmin.toastUpdate'));
      const res = await api.get('/super-admin/admins');
      setAdmins(res.data?.data || []);
      setEditingAdmin(null);
      setEditPassword('');
    } catch (error) {
      showError(error.response?.data?.error || t('superAdmin.toastSaveError'));
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteAdmin = async (id) => {
    if (!confirm(t('superAdmin.confirmDelete'))) return;
    try {
      await api.delete(`/super-admin/admins/${id}`);
      success(t('superAdmin.toastDelete'));
      setAdmins((prev) => prev.filter((a) => a.id !== id));
    } catch (error) {
      showError(error.response?.data?.error || t('superAdmin.toastDeleteError'));
    }
  };

  const handleCreateGovernment = async (e) => {
    e.preventDefault();
    
    // Trim all inputs
    const trimmedFirstName = govFirstName.trim();
    const trimmedLastName = govLastName.trim();
    const trimmedEmail = govEmail.trim();
    const trimmedPassword = govPassword.trim();
    
    if (!trimmedFirstName || !trimmedLastName || !trimmedEmail || !trimmedPassword) {
        showError(t('superAdmin.validation.allFieldsRequired', { defaultValue: 'Barcha maydonlar to\'ldirilishi kerak' }));
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      showError(t('superAdmin.validation.invalidEmail', { defaultValue: 'Email formati noto\'g\'ri' }));
      return;
    }

    // Validate password length
    if (trimmedPassword.length < 6) {
      showError(t('superAdmin.validation.passwordMinLength', { defaultValue: 'Parol kamida 6 belgidan iborat bo\'lishi kerak' }));
      return;
    }

    try {
      setGovLoading(true);
      const response = await api.post('/super-admin/government', {
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        email: trimmedEmail,
        password: trimmedPassword,
      });
      
      if (response.data?.success) {
      success(t('superAdmin.governmentCreated', { defaultValue: 'Government foydalanuvchisi muvaffaqiyatli yaratildi' }));
      setGovFirstName('');
      setGovLastName('');
      setGovEmail('');
      setGovPassword('');
      // Reload governments list
      const res = await api.get('/super-admin/government');
      setGovernments(res.data?.data || []);
      } else {
        showError(response.data?.error || t('superAdmin.governmentCreateError', { defaultValue: 'Government foydalanuvchisini yaratishda xatolik' }));
      }
    } catch (error) {
      console.error('Create government error:', error);
      let errorMessage = t('superAdmin.governmentCreateError', { defaultValue: 'Government foydalanuvchisini yaratishda xatolik' });
      
      if (error.response?.status === 403) {
        const errorData = error.response?.data;
        if (errorData?.message) {
          errorMessage = errorData.message;
        } else if (errorData?.error) {
          errorMessage = errorData.error;
        } else {
          errorMessage = t('superAdmin.noPermission', { defaultValue: 'Ruxsat yo\'q. Faqat Admin foydalanuvchilari government yaratishi mumkin.' });
        }
        
        // Log detailed error for debugging
        console.error('403 Forbidden details:', {
          error: errorData,
          requiredRoles: errorData?.requiredRoles,
          currentRole: errorData?.currentRole,
        });
      } else if (error.response?.status === 401) {
        errorMessage = t('superAdmin.loginRequired', { defaultValue: 'Kirish talab qilinadi. Iltimos, qayta kiring.' });
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.details) {
        errorMessage = Array.isArray(error.response.data.details) 
          ? error.response.data.details.join(', ')
          : error.response.data.details;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showError(errorMessage);
    } finally {
      setGovLoading(false);
    }
  };

  const startEditGovernment = (gov) => {
    setEditingGovernment(gov);
    setEditGovFirstName(gov.firstName || '');
    setEditGovLastName(gov.lastName || '');
    setEditGovEmail(gov.email || '');
    setEditGovPassword('');
  };

  const handleUpdateGovernment = async (e) => {
    e.preventDefault();
    if (!editingGovernment) return;
    try {
      setEditGovSaving(true);
      await api.put(`/super-admin/government/${editingGovernment.id}`, {
        firstName: editGovFirstName,
        lastName: editGovLastName,
        email: editGovEmail,
        password: editGovPassword || undefined,
      });
      success(t('superAdmin.governmentUpdated', { defaultValue: 'Government foydalanuvchi muvaffaqiyatli yangilandi' }));
      const res = await api.get('/super-admin/government');
      setGovernments(res.data?.data || []);
      setEditingGovernment(null);
      setEditGovPassword('');
    } catch (error) {
      showError(error.response?.data?.error || t('superAdmin.governmentUpdateError', { defaultValue: 'Government foydalanuvchi yangilashda xatolik' }));
    } finally {
      setEditGovSaving(false);
    }
  };

  const handleDeleteGovernment = async (id) => {
    if (!confirm(t('superAdmin.confirmDeleteGovernment', { defaultValue: 'Bu government foydalanuvchisini o\'chirishni xohlaysizmi?' }))) return;
    try {
      await api.delete(`/super-admin/government/${id}`);
      success(t('superAdmin.governmentDeleted', { defaultValue: 'Government foydalanuvchi muvaffaqiyatli o\'chirildi' }));
      setGovernments((prev) => prev.filter((g) => g.id !== id));
    } catch (error) {
      showError(error.response?.data?.error || t('superAdmin.governmentDeleteError', { defaultValue: 'Government foydalanuvchi o\'chirishda xatolik' }));
    }
  };

  const handleApproveRequest = async (id) => {
    if (!confirm(t('superAdmin.confirmApprove', { defaultValue: 'Bu so\'rovni tasdiqlaysizmi? Login ma\'lumotlari ko\'rsatiladi va siz ularni foydalanuvchiga yuborishingiz kerak.' }))) return;
    
    setApprovingRequest(true);
    try {
      const res = await api.post(`/super-admin/admin-registrations/${id}/approve`, {});
      
      // Show credentials to super admin for manual sending
      const credentials = res.data?.data?.credentials;
      setApprovedCredentials(credentials);
      
      success(t('superAdmin.requestApproved', { defaultValue: 'So\'rov tasdiqlandi. Login ma\'lumotlarini foydalanuvchiga yuboring.' }));
      
      // Reload requests
      const requestsRes = await api.get('/super-admin/admin-registrations?status=pending');
      setRegistrationRequests(requestsRes.data?.data || []);
      // Reload admins
      const adminsRes = await api.get('/super-admin/admins');
      setAdmins(adminsRes.data?.data || []);
    } catch (error) {
      showError(error.response?.data?.error || t('superAdmin.approveError', { defaultValue: 'So\'rovni tasdiqlashda xatolik' }));
    } finally {
      setApprovingRequest(false);
    }
  };

  const handleRejectRequest = async (id) => {
    setRejectingRequest(true);
    try {
      await api.post(`/super-admin/admin-registrations/${id}/reject`, {
        reason: rejectionReason.trim() || null,
      });
      success(t('superAdmin.requestRejected', { defaultValue: 'So\'rov rad etildi' }));
      setSelectedRequest(null);
      setRejectionReason('');
      // Reload requests
      const res = await api.get('/super-admin/admin-registrations?status=pending');
      setRegistrationRequests(res.data?.data || []);
    } catch (error) {
      showError(error.response?.data?.error || t('superAdmin.rejectError', { defaultValue: 'So\'rovni rad etishda xatolik' }));
    } finally {
      setRejectingRequest(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Super Admin Background - Premium executive theme */}
      <SuperAdminBackground />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <Crown className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{t('header.title')}</h1>
                <p className="text-sm text-gray-500">{t('header.subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                {t('header.logout')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 relative z-10">
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('admins')}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'admins'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('superAdmin.tabs.admins', { defaultValue: 'Adminlar' })}
          </button>
          <button
            onClick={() => setActiveTab('schools')}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'schools'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('superAdmin.tabs.schools', { defaultValue: 'Muassasalar' })}
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`px-6 py-3 font-medium transition-colors border-b-2 relative ${
              activeTab === 'messages'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('superAdmin.tabs.messages', { defaultValue: 'Xabarlar' })}
            {messages.filter(m => !m.isRead).length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {messages.filter(m => !m.isRead).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('government')}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'government'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('superAdmin.tabs.government', { defaultValue: 'Davlat' })}
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'payments'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('superAdmin.tabs.payments', { defaultValue: 'To\'lovlar' })}
          </button>
          <button
            onClick={() => setActiveTab('registrations')}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'registrations'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('superAdmin.tabs.registrations', { defaultValue: 'Ro\'yxatdan o\'tish' })}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center px-4 py-12 relative z-10">
        <div className={`${activeTab === 'messages' ? 'max-w-6xl' : 'max-w-2xl'} w-full space-y-8`}>
          {activeTab === 'admins' && (
            <>
              <div className="text-center">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                  {t('superAdmin.createTitle')}
                </h2>
                <p className="text-gray-600 font-medium">{t('superAdmin.createSubtitle')}</p>
              </div>

          <Card className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    {t('superAdmin.form.firstName')}
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder={t('superAdmin.form.firstName')}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    {t('superAdmin.form.lastName')}
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder={t('superAdmin.form.lastName')}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  {t('superAdmin.form.email')}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>

              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-gray-400" />
                  {t('superAdmin.form.password')}
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.create ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('superAdmin.form.password')}
                    className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, create: !showPasswords.create })}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                  >
                    {showPasswords.create ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t('superAdmin.status.loadingAdmins')}</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    <span>{t('superAdmin.form.create')}</span>
                  </>
                )}
              </button>
            </form>
          </Card>

          {/* Admin list */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">{t('superAdmin.listTitle')}</h3>
              {loadingAdmins && <div className="text-sm text-gray-500">{t('superAdmin.status.loadingAdmins')}</div>}
            </div>
            {loadingAdmins ? (
              <div className="flex items-center justify-center min-h-[120px]">
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : admins.length === 0 ? (
              <p className="text-sm text-gray-600">{t('superAdmin.noAdmins', { defaultValue: 'Adminlar topilmadi' })}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {admins.map((adm) => (
                  <div key={adm.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center">
                        {adm.firstName?.charAt(0)}
                        {adm.lastName?.charAt(0)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {adm.firstName} {adm.lastName}
                        </p>
                        <p className="text-sm text-gray-600">{adm.email}</p>
                        <p className="text-xs text-gray-500">
                          {adm.createdAt ? new Date(adm.createdAt).toLocaleDateString() : '—'}
                        </p>
                        {adm.phone && (
                          <p className="text-xs text-gray-500">{adm.phone}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => startEdit(adm)}
                        className="px-3 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                      >
                        {t('superAdmin.form.update')}
                      </button>
                      <button
                        onClick={() => handleDeleteAdmin(adm.id)}
                        className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        {t('superAdmin.delete', { defaultValue: 'O\'chirish' })}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

            </>
          )}

          {activeTab === 'schools' && (
            <>
              <div className="text-center">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                  {t('superAdmin.schoolsTitle')}
                </h2>
                <p className="text-gray-600 font-medium">{t('superAdmin.schoolsSubtitle', { defaultValue: 'Barcha muassasalar va ularning baholari' })}</p>
              </div>

              <Card className="p-6 space-y-4">
                {loadingSchools ? (
                  <div className="flex items-center justify-center min-h-[120px]">
                    <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : schools.length === 0 ? (
                  <p className="text-sm text-gray-600">{t('superAdmin.schoolsEmpty')}</p>
                ) : (
                  <>
                    {/* Statistics Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="bg-blue-50 rounded-xl p-4">
                        <p className="text-sm text-blue-600 font-medium mb-1">{t('superAdmin.totalSchools', { defaultValue: 'Jami Muassasalar' })}</p>
                        <p className="text-2xl font-bold text-blue-900">{schools.length}</p>
                      </div>
                      <div className="bg-purple-50 rounded-xl p-4">
                        <p className="text-sm text-purple-600 font-medium mb-1">{t('superAdmin.totalRatings', { defaultValue: 'Jami Baholar' })}</p>
                        <p className="text-2xl font-bold text-purple-900">
                          {schools.reduce((sum, s) => sum + (s.summary?.count || 0), 0)}
                        </p>
                      </div>
                    </div>

                    {/* Schools List */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {schools
                        .sort((a, b) => (b.summary?.average || 0) - (a.summary?.average || 0))
                        .map((school) => (
                        <div key={school.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-all bg-white">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-100 to-green-200 text-green-700 flex items-center justify-center shadow-sm">
                              <Building2 className="w-6 h-6" />
                            </div>
                            <div className="flex-1 space-y-2">
                              <p className="text-sm font-bold text-gray-900">{school.name}</p>
                              {school.address && (
                                <p className="text-xs text-gray-600 line-clamp-1">{school.address}</p>
                              )}
                              {school.type && (
                                <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                                  {school.type === 'school' ? t('superAdmin.schoolTypeSchool') :
                                   school.type === 'kindergarten' ? t('superAdmin.schoolTypeKindergarten') :
                                   t('superAdmin.schoolTypeBoth')}
                                </span>
                              )}
                              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`w-4 h-4 ${
                                        star <= Math.round(school.summary?.average || 0)
                                          ? 'fill-yellow-400 text-yellow-400'
                                          : 'fill-gray-200 text-gray-200'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <div className="flex-1">
                                  <span className="text-sm font-bold text-gray-900 ml-1">
                                    {school.summary?.average?.toFixed(1) || '0.0'}
                                  </span>
                                  <span className="text-xs text-gray-500 ml-1">
                                    ({school.summary?.count || 0} {t('superAdmin.ratings', { defaultValue: 'baholar' })})
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </Card>
            </>
          )}

          {activeTab === 'messages' && (
            <>
              <div className="text-center">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                  {t('superAdmin.messagesTitle', { defaultValue: 'Xabarlar' })}
                </h2>
                <p className="text-gray-600 font-medium">{t('superAdmin.messagesSubtitle', { defaultValue: 'Foydalanuvchilardan kelgan xabarlar' })}</p>
              </div>

              <Card className="p-6 space-y-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center min-h-[120px]">
                    <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-gray-600">{t('superAdmin.messagesEmpty', { defaultValue: 'Xabarlar yo\'q' })}</p>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`border rounded-xl p-4 hover:shadow-sm transition-shadow ${
                          !msg.isRead ? 'border-primary-300 bg-primary-50' : 'border-gray-100'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-gray-900">{msg.subject}</h3>
                              {!msg.isRead && (
                                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-primary-500 text-white">
                                  {t('superAdmin.new', { defaultValue: 'Yangi' })}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{msg.message}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>
                                {msg.sender?.firstName} {msg.sender?.lastName} ({msg.sender?.role})
                              </span>
                              <span>{new Date(msg.createdAt).toLocaleString()}</span>
                            </div>
                            {msg.reply && (
                              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-xs font-semibold text-green-700 mb-1">
                                  {t('superAdmin.reply', { defaultValue: 'Javob' })}:
                                </p>
                                <p className="text-sm text-gray-700">{msg.reply}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(msg.repliedAt).toLocaleString()}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            {!msg.isRead && (
                              <button
                                onClick={() => handleMarkRead(msg.id, true)}
                                className="px-3 py-1 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                              >
                                <Check className="w-3 h-3 inline mr-1" />
                                {t('superAdmin.markRead', { defaultValue: 'O\'qildi' })}
                              </button>
                            )}
                            {!msg.reply && (
                              <button
                                onClick={() => setSelectedMessage(msg)}
                                className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                              >
                                <Send className="w-3 h-3 inline mr-1" />
                                {t('superAdmin.reply', { defaultValue: 'Javob berish' })}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Reply Modal */}
              {selectedMessage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                  <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900">
                        {t('superAdmin.replyTo', { defaultValue: 'Javob berish' })}: {selectedMessage.subject}
                      </h3>
                      <button
                        onClick={() => {
                          setSelectedMessage(null);
                          setReplyText('');
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>
                    <div className="p-6 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('superAdmin.replyText', { defaultValue: 'Javob' })}
                        </label>
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={6}
                          placeholder={t('superAdmin.replyPlaceholder', { defaultValue: 'Javobingizni yozing...' })}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setSelectedMessage(null);
                            setReplyText('');
                          }}
                          className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
                          disabled={replying}
                        >
                          {t('superAdmin.cancel', { defaultValue: 'Bekor qilish' })}
                        </button>
                        <button
                          onClick={() => handleReply(selectedMessage.id)}
                          disabled={replying || !replyText.trim()}
                          className="flex-1 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {replying ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>{t('superAdmin.sending', { defaultValue: 'Yuborilmoqda...' })}</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              <span>{t('superAdmin.send', { defaultValue: 'Yuborish' })}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'government' && (
            <>
              <div className="text-center">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                  {t('superAdmin.createGovernmentTitle', { defaultValue: 'Davlat Foydalanuvchisini Yaratish' })}
                </h2>
                <p className="text-gray-600 font-medium">{t('superAdmin.createGovernmentSubtitle', { defaultValue: 'Government panel uchun yangi foydalanuvchi yarating' })}</p>
              </div>

              <Card className="p-8">
                <form onSubmit={handleCreateGovernment} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        {t('superAdmin.form.firstName')}
                      </label>
                      <input
                        type="text"
                        required
                        value={govFirstName}
                        onChange={(e) => setGovFirstName(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder={t('superAdmin.form.firstName')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        {t('superAdmin.form.lastName')}
                      </label>
                      <input
                        type="text"
                        required
                        value={govLastName}
                        onChange={(e) => setGovLastName(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder={t('superAdmin.form.lastName')}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {t('superAdmin.form.email')}
                    </label>
                    <input
                      type="email"
                      required
                      value={govEmail}
                      onChange={(e) => setGovEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="email@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-gray-400" />
                      {t('superAdmin.form.password')}
                    </label>
                    <input
                      type="password"
                      required
                      value={govPassword}
                      onChange={(e) => setGovPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="••••••••"
                      minLength={6}
                    />
                    <p className="mt-1 text-xs text-gray-500">{t('superAdmin.form.passwordMinLength', { defaultValue: 'Parol kamida 6 belgidan iborat bo\'lishi kerak' })}</p>
                  </div>

                  <button
                    type="submit"
                    disabled={govLoading}
                    className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {govLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{t('superAdmin.creating', { defaultValue: 'Yaratilmoqda...' })}</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        <span>{t('superAdmin.createGovernment', { defaultValue: 'Government Foydalanuvchisini Yaratish' })}</span>
                      </>
                    )}
                  </button>
                </form>
              </Card>

              {/* Governments List */}
              <div className="mt-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {t('superAdmin.governmentList', { defaultValue: 'Qo\'shilgan Government Foydalanuvchilar' })} ({governments.length})
                </h3>
                {loadingGovernments ? (
                  <Card className="p-8">
                    <div className="flex items-center justify-center min-h-[120px]">
                      <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  </Card>
                ) : governments.length === 0 ? (
                  <Card className="p-8">
                    <p className="text-sm text-gray-600 text-center py-8">
                      {t('superAdmin.noGovernments', { defaultValue: 'Hozircha government foydalanuvchilar yo\'q' })}
                    </p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {governments.map((gov) => (
                      <div key={gov.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center flex-shrink-0">
                            {gov.firstName?.charAt(0)}{gov.lastName?.charAt(0)}
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-semibold text-gray-900">
                              {gov.firstName} {gov.lastName}
                            </p>
                            <p className="text-sm text-gray-600">{gov.email}</p>
                            <p className="text-xs text-gray-500">
                              {gov.createdAt ? new Date(gov.createdAt).toLocaleDateString() : '—'}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                gov.isActive 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {gov.isActive ? t('superAdmin.active', { defaultValue: 'Faol' }) : t('superAdmin.inactive', { defaultValue: 'Nofaol' })}
                              </span>
                              <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
                                {t('superAdmin.government', { defaultValue: 'Government' })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => startEditGovernment(gov)}
                            className="px-3 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                          >
                            {t('superAdmin.form.update')}
                          </button>
                          <button
                            onClick={() => handleDeleteGovernment(gov.id)}
                            className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            {t('superAdmin.delete', { defaultValue: 'O\'chirish' })}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'registrations' && (
            <>
              <div className="text-center">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                  {t('superAdmin.registrationsTitle', { defaultValue: 'Admin Ro\'yxatdan O\'tish So\'rovlari' })}
                </h2>
                <p className="text-gray-600 font-medium">{t('superAdmin.registrationsSubtitle', { defaultValue: 'Yangi admin so\'rovlarini ko\'rib chiqing va tasdiqlang' })}</p>
              </div>

              <Card className="p-6 space-y-4">
                {loadingRegistrations ? (
                  <div className="flex items-center justify-center min-h-[120px]">
                    <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : registrationRequests.length === 0 ? (
                  <p className="text-sm text-gray-600 text-center py-8">{t('superAdmin.noRegistrations', { defaultValue: 'Hozircha so\'rovlar yo\'q' })}</p>
                ) : (
                  <div className="space-y-4">
                    {registrationRequests.map((request) => (
                      <div
                        key={request.id}
                        className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-3">
                            <div>
                              <h3 className="font-bold text-lg text-gray-900">
                                {request.firstName} {request.lastName}
                              </h3>
                              <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Mail className="w-4 h-4" />
                                  {request.email}
                                </span>
                                {request.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-4 h-4" />
                                    {request.phone}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <MessageSquare className="w-4 h-4" />
                                  {request.telegramUsername ? `@${request.telegramUsername}` : 'Telegram username kiritilmagan'}
                                </span>
                              </div>
                            </div>

                            {(request.passportNumber || request.location) && (
                              <div className="text-sm text-gray-600 space-y-1">
                                {request.passportNumber && (
                                  <p>Passport: {request.passportNumber} {request.passportSeries && `(${request.passportSeries})`}</p>
                                )}
                                {request.location && <p>Manzil: {request.location}</p>}
                                {request.region && <p>Viloyat: {request.region}</p>}
                                {request.city && <p>Shahar: {request.city}</p>}
                              </div>
                            )}

                            <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
                              {request.certificateFile && (
                                <a
                                  href={request.certificateFile}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                                >
                                  <FileText className="w-4 h-4" />
                                  Guvohnoma
                                </a>
                              )}
                              {request.passportFile && (
                                <a
                                  href={request.passportFile}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                                >
                                  <FileText className="w-4 h-4" />
                                  Passport/ID
                                </a>
                              )}
                            </div>

                            <p className="text-xs text-gray-500">
                              So'rov yuborilgan: {new Date(request.createdAt).toLocaleString('uz-UZ')}
                            </p>
                          </div>

                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => handleApproveRequest(request.id)}
                              disabled={approvingRequest}
                              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              <Check className="w-4 h-4" />
                              {t('superAdmin.approve', { defaultValue: 'Tasdiqlash' })}
                            </button>
                            <button
                              onClick={() => setSelectedRequest(request)}
                              disabled={rejectingRequest}
                              className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              <X className="w-4 h-4" />
                              {t('superAdmin.reject', { defaultValue: 'Rad etish' })}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Reject Modal */}
              {selectedRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                  <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900">
                        {t('superAdmin.rejectRequest', { defaultValue: 'So\'rovni rad etish' })}
                      </h3>
                      <button
                        onClick={() => {
                          setSelectedRequest(null);
                          setRejectionReason('');
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>
                    <div className="p-6 space-y-4">
                      <p className="text-sm text-gray-600">
                        {selectedRequest.firstName} {selectedRequest.lastName} {t('superAdmin.confirmReject', { defaultValue: 'so\'rovini rad etishni tasdiqlaysizmi?' })}
                      </p>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('superAdmin.rejectionReason', { defaultValue: 'Rad etish sababi (ixtiyoriy)' })}
                        </label>
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          rows={4}
                          placeholder={t('superAdmin.rejectionReasonPlaceholder', { defaultValue: 'Rad etish sababini kiriting...' })}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setSelectedRequest(null);
                            setRejectionReason('');
                          }}
                          className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
                          disabled={rejectingRequest}
                        >
                          {t('superAdmin.cancel', { defaultValue: 'Bekor qilish' })}
                        </button>
                        <button
                          onClick={() => handleRejectRequest(selectedRequest.id)}
                          disabled={rejectingRequest}
                          className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {rejectingRequest ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>{t('superAdmin.rejecting', { defaultValue: 'Rad etilmoqda...' })}</span>
                            </>
                          ) : (
                            <>
                              <X className="w-4 h-4" />
                              <span>{t('superAdmin.reject', { defaultValue: 'Rad etish' })}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Approved Credentials Modal */}
              {approvedCredentials && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                  <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900">
                        {t('superAdmin.credentialsTitle', { defaultValue: 'Login Ma\'lumotlari' })}
                      </h3>
                      <button
                        onClick={() => setApprovedCredentials(null)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm font-semibold text-green-800 mb-3">
                          {t('superAdmin.credentialsNote', { defaultValue: 'Quyidagi ma\'lumotlarni foydalanuvchiga yuboring:' })}
                        </p>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              {t('superAdmin.form.email')}
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                readOnly
                                value={approvedCredentials.email || ''}
                                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono"
                              />
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(approvedCredentials.email);
                                  success(t('superAdmin.copied', { defaultValue: 'Nusxalandi' }));
                                }}
                                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
                              >
                                {t('superAdmin.copy', { defaultValue: 'Nusxalash' })}
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              {t('superAdmin.form.password')}
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                readOnly
                                value={approvedCredentials.password || ''}
                                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono"
                              />
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(approvedCredentials.password);
                                  success(t('superAdmin.copied', { defaultValue: 'Nusxalandi' }));
                                }}
                                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
                              >
                                {t('superAdmin.copy', { defaultValue: 'Nusxalash' })}
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Telegram Username
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                readOnly
                                value={approvedCredentials.telegramUsername ? `@${approvedCredentials.telegramUsername}` : 'Kiritilmagan'}
                                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                              />
                              {approvedCredentials.telegramUsername && (
                                <a
                                  href={`https://t.me/${approvedCredentials.telegramUsername}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm transition-colors"
                                >
                                  {t('superAdmin.openTelegram', { defaultValue: 'Telegram' })}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            const text = `Email: ${approvedCredentials.email}\nParol: ${approvedCredentials.password}${approvedCredentials.telegramUsername ? `\nTelegram: @${approvedCredentials.telegramUsername}` : '\nTelegram: Kiritilmagan'}`;
                            navigator.clipboard.writeText(text);
                            success(t('superAdmin.allCopied', { defaultValue: 'Barcha ma\'lumotlar nusxalandi' }));
                          }}
                          className="flex-1 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition-colors shadow-sm flex items-center justify-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          {t('superAdmin.copyAll', { defaultValue: 'Barchasini nusxalash' })}
                        </button>
                        <button
                          onClick={() => setApprovedCredentials(null)}
                          className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
                        >
                          {t('superAdmin.close', { defaultValue: 'Yopish' })}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'payments' && (
            <>
              <div className="text-center">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                  {t('superAdmin.paymentsTitle', { defaultValue: 'To\'lovlar' })}
                </h2>
                <p className="text-gray-600 font-medium">{t('superAdmin.paymentsSubtitle', { defaultValue: 'Barcha to\'lovlar ro\'yxati' })}</p>
              </div>

              <Card className="p-6 space-y-4">
                {loadingPayments ? (
                  <div className="flex items-center justify-center min-h-[120px]">
                    <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : payments.length === 0 ? (
                  <p className="text-sm text-gray-600 text-center py-8">{t('superAdmin.noPayments', { defaultValue: 'To\'lovlar topilmadi' })}</p>
                ) : (
                  <div className="space-y-4">
                    {payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-gray-900">
                                {payment.parent?.firstName} {payment.parent?.lastName}
                              </h3>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                payment.status === 'completed'
                                  ? 'bg-green-100 text-green-700'
                                  : payment.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {payment.status === 'completed' ? t('superAdmin.paymentCompleted', { defaultValue: 'To\'langan' }) :
                                 payment.status === 'pending' ? t('superAdmin.paymentPending', { defaultValue: 'Kutilmoqda' }) :
                                 t('superAdmin.paymentFailed', { defaultValue: 'Xatolik' })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">
                              {t('superAdmin.amount', { defaultValue: 'Summa' })}: {payment.amount?.toLocaleString('uz-UZ')} {t('superAdmin.currency', { defaultValue: 'so\'m' })}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(payment.createdAt).toLocaleString('uz-UZ')}
                            </p>
                            {payment.description && (
                              <p className="text-sm text-gray-600 mt-2">{payment.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}

          {/* Edit Government modal */}
          {editingGovernment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{t('superAdmin.editTitle')}</h3>
                    <p className="text-sm text-gray-500">{editingGovernment.email}</p>
                  </div>
                  <button
                    onClick={() => setEditingGovernment(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleUpdateGovernment} className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('superAdmin.form.firstName')}</label>
                      <input
                        type="text"
                        required
                        value={editGovFirstName}
                        onChange={(e) => setEditGovFirstName(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('superAdmin.form.lastName')}</label>
                      <input
                        type="text"
                        required
                        value={editGovLastName}
                        onChange={(e) => setEditGovLastName(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('superAdmin.form.email')}</label>
                    <input
                      type="email"
                      required
                      value={editGovEmail}
                      onChange={(e) => setEditGovEmail(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('superAdmin.form.newPassword', { defaultValue: 'Yangi parol (ixtiyoriy)' })}</label>
                    <div className="relative">
                      <input
                        type={showPasswords.edit ? 'text' : 'password'}
                        value={editGovPassword}
                        onChange={(e) => setEditGovPassword(e.target.value)}
                        placeholder={t('superAdmin.form.passwordOptional', { defaultValue: 'Parolni o\'zgartirmasangiz bo\'sh qoldiring' })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, edit: !showPasswords.edit })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPasswords.edit ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setEditingGovernment(null)}
                      className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors"
                      disabled={editGovSaving}
                    >
                      {t('superAdmin.form.cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={editGovSaving}
                      className="flex-1 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {editGovSaving ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>{t('superAdmin.saving', { defaultValue: 'Saqlanmoqda...' })}</span>
                        </>
                      ) : (
                        <span>{t('superAdmin.form.save')}</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit modal */}
          {editingAdmin && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{t('superAdmin.editTitle')}</h3>
                    <p className="text-sm text-gray-500">{editingAdmin.email}</p>
                  </div>
                  <button
                    onClick={() => setEditingAdmin(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleUpdateAdmin} className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('superAdmin.form.firstName')}</label>
                      <input
                        type="text"
                        required
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('superAdmin.form.lastName')}</label>
                      <input
                        type="text"
                        required
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('superAdmin.form.email')}</label>
                    <input
                      type="email"
                      required
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('superAdmin.form.phone')}</label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('superAdmin.form.password')}</label>
                    <div className="relative">
                      <input
                        type={showPasswords.edit ? 'text' : 'password'}
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder={t('superAdmin.form.passwordChange', { defaultValue: 'Parolni o\'zgartirish uchun kiriting' })}
                        className="w-full px-4 py-2.5 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, edit: !showPasswords.edit })}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                      >
                        {showPasswords.edit ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingAdmin(null)}
                      className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                      disabled={editSaving}
                    >
                      {t('superAdmin.form.cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={editSaving}
                      className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                    >
                      {editSaving ? t('superAdmin.status.loadingAdmins') : t('superAdmin.form.save')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuperAdmin;
