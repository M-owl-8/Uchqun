import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Crown, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import SuperAdminBackground from '../components/SuperAdminBackground';
import AdminsTab from '../components/tabs/AdminsTab';
import SchoolsTab from '../components/tabs/SchoolsTab';
import MessagesTab from '../components/tabs/MessagesTab';
import GovernmentTab from '../components/tabs/GovernmentTab';
import RegistrationsTab from '../components/tabs/RegistrationsTab';
import PaymentsTab from '../components/tabs/PaymentsTab';

const TABS = ['admins', 'schools', 'messages', 'government', 'payments', 'registrations'];

const SuperAdmin = () => {
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
  const [showPasswords, setShowPasswords] = useState({ create: false, edit: false });
  const [schools, setSchools] = useState([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [activeTab, setActiveTab] = useState('admins');
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

  useEffect(() => {
    const loadAdmins = async () => {
      try {
        setLoadingAdmins(true);
        const res = await api.get('/super-admin/admins');
        setAdmins(res.data?.data || []);
      } catch { setAdmins([]); } finally { setLoadingAdmins(false); }
    };
    loadAdmins();
  }, []);

  useEffect(() => {
    const loadGovernments = async () => {
      try {
        setLoadingGovernments(true);
        const res = await api.get('/super-admin/government');
        setGovernments(res.data?.data || []);
      } catch { setGovernments([]); } finally { setLoadingGovernments(false); }
    };
    loadGovernments();
  }, []);

  useEffect(() => {
    const loadSchools = async () => {
      try {
        setLoadingSchools(true);
        const res = await api.get('/super-admin/schools');
        setSchools(res.data?.data || []);
      } catch { setSchools([]); } finally { setLoadingSchools(false); }
    };
    loadSchools();
  }, []);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        setLoadingMessages(true);
        const res = await api.get('/super-admin/messages');
        setMessages(res.data?.data || []);
      } catch { setMessages([]); } finally { setLoadingMessages(false); }
    };
    loadMessages();
  }, []);

  useEffect(() => {
    if (activeTab === 'registrations') {
      const load = async () => {
        try {
          setLoadingRegistrations(true);
          const res = await api.get('/super-admin/admin-registrations?status=pending');
          setRegistrationRequests(res.data?.data || []);
        } catch { setRegistrationRequests([]); } finally { setLoadingRegistrations(false); }
      };
      load();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'payments') {
      const load = async () => {
        try {
          setLoadingPayments(true);
          const res = await api.get('/super-admin/payments?limit=50');
          setPayments(res.data?.data?.payments || []);
        } catch { setPayments([]); } finally { setLoadingPayments(false); }
      };
      load();
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
      const res = await api.get('/super-admin/messages');
      setMessages(res.data?.data || []);
    } catch (error) {
      showError(error.response?.data?.error || t('superAdmin.replyError', { defaultValue: 'Javob yuborishda xatolik' }));
    } finally { setReplying(false); }
  };

  const handleMarkRead = async (messageId, isRead) => {
    try {
      await api.put(`/super-admin/messages/${messageId}/read`, { isRead });
      const res = await api.get('/super-admin/messages');
      setMessages(res.data?.data || []);
    } catch { /* silently handled */ }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleSubmit = async ({ firstName, lastName, email, password }, reset) => {
    if (!firstName || !lastName || !email || !password) {
      showError(t('superAdmin.validation.required'));
      return;
    }
    try {
      setLoading(true);
      await api.post('/super-admin/admins', { firstName, lastName, email, password });
      success(t('superAdmin.toastCreate'));
      reset?.();
      const res = await api.get('/super-admin/admins');
      setAdmins(res.data?.data || []);
    } catch (error) {
      showError(error.response?.data?.error || t('superAdmin.toastSaveError'));
    } finally { setLoading(false); }
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
        firstName: editFirstName, lastName: editLastName, email: editEmail,
        phone: editPhone, password: editPassword || undefined,
      });
      success(t('superAdmin.toastUpdate'));
      const res = await api.get('/super-admin/admins');
      setAdmins(res.data?.data || []);
      setEditingAdmin(null);
      setEditPassword('');
    } catch (error) {
      showError(error.response?.data?.error || t('superAdmin.toastSaveError'));
    } finally { setEditSaving(false); }
  };

  const handleDeleteAdmin = async (id) => {
    if (!window.confirm(t('superAdmin.confirmDelete'))) return;
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
    const fn = govFirstName.trim(), ln = govLastName.trim(), em = govEmail.trim(), pw = govPassword.trim();
    if (!fn || !ln || !em || !pw) {
      showError(t('superAdmin.validation.allFieldsRequired', { defaultValue: "Barcha maydonlar to'ldirilishi kerak" }));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      showError(t('superAdmin.validation.invalidEmail', { defaultValue: "Email formati noto'g'ri" }));
      return;
    }
    if (pw.length < 8) {
      showError(t('superAdmin.validation.passwordMinLength', { defaultValue: "Parol kamida 8 belgidan iborat bo'lishi kerak" }));
      return;
    }
    try {
      setGovLoading(true);
      await api.post('/super-admin/government', { firstName: fn, lastName: ln, email: em, password: pw });
      success(t('superAdmin.governmentCreated', { defaultValue: 'Government foydalanuvchisi muvaffaqiyatli yaratildi' }));
      setGovFirstName(''); setGovLastName(''); setGovEmail(''); setGovPassword('');
      const res = await api.get('/super-admin/government');
      setGovernments(res.data?.data || []);
    } catch (error) {
      showError(error.response?.data?.error || error.message || t('superAdmin.governmentCreateError', { defaultValue: 'Yaratishda xatolik' }));
    } finally { setGovLoading(false); }
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
        firstName: editGovFirstName, lastName: editGovLastName,
        email: editGovEmail, password: editGovPassword || undefined,
      });
      success(t('superAdmin.governmentUpdated', { defaultValue: 'Government foydalanuvchi yangilandi' }));
      const res = await api.get('/super-admin/government');
      setGovernments(res.data?.data || []);
      setEditingGovernment(null);
      setEditGovPassword('');
    } catch (error) {
      showError(error.response?.data?.error || t('superAdmin.governmentUpdateError', { defaultValue: 'Yangilashda xatolik' }));
    } finally { setEditGovSaving(false); }
  };

  const handleDeleteGovernment = async (id) => {
    if (!window.confirm(t('superAdmin.confirmDeleteGovernment', { defaultValue: "Bu government foydalanuvchisini o'chirishni xohlaysizmi?" }))) return;
    try {
      await api.delete(`/super-admin/government/${id}`);
      success(t('superAdmin.governmentDeleted', { defaultValue: "Government foydalanuvchi o'chirildi" }));
      setGovernments((prev) => prev.filter((g) => g.id !== id));
    } catch (error) {
      showError(error.response?.data?.error || t('superAdmin.governmentDeleteError', { defaultValue: "O'chirishda xatolik" }));
    }
  };

  const handleApproveRequest = async (id) => {
    if (!window.confirm(t('superAdmin.confirmApprove', { defaultValue: "Bu so'rovni tasdiqlaysizmi?" }))) return;
    setApprovingRequest(true);
    try {
      const res = await api.post(`/super-admin/admin-registrations/${id}/approve`, {});
      setApprovedCredentials(res.data?.data?.credentials || res.data?.data);
      success(t('superAdmin.requestApproved', { defaultValue: "So'rov tasdiqlandi." }));
      const [reqRes, admRes] = await Promise.allSettled([
        api.get('/super-admin/admin-registrations?status=pending'),
        api.get('/super-admin/admins'),
      ]);
      if (reqRes.status === 'fulfilled') setRegistrationRequests(reqRes.value.data?.data || []);
      if (admRes.status === 'fulfilled') setAdmins(admRes.value.data?.data || []);
    } catch (error) {
      showError(error.response?.data?.error || t('superAdmin.approveError', { defaultValue: "Tasdiqlashda xatolik" }));
    } finally { setApprovingRequest(false); }
  };

  const handleRejectRequest = async (id) => {
    setRejectingRequest(true);
    try {
      await api.post(`/super-admin/admin-registrations/${id}/reject`, { reason: rejectionReason.trim() || null });
      success(t('superAdmin.requestRejected', { defaultValue: "So'rov rad etildi" }));
      setSelectedRequest(null);
      setRejectionReason('');
      const res = await api.get('/super-admin/admin-registrations?status=pending');
      setRegistrationRequests(res.data?.data || []);
    } catch (error) {
      showError(error.response?.data?.error || t('superAdmin.rejectError', { defaultValue: 'Rad etishda xatolik' }));
    } finally { setRejectingRequest(false); }
  };

  const TAB_LABELS = {
    admins: t('superAdmin.tabs.admins', { defaultValue: 'Adminlar' }),
    schools: t('superAdmin.tabs.schools', { defaultValue: 'Muassasalar' }),
    messages: t('superAdmin.tabs.messages', { defaultValue: 'Xabarlar' }),
    government: t('superAdmin.tabs.government', { defaultValue: 'Davlat' }),
    payments: t('superAdmin.tabs.payments', { defaultValue: "To'lovlar" }),
    registrations: t('superAdmin.tabs.registrations', { defaultValue: "Ro'yxatdan o'tish" }),
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <SuperAdminBackground />

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
              <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                <LogOut className="w-4 h-4" />
                {t('header.logout')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 relative z-10">
        <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === tab ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {TAB_LABELS[tab]}
              {tab === 'messages' && messages.filter((m) => !m.isRead).length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {messages.filter((m) => !m.isRead).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center px-4 py-12 relative z-10">
        <div className={`${activeTab === 'messages' ? 'max-w-6xl' : 'max-w-2xl'} w-full space-y-8`}>
          {activeTab === 'admins' && (
            <AdminsTab
              admins={admins} loadingAdmins={loadingAdmins} loading={loading}
              onSubmit={handleSubmit}
              editingAdmin={editingAdmin} editFirstName={editFirstName} editLastName={editLastName}
              editEmail={editEmail} editPhone={editPhone} editPassword={editPassword} editSaving={editSaving}
              setEditFirstName={setEditFirstName} setEditLastName={setEditLastName}
              setEditEmail={setEditEmail} setEditPhone={setEditPhone} setEditPassword={setEditPassword}
              onStartEdit={startEdit} onUpdateAdmin={handleUpdateAdmin}
              onDeleteAdmin={handleDeleteAdmin} onCloseEdit={() => setEditingAdmin(null)}
              showPasswords={showPasswords} setShowPasswords={setShowPasswords}
            />
          )}
          {activeTab === 'schools' && <SchoolsTab schools={schools} loadingSchools={loadingSchools} />}
          {activeTab === 'messages' && (
            <MessagesTab
              messages={messages} loadingMessages={loadingMessages}
              selectedMessage={selectedMessage} replyText={replyText} replying={replying}
              onMarkRead={handleMarkRead} onSelectMessage={setSelectedMessage}
              onReply={handleReply} setReplyText={setReplyText}
            />
          )}
          {activeTab === 'government' && (
            <GovernmentTab
              governments={governments} loadingGovernments={loadingGovernments} govLoading={govLoading}
              govFirstName={govFirstName} govLastName={govLastName} govEmail={govEmail} govPassword={govPassword}
              setGovFirstName={setGovFirstName} setGovLastName={setGovLastName}
              setGovEmail={setGovEmail} setGovPassword={setGovPassword}
              onCreateGovernment={handleCreateGovernment}
              editingGovernment={editingGovernment}
              editGovFirstName={editGovFirstName} editGovLastName={editGovLastName}
              editGovEmail={editGovEmail} editGovPassword={editGovPassword} editGovSaving={editGovSaving}
              setEditGovFirstName={setEditGovFirstName} setEditGovLastName={setEditGovLastName}
              setEditGovEmail={setEditGovEmail} setEditGovPassword={setEditGovPassword}
              onStartEditGovernment={startEditGovernment} onUpdateGovernment={handleUpdateGovernment}
              onDeleteGovernment={handleDeleteGovernment} onCloseEditGov={() => setEditingGovernment(null)}
              showPasswords={showPasswords} setShowPasswords={setShowPasswords}
            />
          )}
          {activeTab === 'registrations' && (
            <RegistrationsTab
              registrationRequests={registrationRequests} loadingRegistrations={loadingRegistrations}
              approvingRequest={approvingRequest} rejectingRequest={rejectingRequest}
              selectedRequest={selectedRequest} rejectionReason={rejectionReason}
              approvedCredentials={approvedCredentials}
              onApprove={handleApproveRequest} onSelectRequest={setSelectedRequest}
              onReject={handleRejectRequest}
              onCloseRequest={() => { setSelectedRequest(null); setRejectionReason(''); }}
              onCloseCredentials={() => setApprovedCredentials(null)}
              setRejectionReason={setRejectionReason} success={success}
            />
          )}
          {activeTab === 'payments' && <PaymentsTab payments={payments} loadingPayments={loadingPayments} />}
        </div>
      </div>
    </div>
  );
};

export default SuperAdmin;
