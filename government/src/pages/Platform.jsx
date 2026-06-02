import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import * as cache from '../../../shared/utils/cache';
import { useToast } from '@shared/context/ToastContext';
import { useAuth } from '../context/AuthContext';
import AdminsTab from '../components/tabs/AdminsTab';
import MessagesTab from '../components/tabs/MessagesTab';
import GovernmentTab from '../components/tabs/GovernmentTab';
import RegistrationsTab from '../components/tabs/RegistrationsTab';
import ConfirmDialog from '@shared/components/ConfirmDialog';

const useApiCache = (url, cacheKey) => {
  const [data, setData] = useState(() => cache.get(cacheKey) || []);
  const [loading, setLoading] = useState(!cache.get(cacheKey));
  const [error, setError] = useState(null);

  const refresh = useCallback(() =>
    api.get(url).then(res => {
      const fresh = res.data?.data || [];
      cache.set(cacheKey, fresh);
      setData(fresh);
      setError(null);
      return fresh;
    }).catch(err => {
      setError(err);
      throw err;
    }),
    [url, cacheKey]
  );

  useEffect(() => {
    if (cache.get(cacheKey)) { refresh().catch(() => {}); return; }
    setLoading(true);
    refresh().catch(() => {}).finally(() => setLoading(false));
  }, [cacheKey, refresh]);

  return [data, setData, loading, refresh, error];
};

const TABS = ['admins', 'messages', 'government', 'registrations'];

