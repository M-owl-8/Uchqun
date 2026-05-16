import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import * as cache from '../../../shared/utils/cache';
import { useToast } from '@shared/context/ToastContext';
import { useTranslation } from 'react-i18next';
import {
  Plus, Search, ChevronDown, ChevronRight, ChevronLeft, SearchX,
  SlidersHorizontal, Download, Edit2, Trash2,
} from 'lucide-react';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import ReceptionFormModal from './reception/ReceptionFormModal';
import ReceptionDetailPanel from './reception/ReceptionDetailPanel';

const EMPTY_CREATE_FORM = { email: '', password: '', firstName: '', lastName: '', phone: '' };
const EMPTY_EDIT_FORM   = { email: '', firstName: '', lastName: '', phone: '', password: '' };
const PAGE_SIZE = 15;

const getInitials = (r) =>
  `${r.firstName?.[0] ?? ''}${r.lastName?.[0] ?? ''}`.toUpperCase();

const DocsBadge = ({ reception, t }) => {
  const docs = reception.documents ?? [];
  const total = docs.length;
  if (total === 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-sm bg-warm-50 text-warm-600 border border-warm-200">
        {t('receptionsPage.docsNone', { defaultValue: 'Hujjat yo\'q' })}
      </span>
    );
  }
  const approved = docs.filter(d => d.status === 'approved').length;
  const rejected = docs.filter(d => d.status === 'rejected').length;
  if (rejected > 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-sm bg-error-50 text-error-700 border border-error-100">
        {rejected} / {total} {t('receptionsPage.docsRejected', { defaultValue: 'rad etilgan' })}
      </span>
    );
  }
  if (approved === total) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-sm bg-success-50 text-success-700 border border-success-100">
        {approved} / {total} {t('receptionsPage.docsApproved', { defaultValue: 'tasdiqlangan' })}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-sm bg-warning-50 text-warning-700 border border-warning-100">
      {approved} / {total} {t('receptionsPage.docsPending', { defaultValue: 'ko\'rib chiqilmoqda' })}
    </span>
  );
};

