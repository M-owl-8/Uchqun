import { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';
import { 
  Shield,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Plus,
  X,
  Edit2,
  Trash2
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmDialog from '../components/ConfirmDialog';

const ReceptionManagement = () => {
  const [receptions, setReceptions] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [selectedReception, setSelectedReception] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReception, setEditingReception] = useState(null);
  const [createFormData, setCreateFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [editFormData, setEditFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    create: false,
    edit: false,
  });
  const { success, error: showError } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    fetchReceptions(true); // Show loading on initial load
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchReceptions = async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const response = await api.get('/admin/receptions');
      const receptionsData = response.data.data || [];
      setReceptions(receptionsData);
      
      // Update selected reception if it still exists
      if (selectedReception) {
        const updated = receptionsData.find(r => r.id === selectedReception.id);
        if (updated) {
          setSelectedReception(updated);
        } else {
          // Selected reception was deleted, clear selection
          setSelectedReception(null);
          setDocuments([]);
        }
      }
    } catch (error) {
      showError(t('receptionsPage.loadError'));
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const fetchReceptionDocuments = async (receptionId) => {
    try {
      const response = await api.get(`/admin/receptions/${receptionId}/documents`);
      setDocuments(response.data.data || []);
    } catch (error) {
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

      // Single call — getReceptionById already JOINs documents
      const receptionResponse = await api.get(`/admin/receptions/${selectedReception.id}`);
      if (receptionResponse.data?.data) {
        const updated = receptionResponse.data.data;
        setDocuments(updated.documents || []);
        setReceptions(prevReceptions =>
          prevReceptions.map(r => r.id === selectedReception.id ? updated : r)
        );
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

      // Single call — getReceptionById already JOINs documents
      const receptionResponse = await api.get(`/admin/receptions/${selectedReception.id}`);
      if (receptionResponse.data?.data) {
        const updated = receptionResponse.data.data;
        setDocuments(updated.documents || []);
        setReceptions(prevReceptions =>
          prevReceptions.map(r => r.id === selectedReception.id ? updated : r)
        );
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
      
      // Update reception in list without full refresh
      if (response.data?.data) {
        const updated = response.data.data;
        setReceptions(prevReceptions =>
          prevReceptions.map(r => r.id === receptionId ? updated : r)
        );
        if (selectedReception?.id === receptionId) {
          setSelectedReception(updated);
        }
      } else {
        // Fallback: refresh if response doesn't include data
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
      
      // Update reception in list without full refresh
      if (response.data?.data) {
        const updated = response.data.data;
        setReceptions(prevReceptions =>
          prevReceptions.map(r => r.id === receptionId ? updated : r)
        );
        if (selectedReception?.id === receptionId) {
          setSelectedReception(updated);
        }
      } else {
        // Fallback: refresh if response doesn't include data
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
      
      // Get new reception data from response
      const newReception = response.data?.data;
      
      success(t('receptionsPage.createSuccess'));
      setShowCreateModal(false);
      setCreateFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
      });
      
      // Add the new reception to the list without full refresh
      if (newReception) {
        setReceptions(prevReceptions => [newReception, ...prevReceptions]);
        // Optionally select the newly created reception
        setSelectedReception(newReception);
        // Documents will be empty for new reception, so no need to fetch
        setDocuments([]);
      } else {
        // Fallback: refresh the entire list if response doesn't include data
        await fetchReceptions();
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
      if (!updateData.password) {
        delete updateData.password; // Don't send empty password
      }
      const response = await api.put(`/admin/receptions/${editingReception.id}`, updateData);
      
      // Get updated reception data from response
      const updatedReception = response.data?.data;
      
      success(t('receptionsPage.updateSuccess'));
      setShowEditModal(false);
      setEditingReception(null);
      
      // Update the receptions list with the updated reception
      if (updatedReception) {
        setReceptions(prevReceptions => 
          prevReceptions.map(r => r.id === updatedReception.id ? updatedReception : r)
        );
        
        // Update selected reception if it's the one being edited
        if (selectedReception?.id === updatedReception.id) {
          setSelectedReception(updatedReception);
          // Only refresh documents if needed
          if (selectedReception.documents) {
            await fetchReceptionDocuments(updatedReception.id);
          }
        }
      } else {
        // Fallback: refresh the entire list if response doesn't include data
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
          setReceptions(prevReceptions => prevReceptions.filter(r => r.id !== receptionId));
          if (selectedReception?.id === receptionId) {
            setSelectedReception(null);
            setDocuments([]);
          }
          success(t('receptionsPage.deleteSuccess'));
        } catch (error) {
          showError(error.response?.data?.error || t('receptionsPage.loadError'));
          await fetchReceptions();
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

  const getDocumentStatusBadge = (document) => {
    if (document.status === 'approved') {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
          {t('receptionsPage.docStatus.approved')}
        </span>
      );
    } else if (document.status === 'rejected') {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
          {t('receptionsPage.docStatus.rejected')}
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
          {t('receptionsPage.docStatus.pending')}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditReception(reception);
                        }}
                        className="p-1.5 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        title="Edit Reception"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteReception(reception.id);
                        }}
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

        {/* Document Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {selectedReception ? (
            <>
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {selectedReception.firstName} {selectedReception.lastName}
                    </h2>
                    <p className="text-sm text-gray-600">{selectedReception.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditReception(selectedReception)}
                      disabled={actionLoading}
                      className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                    >
                      <Edit2 className="inline w-4 h-4 mr-1" />
                      {t('receptionsPage.editBtn')}
                    </button>
                    <button
                      onClick={() => handleDeleteReception(selectedReception.id)}
                      disabled={actionLoading}
                      className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50"
                    >
                      <Trash2 className="inline w-4 h-4 mr-1" />
                      {t('receptionsPage.deleteBtn')}
                    </button>
                    {selectedReception.isActive ? (
                      <button
                        onClick={() => handleDeactivateReception(selectedReception.id)}
                        disabled={actionLoading}
                        className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50"
                      >
                        <UserX className="inline w-4 h-4 mr-1" />
                        {t('receptionsPage.deactivate')}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivateReception(selectedReception.id)}
                        disabled={actionLoading}
                        className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50"
                      >
                        <UserCheck className="inline w-4 h-4 mr-1" />
                        {t('receptionsPage.activate')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-4">{t('receptionsPage.documents')}</h3>
                {documents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>{t('receptionsPage.noDocuments')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {documents.map((document) => (
                      <div
                        key={document.id}
                        className="p-4 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <FileText className="w-5 h-5 text-gray-400" />
                              <span className="font-medium text-gray-900">
                                {document.fileName}
                              </span>
                              {getDocumentStatusBadge(document)}
                            </div>
                            <p className="text-sm text-gray-600">
                              {t('receptionsPage.docType')}: {document.documentType}
                            </p>
                            {document.rejectionReason && (
                              <p className="text-sm text-red-600 mt-1">
                                {t('receptionsPage.rejectionReason')}: {document.rejectionReason}
                              </p>
                            )}
                          </div>
                        </div>
                        {document.status === 'pending' && (
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handleApproveDocument(document.id)}
                              disabled={actionLoading}
                              className="flex-1 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                              <CheckCircle className="inline w-4 h-4 mr-1" />
                              {t('receptionsPage.approve')}
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt(t('receptionsPage.rejectionPrompt'));
                                if (reason) {
                                  handleRejectDocument(document.id, reason);
                                }
                              }}
                              disabled={actionLoading}
                              className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                              <XCircle className="inline w-4 h-4 mr-1" />
                              {t('receptionsPage.reject')}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>{t('receptionsPage.selectPrompt')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Reception Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{t('receptionsPage.createModalTitle')}</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateReception} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('receptionsPage.firstName')} *
                </label>
                <input
                  type="text"
                  required
                  value={createFormData.firstName}
                  onChange={(e) => setCreateFormData({ ...createFormData, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('receptionsPage.lastName')} *
                </label>
                <input
                  type="text"
                  required
                  value={createFormData.lastName}
                  onChange={(e) => setCreateFormData({ ...createFormData, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('receptionsPage.email')} *
                </label>
                <input
                  type="email"
                  required
                  value={createFormData.email}
                  onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('receptionsPage.password')} *
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.create ? 'text' : 'password'}
                    required
                    value={createFormData.password}
                    onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, create: !showPasswords.create })}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                  >
                    {showPasswords.create ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('receptionsPage.phone')}
                </label>
                <input
                  type="tel"
                  value={createFormData.phone}
                  onChange={(e) => setCreateFormData({ ...createFormData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  {t('receptionsPage.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {actionLoading ? t('receptionsPage.createSubmitting') : t('receptionsPage.createSubmit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Reception Modal */}
      {showEditModal && editingReception && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{t('receptionsPage.editModalTitle')}</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingReception(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateReception} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('receptionsPage.firstName')} *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.firstName}
                  onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('receptionsPage.lastName')} *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.lastName}
                  onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('receptionsPage.email')} *
                </label>
                <input
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('receptionsPage.newPassword')}
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.edit ? 'text' : 'password'}
                    value={editFormData.password}
                    onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, edit: !showPasswords.edit })}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                  >
                    {showPasswords.edit ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('receptionsPage.phone')}
                </label>
                <input
                  type="tel"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingReception(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  {t('receptionsPage.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {actionLoading ? t('receptionsPage.updateSubmitting') : t('receptionsPage.updateSubmit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmDialog dialog={confirmDialog} onCancel={() => setConfirmDialog(null)} />
    </div>
  );
};

export default ReceptionManagement;

