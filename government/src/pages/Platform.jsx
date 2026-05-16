import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import * as cache from '../../../shared/utils/cache';
import { useToast } from '@shared/context/ToastContext';
import AdminsTab from '../components/tabs/AdminsTab';
import SchoolsTab from '../components/tabs/SchoolsTab';
import MessagesTab from '../components/tabs/MessagesTab';
import GovernmentTab from '../components/tabs/GovernmentTab';
import RegistrationsTab from '../components/tabs/RegistrationsTab';
import ConfirmDialog from '@shared/components/ConfirmDialog';

const TABS = ['admins', 'schools', 'messages', 'government', 'registrations'];

const Platform = () => {
  const { t } = useTranslation();
  const { success, error: showError } = useToast();

  const [activeTab, setActiveTab] = useState('admins');
  const [confirmDialog, setConfirmDialog] = useState(null);

  const [loading, setLoading] = useState(false);
  const [admins, setAdmins] = useState(() => cache.get('platform:admins') || []);
  const [loadingAdmins, setLoadingAdmins] = useState(!cache.get('platform:admins'));
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ edit: false });

  const [schools, setSchools] = useState(() => cache.get('platform:schools') || []);
  const [loadingSchools, setLoadingSchools] = useState(!cache.get('platform:schools'));

  const [messages, setMessages] = useState(() => cache.get('platform:messages') || []);
  const [loadingMessages, setLoadingMessages] = useState(!cache.get('platform:messages'));
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  const [govFirstName, setGovFirstName] = useState('');
  const [govLastName, setGovLastName] = useState('');
  const [govEmail, setGovEmail] = useState('');
  const [govPassword, setGovPassword] = useState('');
  const [govLoading, setGovLoading] = useState(false);
  const [governments, setGovernments] = useState(() => cache.get('platform:governments') || []);
  const [loadingGovernments, setLoadingGovernments] = useState(!cache.get('platform:governments'));
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

  useEffect(() => {
    const fresh = () => api.get('/government/admins').then(res => {
      const data = res.data?.data || [];
      cache.set('platform:admins', data);
      setAdmins(data);
    }).catch(() => {});
    if (cache.get('platform:admins')) { fresh(); return; }
    setLoadingAdmins(true);
    fresh().finally(() => setLoadingAdmins(false));
  }, []);

  useEffect(() => {
    const fresh = () => api.get('/government/users').then(res => {
      const data = res.data?.data || [];
      cache.set('platform:governments', data);
      setGovernments(data);
    }).catch(() => {});
    if (cache.get('platform:governments')) { fresh(); return; }
    setLoadingGovernments(true);
    fresh().finally(() => setLoadingGovernments(false));
  }, []);

  useEffect(() => {
    const fresh = () => api.get('/government/schools-list').then(res => {
      const data = res.data?.data || [];
      cache.set('platform:schools', data);
      setSchools(data);
    }).catch(() => {});
    if (cache.get('platform:schools')) { fresh(); return; }
    setLoadingSchools(true);
    fresh().finally(() => setLoadingSchools(false));
  }, []);

  useEffect(() => {
    const fresh = () => api.get('/government/messages').then(res => {
      const data = res.data?.data || [];
      cache.set('platform:messages', data);
      setMessages(data);
    }).catch(() => {});
    if (cache.get('platform:messages')) { fresh(); return; }
    setLoadingMessages(true);
    fresh().finally(() => setLoadingMessages(false));
  }, []);

  useEffect(() => {
    if (activeTab !== 'registrations') return;
    (async () => {
      try {
        setLoadingRegistrations(true);
        const res = await api.get('/government/admin-registrations?status=pending');
        setRegistrationRequests(res.data?.data || []);
      } catch { setRegistrationRequests([]); } finally { setLoadingRegistrations(false); }
    })();
  }, [activeTab]);

  const handleReply = async (messageId) => {
    if (!replyText.trim()) return;
    setReplying(true);
    try {
      await api.post(`/government/messages/${messageId}/reply`, { reply: replyText.trim() });
      success(t('government.replySent', { defaultValue: 'Reply sent' }));
      setReplyText('');
      setSelectedMessage(null);
      const res = await api.get('/government/messages');
      const data = res.data?.data || [];
      cache.set('platform:messages', data);
      setMessages(data);
    } catch (error) {
      showError(error.response?.data?.error || t('government.replyError', { defaultValue: 'Reply failed' }));
    } finally { setReplying(false); }
  };

  const handleMarkRead = async (messageId, isRead) => {
    try {
      await api.put(`/government/messages/${messageId}/read`, { isRead });
      const res = await api.get('/government/messages');
      const data = res.data?.data || [];
      cache.set('platform:messages', data);
      setMessages(data);
    } catch { /* ignore */ }
  };

  const handleSubmitAdmin = async ({ firstName, lastName, email, password }, reset) => {
    if (!firstName || !lastName || !email || !password) {
      showError(t('government.validation.required'));
      return;
    }
    try {
      setLoading(true);
      await api.post('/government/admins', { firstName, lastName, email, password });
      success(t('government.toastCreate'));
      reset?.();
      const res = await api.get('/government/admins');
      const data = res.data?.data || [];
      cache.set('platform:admins', data);
      setAdmins(data);
    } catch (error) {
      showError(error.response?.data?.error || t('government.toastSaveError'));
    } finally { setLoading(false); }
  };

  const startEdit = (adm) => {
    setEditingAdmin(adm);
    setEditFirstName(adm.firstName || '');
    setEditLastName(adm.lastName || '');
    setEditEmail(adm.email || '');
    setEditPhone(adm.phone || '');
    setEditPassword('');
    setShowPasswords({ edit: false });
  };

  const handleUpdateAdmin = async (e) => {
    e.preventDefault();
    if (!editingAdmin) return;
    try {
      setEditSaving(true);
      await api.put(`/government/admins/${editingAdmin.id}`, {
        firstName: editFirstName, lastName: editLastName, email: editEmail,
        phone: editPhone, password: editPassword || undefined,
      });
      success(t('government.toastUpdate'));
      const res = await api.get('/government/admins');
      const data = res.data?.data || [];
      cache.set('platform:admins', data);
      setAdmins(data);
      setEditingAdmin(null);
      setEditPassword('');
    } catch (error) {
      showError(error.response?.data?.error || t('government.toastSaveError'));
    } finally { setEditSaving(false); }
  };

  const handleDeleteAdmin = (id) => {
    setConfirmDialog({
      message: t('government.confirmDelete'),
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/government/admins/${id}`);
          success(t('government.toastDelete'));
          setAdmins((prev) => {
            const next = prev.filter((a) => a.id !== id);
            cache.set('platform:admins', next);
            return next;
          });
        } catch (error) {
          showError(error.response?.data?.error || t('government.toastDeleteError'));
        }
      },
    });
  };

  const handleCreateGovernment = async (e) => {
    e.preventDefault();
    const fn = govFirstName.trim(), ln = govLastName.trim(), em = govEmail.trim(), pw = govPassword.trim();
    if (!fn || !ln || !em || !pw) {
      showError(t('government.validation.allFieldsRequired', { defaultValue: 'All fields are required' }));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      showError(t('government.validation.invalidEmail', { defaultValue: 'Invalid email format' }));
      return;
    }
    if (pw.length < 8) {
      showError(t('government.validation.passwordMinLength', { defaultValue: 'Password must be at least 8 characters' }));
      return;
    }
    try {
      setGovLoading(true);
      await api.post('/government/users', { firstName: fn, lastName: ln, email: em, password: pw });
      success(t('government.governmentCreated', { defaultValue: 'Government user created' }));
      setGovFirstName(''); setGovLastName(''); setGovEmail(''); setGovPassword('');
      const res = await api.get('/government/users');
      const data = res.data?.data || [];
      cache.set('platform:governments', data);
      setGovernments(data);
    } catch (error) {
      showError(error.response?.data?.error || error.message || t('government.governmentCreateError', { defaultValue: 'Create failed' }));
    } finally { setGovLoading(false); }
  };

  const startEditGovernment = (gov) => {
    setEditingGovernment(gov);
    setEditGovFirstName(gov.firstName || '');
    setEditGovLastName(gov.lastName || '');
    setEditGovEmail(gov.email || '');
    setEditGovPassword('');
    setShowPasswords({ edit: false });
  };

  const handleUpdateGovernment = async (e) => {
    e.preventDefault();
    if (!editingGovernment) return;
    try {
      setEditGovSaving(true);
      await api.put(`/government/users/${editingGovernment.id}`, {
        firstName: editGovFirstName, lastName: editGovLastName,
        email: editGovEmail, password: editGovPassword || undefined,
      });
      success(t('government.governmentUpdated', { defaultValue: 'Government user updated' }));
      const res = await api.get('/government/users');
      const data = res.data?.data || [];
      cache.set('platform:governments', data);
      setGovernments(data);
      setEditingGovernment(null);
      setEditGovPassword('');
    } catch (error) {
      showError(error.response?.data?.error || t('government.governmentUpdateError', { defaultValue: 'Update failed' }));
    } finally { setEditGovSaving(false); }
  };

  const handleDeleteGovernment = (id) => {
    setConfirmDialog({
      message: t('government.confirmDeleteGovernment', { defaultValue: 'Delete this government user?' }),
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/government/users/${id}`);
          success(t('government.governmentDeleted', { defaultValue: 'Government user deleted' }));
          setGovernments((prev) => {
            const next = prev.filter((g) => g.id !== id);
            cache.set('platform:governments', next);
            return next;
          });
        } catch (error) {
          showError(error.response?.data?.error || t('government.governmentDeleteError', { defaultValue: 'Delete failed' }));
        }
      },
    });
  };

  const handleApproveRequest = (id) => {
    setConfirmDialog({
      message: t('government.confirmApprove', { defaultValue: 'Approve this request?' }),
      onConfirm: async () => {
        setConfirmDialog(null);
        setApprovingRequest(true);
        try {
          const res = await api.post(`/government/admin-registrations/${id}/approve`, {});
          setApprovedCredentials(res.data?.data?.credentials || res.data?.data);
          success(t('government.requestApproved', { defaultValue: 'Request approved' }));
          const [reqRes, admRes] = await Promise.allSettled([
            api.get('/government/admin-registrations?status=pending'),
            api.get('/government/admins'),
          ]);
          if (reqRes.status === 'fulfilled') setRegistrationRequests(reqRes.value.data?.data || []);
          if (admRes.status === 'fulfilled') setAdmins(admRes.value.data?.data || []);
        } catch (error) {
          showError(error.response?.data?.error || t('government.approveError', { defaultValue: 'Approve failed' }));
        } finally { setApprovingRequest(false); }
      },
    });
  };

  const handleRejectRequest = async (id) => {
    setRejectingRequest(true);
    try {
      await api.post(`/government/admin-registrations/${id}/reject`, { reason: rejectionReason.trim() || null });
      success(t('government.requestRejected', { defaultValue: 'Request rejected' }));
      setSelectedRequest(null);
      setRejectionReason('');
      const res = await api.get('/government/admin-registrations?status=pending');
      setRegistrationRequests(res.data?.data || []);
    } catch (error) {
      showError(error.response?.data?.error || t('government.rejectError', { defaultValue: 'Reject failed' }));
    } finally { setRejectingRequest(false); }
  };

  const TAB_LABELS = {
    admins: t('platform.tabs.admins', { defaultValue: 'Admins' }),
    schools: t('platform.tabs.schools', { defaultValue: 'Schools' }),
    messages: t('platform.tabs.messages', { defaultValue: 'Messages' }),
    government: t('platform.tabs.government', { defaultValue: 'Government Users' }),
    registrations: t('platform.tabs.registrations', { defaultValue: 'Registrations' }),
  };

  return (
    <div>
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === tab ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
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

      <div className={`${activeTab === 'messages' ? 'max-w-6xl' : 'max-w-2xl'} w-full mx-auto space-y-8`}>
        {activeTab === 'admins' && (
          <AdminsTab
            admins={admins} loadingAdmins={loadingAdmins} loading={loading}
            onSubmit={handleSubmitAdmin}
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
      </div>
      <ConfirmDialog dialog={confirmDialog} onCancel={() => setConfirmDialog(null)} />
    </div>
  );
};

export default Platform;