const StatusBadge = ({ reception, t }) => {
  if (reception.isActive && reception.documentsApproved) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-sm bg-success-50 text-success-700 border border-success-100">
        <span className="w-1.5 h-1.5 rounded-full bg-success-600 mr-1.5" />
        {t('receptionsPage.status.active')}
      </span>
    );
  }
  if (reception.isVerified && !reception.documentsApproved) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-sm bg-warning-50 text-warning-700 border border-warning-100">
        <span className="w-1.5 h-1.5 rounded-full bg-warning-600 mr-1.5" />
        {t('receptionsPage.status.pending')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-sm bg-info-50 text-info-700 border border-info-100">
      <span className="w-1.5 h-1.5 rounded-full bg-info-600 mr-1.5" />
      {t('receptionsPage.status.inactive')}
    </span>
  );
};

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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const { success, error: showError } = useToast();
  const { t } = useTranslation();

  const selectedReceptionRef = useRef(selectedReception);
  selectedReceptionRef.current = selectedReception;

  const applyReceptions = useCallback((data) => {
    cache.set('admin:receptions', data);
    setReceptions(data);
    const current = selectedReceptionRef.current;
    if (current) {
      const updated = data.find(r => r.id === current.id);
      if (updated) setSelectedReception(updated);
      else { setSelectedReception(null); setDocuments([]); }
    }
  }, []);

  const fetchReceptions = useCallback(async (showLoadingState = false, bust = false) => {
    const CACHE_KEY = 'admin:receptions';
    const cached = !bust && cache.get(CACHE_KEY);
    if (cached) {
      applyReceptions(cached);
      if (showLoadingState) setLoading(false);
      api.get('/admin/receptions').then(res => applyReceptions(res.data.data || [])).catch(() => {});
      return;
    }
    try {
      if (showLoadingState) setLoading(true);
      const res = await api.get('/admin/receptions');
      applyReceptions(res.data.data || []);
    } catch {
      showError(t('receptionsPage.loadError'));
    } finally {
      if (showLoadingState) setLoading(false);
    }
  }, [applyReceptions, showError, t]);

  useEffect(() => { fetchReceptions(true); }, [fetchReceptions]);

  const fetchReceptionDocuments = async (receptionId) => {
    try {
      const res = await api.get(`/admin/receptions/${receptionId}/documents`);
      setDocuments(res.data.data || []);
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
      const res = await api.get(`/admin/receptions/${selectedReception.id}`);
      if (res.data?.data) {
        const updated = res.data.data;
        setDocuments(updated.documents || []);
        setReceptions(prev => prev.map(r => r.id === selectedReception.id ? updated : r));
        setSelectedReception(updated);
      }
    } catch (err) {
      showError(err.response?.data?.error || t('receptionsPage.docsLoadError'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectDocument = async (documentId, reason) => {
    if (!reason?.trim()) { showError(t('receptionsPage.reasonRequired')); return; }
    try {
      setActionLoading(true);
      await api.put(`/admin/documents/${documentId}/reject`, { rejectionReason: reason });
      success(t('receptionsPage.rejectSuccess'));
      const res = await api.get(`/admin/receptions/${selectedReception.id}`);
      if (res.data?.data) {
        const updated = res.data.data;
        setDocuments(updated.documents || []);
        setReceptions(prev => prev.map(r => r.id === selectedReception.id ? updated : r));
        setSelectedReception(updated);
      }
    } catch (err) {
      showError(err.response?.data?.error || t('receptionsPage.docsLoadError'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivateReception = async (receptionId) => {
    try {
      setActionLoading(true);
      const res = await api.put(`/admin/receptions/${receptionId}/activate`);
      success(t('receptionsPage.activateSuccess') || t('receptionsPage.updateSuccess'));
      if (res.data?.data) {
        const updated = res.data.data;
        setReceptions(prev => prev.map(r => r.id === receptionId ? updated : r));
        if (selectedReception?.id === receptionId) setSelectedReception(updated);
      } else {
        await fetchReceptions();
      }
    } catch (err) {
      showError(err.response?.data?.error || t('receptionsPage.loadError'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivateReception = async (receptionId) => {
    try {
      setActionLoading(true);
      const res = await api.put(`/admin/receptions/${receptionId}/deactivate`);
      success(t('receptionsPage.deactivateSuccess') || t('receptionsPage.updateSuccess'));
      if (res.data?.data) {
        const updated = res.data.data;
        setReceptions(prev => prev.map(r => r.id === receptionId ? updated : r));
        if (selectedReception?.id === receptionId) setSelectedReception(updated);
      } else {
        await fetchReceptions();
      }
    } catch (err) {
      showError(err.response?.data?.error || t('receptionsPage.loadError'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateReception = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await api.post('/admin/receptions', createFormData);
      const newReception = res.data?.data;
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
    } catch (err) {
      showError(err.response?.data?.error || t('receptionsPage.loadError'));
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
      const res = await api.put(`/admin/receptions/${editingReception.id}`, updateData);
      const updatedReception = res.data?.data;
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
    } catch (err) {
      showError(err.response?.data?.error || t('receptionsPage.loadError'));
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
          if (selectedReception?.id === receptionId) { setSelectedReception(null); setDocuments([]); }
          success(t('receptionsPage.deleteSuccess'));
        } catch (err) {
          showError(err.response?.data?.error || t('receptionsPage.loadError'));
          await fetchReceptions(false, true);
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const filtered = receptions.filter(r => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.phone?.includes(q);
    const matchesStatus =
      statusFilter === 'all' ? true :
      statusFilter === 'active' ? (r.isActive && r.documentsApproved) :
      statusFilter === 'pending' ? (r.isVerified && !r.documentsApproved) :
      statusFilter === 'inactive' ? !r.isActive : true;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const allPageSelected = pageRows.length > 0 && pageRows.every(r => selectedIds.has(r.id));
  const toggleAll = () => {
    if (allPageSelected) {
      setSelectedIds(prev => { const next = new Set(prev); pageRows.forEach(r => next.delete(r.id)); return next; });
    } else {
      setSelectedIds(prev => { const next = new Set(prev); pageRows.forEach(r => next.add(r.id)); return next; });
    }
  };
  const toggleRow = (id) => {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Intl.DateTimeFormat('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="page-fade-in space-y-6">
        <div className="letterhead pt-4">
          <div className="skel h-3 w-24 mb-2" />
          <div className="skel h-8 w-72" />
        </div>
        <div className="bg-surface border border-warm-200 rounded-lg shadow-xs p-6 space-y-3">
          {[...Array(6)].map((_, i) => <div key={i} className="skel h-10 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="page-fade-in space-y-6">
      {/* Header */}
      <div className="letterhead pt-4 flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-brand-700">
            {t('receptionsPage.eyebrow', { defaultValue: 'Xodimlar' })}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-warm-900">
            {t('receptionsPage.title')}{' '}
            <span className="text-xl font-medium text-warm-500 num">· {receptions.length}</span>
          </h1>
          <p className="text-sm text-warm-600 mt-1">{t('receptionsPage.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 h-10 px-4 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-walnut-text rounded-md shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          {t('receptionsPage.create')}
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[280px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400" strokeWidth={1.75} />
          <input
            type="search"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder={t('receptionsPage.searchPlaceholder', { defaultValue: 'Ism, email yoki telefon...' })}
            className="w-full h-10 pl-9 pr-3.5 text-sm bg-surface border border-warm-300 rounded-md text-warm-900 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="h-10 pl-3.5 pr-9 text-sm bg-surface border border-warm-300 rounded-md text-warm-900 appearance-none focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600"
          >
            <option value="all">{t('receptionsPage.filterAll', { defaultValue: 'Hammasi' })} · {receptions.length}</option>
            <option value="active">{t('receptionsPage.status.active')} · {receptions.filter(r => r.isActive && r.documentsApproved).length}</option>
            <option value="pending">{t('receptionsPage.status.pending')} · {receptions.filter(r => r.isVerified && !r.documentsApproved).length}</option>
            <option value="inactive">{t('receptionsPage.status.inactive')} · {receptions.filter(r => !r.isActive).length}</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-500 pointer-events-none" strokeWidth={1.75} />
        </div>
        <button className="inline-flex items-center gap-1.5 h-10 px-3 text-sm font-medium text-warm-700 bg-surface border border-warm-300 hover:bg-warm-50 rounded-md transition-colors">
          <SlidersHorizontal className="w-4 h-4" strokeWidth={1.75} />
          {t('receptionsPage.filter', { defaultValue: 'Filtr' })}
        </button>
        <button className="inline-flex items-center gap-1.5 h-10 px-3 text-sm font-medium text-warm-700 hover:bg-warm-100 rounded-md transition-colors">
          <Download className="w-4 h-4" strokeWidth={1.75} />
          {t('receptionsPage.export', { defaultValue: 'Eksport' })}
        </button>
      </div>

      {/* Main content */}
      <div className={selectedReception ? 'grid grid-cols-1 xl:grid-cols-3 gap-6 items-start' : ''}>
        {/* Table */}
        <div className={selectedReception ? 'xl:col-span-2' : ''}>
          <div className="bg-surface border border-warm-200 rounded-lg shadow-xs overflow-hidden">
            {filtered.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-warm-100 flex items-center justify-center mb-3">
                  <SearchX className="w-7 h-7 text-warm-400" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-semibold text-warm-900">
                  {search
                    ? t('receptionsPage.noResults', { query: search, defaultValue: `"${search}" so'roviga mos xodim topilmadi` })
                    : t('receptionsPage.emptyList')}
                </p>
                <p className="text-sm text-warm-500 mt-1">
                  {t('receptionsPage.noResultsHint', { defaultValue: 'Filtrlarni o\'zgartiring yoki yangi xodim qo\'shing.' })}
                </p>
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="mt-4 inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium bg-surface border border-warm-300 hover:bg-warm-50 text-warm-800 rounded-md"
                  >
                    {t('receptionsPage.clearFilters', { defaultValue: 'Filtrlarni tozalash' })}
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-warm-50 border-b border-warm-200">
                      <tr>
                        <th className="colhead text-left px-5 py-3">
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={allPageSelected}
                              onChange={toggleAll}
                              className="w-3.5 h-3.5 rounded-sm border-warm-300 accent-brand-600"
                            />
                            <span>{t('receptionsPage.colName', { defaultValue: 'Ism & familiya' })}</span>
                          </label>
                        </th>
                        <th className="colhead text-left px-5 py-3">{t('receptionsPage.colEmail', { defaultValue: 'Email' })}</th>
                        <th className="colhead text-left px-5 py-3">{t('receptionsPage.colPhone', { defaultValue: 'Telefon' })}</th>
                        <th className="colhead text-left px-5 py-3">{t('receptionsPage.colDocs', { defaultValue: 'Hujjatlar' })}</th>
                        <th className="colhead text-left px-5 py-3">{t('receptionsPage.colStatus', { defaultValue: 'Holat' })}</th>
                        <th className="colhead text-right px-5 py-3 num">{t('receptionsPage.colCreated', { defaultValue: 'Ro\'yxatga olingan' })}</th>
                        <th className="colhead text-right px-5 py-3 w-24" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-warm-100 text-warm-800">
                      {pageRows.map(r => (
                        <tr
                          key={r.id}
                          className={`hover:bg-warm-50/60 h-12 ${selectedReception?.id === r.id ? 'bg-brand-50/40' : ''}`}
                        >
                          <td className="px-5">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(r.id)}
                                onChange={() => toggleRow(r.id)}
                                className="w-3.5 h-3.5 rounded-sm border-warm-300 accent-brand-600"
                                onClick={e => e.stopPropagation()}
                              />
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${r.isActive && r.documentsApproved ? 'bg-brand-100 text-brand-800' : 'bg-warm-100 text-warm-700'}`}>
                                {getInitials(r)}
                              </div>
                              <span className="font-medium">{r.firstName} {r.lastName}</span>
                            </label>
                          </td>
                          <td className="px-5 text-warm-600 num">{r.email}</td>
                          <td className="px-5 text-warm-600 num">{r.phone || '—'}</td>
                          <td className="px-5"><DocsBadge reception={r} t={t} /></td>
                          <td className="px-5"><StatusBadge reception={r} t={t} /></td>
                          <td className="px-5 text-right text-warm-600 num">{formatDate(r.createdAt)}</td>
                          <td className="px-5 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEditReception(r); }}
                                className="p-1.5 text-warm-500 hover:text-warm-900 hover:bg-warm-100 rounded-md transition-colors"
                                title={t('receptionsPage.editAction', { defaultValue: 'Tahrirlash' })}
                              >
                                <Edit2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteReception(r.id); }}
                                className="p-1.5 text-warm-500 hover:text-error-700 hover:bg-error-50 rounded-md transition-colors"
                                title={t('receptionsPage.deleteAction', { defaultValue: 'O\'chirish' })}
                              >
                                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                              </button>
                              <button
                                onClick={() => handleViewReception(r)}
                                aria-label={t('receptionsPage.viewAction', { defaultValue: 'Tafsilotlar' })}
                                className="p-1.5 text-warm-500 hover:text-warm-900 hover:bg-warm-100 rounded-md transition-colors"
                              >
                                <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-warm-200 bg-cream/50">
                  <p className="text-xs text-warm-500 num">
                    {t('receptionsPage.showing', {
                      defaultValue: `Ko'rsatilmoqda {{from}}–{{to}} / jami {{total}} xodim`,
                      from: (safePage - 1) * PAGE_SIZE + 1,
                      to: Math.min(safePage * PAGE_SIZE, filtered.length),
                      total: filtered.length,
                    })}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      className="inline-flex items-center justify-center w-8 h-8 text-warm-500 hover:bg-warm-100 rounded-md disabled:opacity-40 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" strokeWidth={1.75} />
                    </button>
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPage(i + 1)}
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-md text-sm font-medium num transition-colors ${
                          safePage === i + 1
                            ? 'bg-brand-600 text-walnut-text'
                            : 'text-warm-500 hover:bg-warm-100'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      className="inline-flex items-center justify-center w-8 h-8 text-warm-500 hover:bg-warm-100 rounded-md disabled:opacity-40 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Detail panel */}
        {selectedReception && (
          <div className="xl:col-span-1">
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
              onClose={() => { setSelectedReception(null); setDocuments([]); }}
            />
          </div>
        )}
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
