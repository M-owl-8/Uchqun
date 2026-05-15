import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import * as cache from '../../../shared/utils/cache';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';
import { Shield, CheckCircle, Clock, Eye, Plus, Edit2, Trash2 } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmDialog from '../components/ConfirmDialog';
import ReceptionFormModal from './reception/ReceptionFormModal';
import ReceptionDetailPanel from './reception/ReceptionDetailPanel';

const EMPTY_CREATE_FORM = { email: '', password: '', firstName: '', lastName: '', phone: '' };
const EMPTY_EDIT_FORM   = { email: '', firstName: '', lastName: '', phone: '', password: '' };

const ReceptionManagement = () => {
  const [receptions, setReceptions] = useState(() => cache.get('admin:receptions') || []);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [selectedReception, setSelectedReception] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(!cache.get('admin:receptions'));
  const [actionLoading, setActionLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReception, setEditingReception] = useState(null);
  const [createFormData, setCreateFormData] = useState(EMPTY_CREATE_FORM);
  const [editFormData, setEditFormData] = useState(EMPTY_EDIT_FORM);
  const { success, error: showError } = useToast();
  const { t } = useTranslation();

  const selectedReceptionRef = useRef(selectedReception);
  selectedReceptionRef.current = selectedReception;

  const applyReceptions = useCallback((receptionsData) => {
    cache.set('admin:receptions', receptionsData);
    setReceptions(receptionsData);
    const current = selectedReceptionRef.current;
    if (current) {
      const updated = receptionsData.find(r => r.id === current.id);
      if (updated) setSelectedReception(updated);
      else { setSelectedReception(null); setDocuments([]); }
    }
  }, []);

  const fetchReceptions = useCallback(async (showLoading = false, bust = false) => {
    const CACHE_KEY = 'admin:receptions';
    const cached = !bust && cache.get(CACHE_KEY);
    if (cached) {
      applyReceptions(cached);
      if (showLoading) setLoading(false);
      api.get('/admin/receptions')
        .then(res => applyReceptions(res.data.data || []))
        .catch(() => {});
      return;
    }
    try {
      if (showLoading) setLoading(true);
      const response = await api.get('/admin/receptions');
      applyReceptions(response.data.data || []);
    } catch {
      showError(t('receptionsPage.loadError'));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [applyReceptions, showError, t]);

  useEffect(() => {
    fetchReceptions(true);
  }, [fetchReceptions]);

  const fetchReceptionDocuments = async (receptionId) => {
    try {
      const response = await api.get(`/admin/receptions/${receptionId}/documents`);
      setDocuments(response.data.data || []);
    } catch {
      showError(t('receptionsPage.docsLoadError'));
    }
  };

  const handleViewReception = async (reception) => {
    setSelectedReception(reception);
    await fetchReceptionDocuments(reception.id);
  };

  const handleApproveDocument = async (documentId) => {
    try {
      setActionLoading(true);
      await api.put(`/admin/documents/${documentId}/approve`);
      success(t('receptionsPage.approveSuccess'));
      const receptionResponse = await api.get(`/admin/receptions/${selectedReception.id}`);
      if (receptionResponse.data?.data) {
        const updated = receptionResponse.data.data;
        setDocuments(updated.documents || []);
        setReceptions(prev => prev.map(r => r.id === selectedReception.id ? updated : r));
        setSelectedReception(updated);
      }
    } catch (error) {
      showError(error.response?.data?.error || t('receptionsPage.docsLoadError'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectDocument = async (documentId, reason) => {
    if (!reason || reason.trim() === '') {
      showError(t('receptionsPage.reasonRequired'));
      return;
    }
    try {
      setActionLoading(true);
      await api.put(`/admin/documents/${documentId}/reject`, { rejectionReason: reason });
      success(t('receptionsPage.rejectSuccess'));
      const receptionResponse = await api.get(`/admin/receptions/${selectedReception.id}`);
      if (receptionResponse.data?.data) {
        const updated = receptionResponse.data.data;
        setDocuments(updated.documents || []);
        setReceptions(prev => prev.map(r => r.id === selectedReception.id ? updated : r));
        setSelectedReception(updated);
      }
    } catch (error) {
      showError(error.response?.data?.error || t('receptionsPage.docsLoadError'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivateReception = async (receptionId) => {
    try {
      setActionLoading(true);
      const response = await api.put(`/admin/receptions/${receptionId}/activate`);
      success(t('receptionsPage.activateSuccess') || t('receptionsPage.updateSuccess'));
      if (response.data?.data) {
        const updated = response.data.data;
        setReceptions(prev => prev.map(r => r.id === receptionId ? updated : r));
        if (selectedReception?.id === receptionId) setSelectedReception(updated);
      } else {
        await fetchReceptions();
      }
    } catch (error) {
      showError(error.response?.data?.error || t('receptionsPage.loadError'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivateReception = async (receptionId) => {
    try {
      setActionLoading(true);
      const response = await api.put(`/admin/receptions/${receptionId}/deactivate`);
      success(t('receptionsPage.deactivateSuccess') || t('receptionsPage.updateSuccess'));
      if (response.data?.data) {
        const updated = response.data.data;
        setReceptions(prev => prev.map(r => r.id === receptionId ? updated : r));
        if (selectedReception?.id === receptionId) setSelectedReception(updated);
      } else {
        await fetchReceptions();
      }
    } catch (error) {
      showError(error.response?.data?.error || t('receptionsPage.loadError'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateReception = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const response = await api.post('/admin/receptions', createFormData);
      const newReception = response.data?.data;
      success(t('receptionsPage.createSuccess'));
      setShowCreateModal(false);
      setCreateFormData(EMPTY_CREATE_FORM);
      if (newReception) {
        cache.invalidate('admin:receptions');
        setReceptions(prev => [newReception, ...prev]);
        setSelectedReception(newReception);
        setDocuments([]);
      } else {
        await fetchReceptions(false, true);
      }
    } catch (error) {
      showError(error.response?.data?.error || t('receptionsPage.loadError'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditReception = (reception) => {
    setEditingReception(reception);
    setEditFormData({
      email: reception.email,
      firstName: reception.firstName,
      lastName: reception.lastName,
      phone: reception.phone || '',
      password: '',
    });
    setShowEditModal(true);
  };

  const handleUpdateReception = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const updateData = { ...editFormData };
      if (!updateData.password) delete updateData.password;
      const response = await api.put(`/admin/receptions/${editingReception.id}`, updateData);
      const updatedReception = response.data?.data;
      success(t('receptionsPage.updateSuccess'));
      setShowEditModal(false);
      setEditingReception(null);
      if (updatedReception) {
        setReceptions(prev => prev.map(r => r.id === updatedReception.id ? updatedReception : r));
        if (selectedReception?.id === updatedReception.id) {
          setSelectedReception(updatedReception);
          if (selectedReception.documents) await fetchReceptionDocuments(updatedReception.id);
        }
      } else {
        await fetchReceptions();
      }
    } catch (error) {
      showError(error.response?.data?.error || t('receptionsPage.loadError'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteReception = (receptionId) => {
    setConfirmDialog({
      message: t('receptionsPage.deleteConfirm'),
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          setActionLoading(true);
          await api.delete(`/admin/receptions/${receptionId}`);
          cache.invalidate('admin:receptions');
          setReceptions(prev => prev.filter(r => r.id !== receptionId));
          if (selectedReception?.id === receptionId) {
            setSelectedReception(null);
            setDocuments([]);
          }
          success(t('receptionsPage.deleteSuccess'));
        } catch (error) {
          showError(error.response?.data?.error || t('receptionsPage.loadError'));
          await fetchReceptions(false, true);
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const getStatusBadge = (reception) => {
    if (reception.isActive && reception.documentsApproved) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
          <CheckCircle className="inline w-3 h-3 mr-1" />
          {t('receptionsPage.status.active')}
        </span>
      );
    } else if (reception.isVerified && !reception.documentsApproved) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
          <Clock className="inline w-3 h-3 mr-1" />
          {t('receptionsPage.status.pending')}
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
          <Clock className="inline w-3 h-3 mr-1" />
          {t('receptionsPage.status.inactive')}
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('receptionsPage.title')}</h1>
          <p className="text-gray-600 mt-1">{t('receptionsPage.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          {t('receptionsPage.create')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reception List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{t('receptionsPage.listTitle')}</h2>
          </div>
          <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
            {receptions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>{t('receptionsPage.emptyList')}</p>
              </div>
            ) : (
              receptions.map((reception) => (
                <div
                  key={reception.id}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedReception?.id === reception.id
                      ? 'bg-primary-50 border-l-4 border-primary-500'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleViewReception(reception)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">
                          {reception.firstName} {reception.lastName}
                        </h3>
                        {getStatusBadge(reception)}
                      </div>
                      <p className="text-sm text-gray-600">{reception.email}</p>
                      <div className="mt-2 text-xs text-gray-500">
                        <p>{t('receptionsPage.documentsLabel', { count: reception.documents?.length || 0 })}</p>
                        <p>{t('receptionsPage.verifiedLabel', { value: reception.isVerified ? t('receptionsPage.verifiedYes') : t('receptionsPage.verifiedNo') })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditReception(reception); }}
                        className="p-1.5 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        title="Edit Reception"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteReception(reception.id); }}
                        className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete Reception"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <Eye className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <ReceptionDetailPanel
          reception={selectedReception}
          documents={documents}
          actionLoading={actionLoading}
          onEdit={handleEditReception}
          onDelete={handleDeleteReception}
          onActivate={handleActivateReception}
          onDeactivate={handleDeactivateReception}
          onApprove={handleApproveDocument}
          onReject={handleRejectDocument}
        />
      </div>

      {showCreateModal && (
        <ReceptionFormModal
          mode="create"
          formData={createFormData}
          onChange={setCreateFormData}
          onSubmit={handleCreateReception}
          onClose={() => setShowCreateModal(false)}
          loading={actionLoading}
        />
      )}

      {showEditModal && editingReception && (
        <ReceptionFormModal
          mode="edit"
          formData={editFormData}
          onChange={setEditFormData}
          onSubmit={handleUpdateReception}
          onClose={() => { setShowEditModal(false); setEditingReception(null); }}
          loading={actionLoading}
        />
      )}

      <ConfirmDialog dialog={confirmDialog} onCancel={() => setConfirmDialog(null)} />
    </div>
  );
};

export default ReceptionManagement;