const Platform = () => {
  const { t } = useTranslation();
  const { success, error: showError } = useToast();
  const { govType, isRepublic, govRegionId } = useAuth();

  const [activeTab, setActiveTab] = useState('admins');
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  // admins
  const [admins, setAdmins, loadingAdmins, refreshAdmins, adminsError] = useApiCache('/government/admins', 'platform:admins');
  const [schools, , loadingSchools] = useApiCache('/government/schools?limit=999', 'platform:schools:all');
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ edit: false });

  // messages — unread count only (for tab badge); full state is managed inside MessagesTab
  const [unreadCount, setUnreadCount] = useState(0);

  // government users
  const [governments, setGovernments, loadingGovernments, refreshGovernments, governmentsError] = useApiCache('/government/users', 'platform:governments');

  // regions (for provisioning dropdowns)
  const [regions, , loadingRegions] = useApiCache('/government/regions', 'platform:regions');

  // registrations (not cached — always fresh, status changes frequently)
  const [registrationRequests, setRegistrationRequests] = useState([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvingRequest, setApprovingRequest] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvedCredentials, setApprovedCredentials] = useState(null);

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

  const handleSubmitAdmin = async ({ firstName, lastName, localPart, schoolId, password }, reset) => {
    if (!firstName || !lastName || !localPart || !schoolId || !password) {
      showError(t('government.validation.allFieldsRequired'));
      return;
    }
    try {
      setCreatingAdmin(true);
      const res = await api.post('/government/admins', { firstName, lastName, localPart, schoolId, password });
      success(t('government.toastCreate'));
      reset?.();
      await refreshAdmins();
      // Surface the created email as a brief credential notice
      const createdEmail = res.data?.data?.email;
      if (createdEmail) success(`${t('government.credentialsTitle')}: ${createdEmail}`);
    } catch (err) {
      const errPayload = err.response?.data?.error;
      const code = typeof errPayload === 'object' ? errPayload?.code : null;
      const detail = typeof errPayload === 'object' ? errPayload?.detail : errPayload;
      const msg = detail ?? (code ? t(`adminCreateErrors.${code}`, { defaultValue: code }) : null) ?? t('government.toastSaveError');
      showError(msg);
    } finally { setCreatingAdmin(false); }
  };

  const startEdit = (adm) => {
    setEditingAdmin(adm);
    setEditFirstName(adm.firstName || '');
    setEditLastName(adm.lastName || '');
    setEditPhone(adm.phone || '');
    setEditPassword('');
    setShowPasswords({ edit: false });
  };

  const handleUpdateAdmin = async (e) => {
    e.preventDefault();
    if (!editingAdmin) return;
    try {
      setEditSaving(true);
      // email is intentionally excluded — immutable post-creation
      await api.put(`/government/admins/${editingAdmin.id}`, {
        firstName: editFirstName, lastName: editLastName,
        phone: editPhone, password: editPassword || undefined,
      });
      success(t('government.toastUpdate'));
      await refreshAdmins();
      setEditingAdmin(null);
      setEditPassword('');
    } catch (err) {
      const errPayload = err.response?.data?.error;
      const detail = typeof errPayload === 'object' ? errPayload?.detail : errPayload;
      showError(detail ?? t('government.toastSaveError'));
    } finally { setEditSaving(false); }
  };

  const handleDeleteAdmin = (id) => {
    setConfirmDialog({
      message: t('government.confirmDelete'),
      warning: t('government.confirmDeleteWarning', { defaultValue: "Bu amal qaytarib bo'lmaydi — adminni tiklash uchun hukumat portali orqali murojaat qiling." }),
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
          showError(error.response?.data?.error?.detail ?? error.response?.data?.error ?? t('government.toastDeleteError'));
        }
      },
    });
  };

  // ── Government account handlers ───────────────────────────────────────────

  const handleCreateGovernment = async (formData) => {
    await api.post('/government/users', formData);
    success(t('provision.success.created'));
    await refreshGovernments();
  };

  const handleDeleteGovernment = (id) => {
    setConfirmDialog({
      message: t('provision.actions.confirmDelete'),
      warning: t('provision.actions.confirmDeleteWarning', { defaultValue: "Bu amal qaytarib bo'lmaydi — hukumat foydalanuvchisini tiklab bo'lmaydi." }),
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/government/users/${id}`);
          success(t('provision.success.deleted'));
          setGovernments((prev) => {
            const next = prev.filter((g) => g.id !== id);
            cache.set('platform:governments', next);
            return next;
          });
        } catch (error) {
          const code = error?.response?.data?.error;
          if (code === 'DELETE_LAST_REPUBLIC_MAIN') {
            showError(t('provision.errors.deleteLastRepublicMain'));
          } else {
            showError(
              error.response?.data?.error?.detail ??
              error.response?.data?.error ??
              t('government.governmentDeleteError')
            );
          }
        }
      },
    });
  };

  const handleResetPassword = async (id, newPassword) => {
    await api.put(`/government/users/${id}/reset-password`, { newPassword });
    success(t('provision.success.passwordReset'));
    await refreshGovernments();
  };

  // ── Registration handlers ─────────────────────────────────────────────────

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
          const [reqRes] = await Promise.allSettled([
            api.get('/government/admin-registrations?status=pending'),
            refreshAdmins(),
          ]);
          if (reqRes.status === 'fulfilled') setRegistrationRequests(reqRes.value.data?.data || []);
        } catch (error) {
          showError(error.response?.data?.error?.detail ?? error.response?.data?.error ?? t('government.approveError', { defaultValue: 'Approve failed' }));
        } finally { setApprovingRequest(false); }
      },
    });
  };

  const handleRejectRequest = (id) => {
    setConfirmDialog({
      message: t('government.confirmRejectRequest', { defaultValue: "Ushbu admin ro'yxatdan o'tish so'rovini rad etmoqchimisiz?" }),
      warning: t('government.confirmRejectRequestWarning', { defaultValue: "Bu amal qaytarib bo'lmaydi — ariza beruvchi qayta ariza topshirishi kerak bo'ladi." }),
      onConfirm: async () => {
        setConfirmDialog(null);
        setRejectingRequest(true);
        try {
          await api.post(`/government/admin-registrations/${id}/reject`, { reason: rejectionReason.trim() || null });
          success(t('government.requestRejected', { defaultValue: 'Request rejected' }));
          setSelectedRequest(null);
          setRejectionReason('');
          const res = await api.get('/government/admin-registrations?status=pending');
          setRegistrationRequests(res.data?.data || []);
        } catch (error) {
          showError(error.response?.data?.error?.detail ?? error.response?.data?.error ?? t('government.rejectError', { defaultValue: 'Reject failed' }));
        } finally { setRejectingRequest(false); }
      },
    });
  };

  const TAB_LABELS = {
    admins: t('platform.tabs.admins', { defaultValue: 'Admins' }),
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
            {tab === 'messages' && unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className={`${activeTab === 'messages' ? 'max-w-6xl' : 'max-w-2xl'} w-full mx-auto space-y-8`}>
        {activeTab === 'admins' && adminsError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
            {t('platform.loadError', { defaultValue: "Ma'lumotlarni yuklashda xatolik" })}
            <button onClick={() => refreshAdmins().catch(() => {})} className="ml-3 underline font-medium">
              {t('warnings.retry', { defaultValue: 'Qayta urinish' })}
            </button>
          </div>
        )}
        {activeTab === 'admins' && (
          <AdminsTab
            admins={admins} loadingAdmins={loadingAdmins} loading={creatingAdmin}
            schools={schools?.schools ?? schools ?? []} loadingSchools={loadingSchools}
            onSubmit={handleSubmitAdmin}
            editingAdmin={editingAdmin} editFirstName={editFirstName} editLastName={editLastName}
            editPhone={editPhone} editPassword={editPassword} editSaving={editSaving}
            setEditFirstName={setEditFirstName} setEditLastName={setEditLastName}
            setEditPhone={setEditPhone} setEditPassword={setEditPassword}
            onStartEdit={startEdit} onUpdateAdmin={handleUpdateAdmin}
            onDeleteAdmin={handleDeleteAdmin} onCloseEdit={() => setEditingAdmin(null)}
            showPasswords={showPasswords} setShowPasswords={setShowPasswords}
          />
        )}
        {activeTab === 'messages' && (
          <MessagesTab onUnreadCountChange={setUnreadCount} />
        )}
        {activeTab === 'government' && governmentsError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
            {t('platform.loadError', { defaultValue: "Ma'lumotlarni yuklashda xatolik" })}
            <button onClick={() => refreshGovernments().catch(() => {})} className="ml-3 underline font-medium">
              {t('warnings.retry', { defaultValue: 'Qayta urinish' })}
            </button>
          </div>
        )}
        {activeTab === 'government' && (
          <GovernmentTab
            governments={governments}
            loadingGovernments={loadingGovernments}
            regions={regions}
            loadingRegions={loadingRegions}
            govType={govType}
            isRepublic={isRepublic}
            govRegionId={govRegionId}
            onCreateGovernment={handleCreateGovernment}
            onDeleteGovernment={handleDeleteGovernment}
            onResetPassword={handleResetPassword}
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
