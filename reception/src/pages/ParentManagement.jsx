import { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { SkeletonList } from '../../../shared/components/Skeleton';
import * as cache from '../../../shared/utils/cache';
import { useToast } from '@shared/context/ToastContext';
import {
  Users, Plus, Search, ChevronLeft, ChevronRight,
  MoreHorizontal, CheckCircle, Download, Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ParentFormModal from './parents/ParentFormModal';
import ChildFormModal from './parents/ChildFormModal';
import { EmptyDesk } from '../components/motifs/EmptyDesk';

const PAGE_SIZE = 25;

const StatusBadge = ({ isActive }) => {
  if (isActive !== false) {
    return (
      <span className="inline-flex items-center h-6 px-2 rounded-sm bg-success-50 text-success-700 text-[12px] border border-success-100">
        <span className="w-1.5 h-1.5 rounded-full bg-success-500 mr-1.5" />
        Faol
      </span>
    );
  }
  return (
    <span className="inline-flex items-center h-6 px-2 rounded-sm bg-warning-50 text-warning-700 text-[12px] border border-warning-100">
      <span className="w-1.5 h-1.5 rounded-full bg-warning-600 mr-1.5" />
      Kutmoqda
    </span>
  );
};

const AVATAR_COLORS = [
  'bg-brand-100 text-brand-800',
  'bg-accent-100 text-accent-700',
  'bg-info-100 text-info-700',
  'bg-success-50 text-success-700',
];

function avatarColor(str) {
  let h = 0;
  for (let i = 0; i < (str || '').length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

const ParentManagement = () => {
  const navigate = useNavigate();
  const [parents, setParents] = useState(() => cache.get('reception:parents') || []);
  const [teachers, setTeachers] = useState(() => cache.get('reception:teachers') || []);
  const [groups, setGroups] = useState(() => cache.get('reception:groups') || []);
  const [loading, setLoading] = useState(!cache.get('reception:parents'));
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showChildModal, setShowChildModal] = useState(false);
  const [showEditChildModal, setShowEditChildModal] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState(null);
  const [selectedChild, setSelectedChild] = useState(null);
  const [editingParent, setEditingParent] = useState(null);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [page, setPage] = useState(1);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '', password: '',
    teacherId: '', groupId: '',
    child: { firstName: '', lastName: '', dateOfBirth: '', gender: 'Male', disabilityType: '', medicalDiagnosis: '', specialNeeds: '' },
  });
  const [childFormData, setChildFormData] = useState({
    firstName: '', lastName: '', dateOfBirth: '', gender: 'Male',
    disabilityType: '', medicalDiagnosis: '', specialNeeds: '',
    photo: null, photoPreview: null,
  });
  const { success, error: showError } = useToast();
  const { t } = useTranslation();

  const loadTeachersAndGroups = useCallback(async () => {
    const cachedT = cache.get('reception:teachers');
    const cachedG = cache.get('reception:groups');
    if (cachedT) setTeachers(cachedT);
    if (cachedG) setGroups(cachedG);
    const [teachersRes, groupsRes] = await Promise.all([
      api.get('/reception/teachers').catch(() => ({ data: { data: [] } })),
      api.get('/groups').catch(() => ({ data: { groups: [] } })),
    ]).catch(() => [{ data: { data: [] } }, { data: { groups: [] } }]);
    const t2 = Array.isArray(teachersRes.data.data) ? teachersRes.data.data : [];
    const g2 = Array.isArray(groupsRes.data.groups) ? groupsRes.data.groups : [];
    cache.set('reception:teachers', t2);
    cache.set('reception:groups', g2);
    setTeachers(t2);
    setGroups(g2);
  }, []);

  const loadParents = useCallback(async (bust = false) => {
    const CACHE_KEY = 'reception:parents';
    const controller = new AbortController();
    const fetchFresh = () => api.get('/reception/parents', { signal: controller.signal })
      .then(res => {
        const d = Array.isArray(res.data.data) ? res.data.data : [];
        cache.set(CACHE_KEY, d);
        setParents(d);
      });
    const cached = !bust && cache.get(CACHE_KEY);
    if (cached) {
      setParents(cached);
      setLoading(false);
      fetchFresh().catch(() => {});
      return;
    }
    try {
      setLoading(true);
      await fetchFresh();
    } catch (error) {
      if (error.code === 'ERR_CANCELED') return;
      showError(error.response?.data?.error || t('parentsPage.toastLoadError'));
      setParents([]);
    } finally {
      setLoading(false);
    }
  }, [showError, t]);

  useEffect(() => {
    loadParents();
    loadTeachersAndGroups();
  }, [loadParents, loadTeachersAndGroups]);

  const handleCreate = () => {
    navigate('/reception/parents/new');
  };

  const handleEdit = (parent) => {
    setEditingParent(parent);
    setFormData({
      firstName: parent.firstName || '', lastName: parent.lastName || '',
      email: parent.email || '', phone: parent.phone || '', password: '',
      teacherId: parent.teacherId || '', groupId: parent.groupId || '',
    });
    setShowModal(true);
  };

  const handleDelete = (parentId) => {
    setConfirmDialog({
      message: t('parentsPage.confirmDelete'),
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/reception/parents/${parentId}`);
          success(t('parentsPage.toastDelete'));
          loadParents(true);
        } catch (error) {
          showError(error.response?.data?.error || t('parentsPage.toastDeleteError'));
        }
      },
    });
  };

  const handleEditChild = (parentId, child) => {
    setSelectedParentId(parentId);
    setSelectedChild(child);
    setChildFormData({
      firstName: child.firstName || '', lastName: child.lastName || '',
      dateOfBirth: child.dateOfBirth ? child.dateOfBirth.split('T')[0] : '',
      gender: child.gender || 'Male', disabilityType: child.disabilityType || '',
      specialNeeds: child.specialNeeds || '', photo: null,
      photoPreview: (child.photo || child.photoUrl) || null,
    });
    setShowEditChildModal(true);
  };

  const handleDeleteChild = (parentId, childId) => {
    setConfirmDialog({
      message: t('parentsPage.confirmDeleteChild'),
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/reception/children/${childId}`);
          success(t('parentsPage.toastDeleteChild'));
          loadParents(true);
        } catch (error) {
          showError(error.response?.data?.error || t('parentsPage.toastDeleteError'));
        }
      },
    });
  };

  const handleAddChild = (parentId) => {
    setSelectedParentId(parentId);
    setSelectedChild(null);
    setChildFormData({ firstName: '', lastName: '', dateOfBirth: '', gender: 'Male', disabilityType: '', specialNeeds: '', school: 'Uchqun School', photo: null, photoPreview: null });
    setShowChildModal(true);
  };

  const handleSubmitChild = async (e) => {
    e.preventDefault();
    if (!selectedParentId) { showError(t('parentsPage.parentIdMissing')); return; }
    if (!childFormData.firstName || !childFormData.lastName || !childFormData.dateOfBirth || !childFormData.disabilityType) {
      showError(t('parentsPage.childRequiredFields')); return;
    }
    try {
      const payload = new FormData();
      payload.append('parentId', selectedParentId);
      payload.append('child[firstName]', childFormData.firstName.trim());
      payload.append('child[lastName]', childFormData.lastName.trim());
      payload.append('child[dateOfBirth]', childFormData.dateOfBirth);
      payload.append('child[gender]', childFormData.gender || 'Male');
      payload.append('child[disabilityType]', childFormData.disabilityType.trim());
      if (childFormData.medicalDiagnosis) payload.append('child[medicalDiagnosis]', childFormData.medicalDiagnosis.trim());
      if (childFormData.specialNeeds) payload.append('child[specialNeeds]', childFormData.specialNeeds.trim());
      if (childFormData.photo) payload.append('child[photo]', childFormData.photo);
      await api.post('/reception/children', payload);
      success(t('parentsPage.toastChildAdded'));
      setShowChildModal(false);
      loadParents(true);
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.message || t('parentsPage.failedAddChild');
      const details = error.response?.data?.missing ? ` - Missing: ${JSON.stringify(error.response.data.missing)}` : '';
      showError(`${msg}${details}`);
    }
  };

  const handleUpdateChild = async (e) => {
    e.preventDefault();
    if (!selectedParentId || !selectedChild?.id) { showError(t('parentsPage.parentIdMissing')); return; }
    if (!childFormData.firstName || !childFormData.lastName || !childFormData.dateOfBirth || !childFormData.disabilityType) {
      showError(t('parentsPage.childRequiredFields')); return;
    }
    try {
      const payload = new FormData();
      payload.append('parentId', selectedParentId);
      payload.append('child[firstName]', childFormData.firstName.trim());
      payload.append('child[lastName]', childFormData.lastName.trim());
      payload.append('child[dateOfBirth]', childFormData.dateOfBirth);
      payload.append('child[gender]', childFormData.gender || 'Male');
      payload.append('child[disabilityType]', childFormData.disabilityType.trim());
      if (childFormData.medicalDiagnosis) payload.append('child[medicalDiagnosis]', childFormData.medicalDiagnosis.trim());
      if (childFormData.specialNeeds) payload.append('child[specialNeeds]', childFormData.specialNeeds.trim());
      if (childFormData.photo) payload.append('child[photo]', childFormData.photo);
      await api.put(`/reception/children/${selectedChild.id}`, payload);
      success(t('parentsPage.toastChildUpdated'));
      setShowEditChildModal(false);
      loadParents(true);
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.message || t('parentsPage.failedUpdateChild');
      const details = error.response?.data?.missing ? ` - Missing: ${JSON.stringify(error.response.data.missing)}` : '';
      showError(`${msg}${details}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingParent && !formData.groupId) {
      showError(t('parentsPage.form.groupRequiredError') || 'Guruh tanlash majburiy'); return;
    }
    try {
      if (editingParent) {
        const updateData = {
          firstName: formData.firstName, lastName: formData.lastName,
          email: formData.email, phone: formData.phone,
          teacherId: formData.teacherId || null, groupId: formData.groupId || null,
        };
        if (formData.password) updateData.password = formData.password;
        await api.put(`/reception/parents/${editingParent.id}`, updateData);
        success(t('parentsPage.toastUpdate'));
      } else {
        const payload = new FormData();
        payload.append('firstName', formData.firstName);
        payload.append('lastName', formData.lastName);
        payload.append('email', formData.email);
        payload.append('phone', formData.phone);
        payload.append('password', formData.password);
        if (formData.teacherId) payload.append('teacherId', formData.teacherId);
        if (formData.groupId) payload.append('groupId', formData.groupId);
        if (formData.child?.firstName && formData.child?.lastName) {
          payload.append('child[firstName]', formData.child.firstName);
          payload.append('child[lastName]', formData.child.lastName);
          payload.append('child[dateOfBirth]', formData.child.dateOfBirth);
          payload.append('child[gender]', formData.child.gender);
          payload.append('child[disabilityType]', formData.child.disabilityType);
          if (formData.child.medicalDiagnosis) payload.append('child[medicalDiagnosis]', formData.child.medicalDiagnosis);
          if (formData.child.specialNeeds) payload.append('child[specialNeeds]', formData.child.specialNeeds);
          if (formData.child.photo) payload.append('child[photo]', formData.child.photo);
        }
        await api.post('/reception/parents', payload);
        success(t('parentsPage.toastCreate'));
      }
      setShowModal(false);
      loadParents(true);
    } catch (error) {
      showError(error.response?.data?.error || t('parentsPage.toastSaveError'));
    }
  };

  const filteredParents = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return parents.filter((parent) => {
      const matchQuery =
        parent.firstName?.toLowerCase().includes(query) ||
        parent.lastName?.toLowerCase().includes(query) ||
        parent.email?.toLowerCase().includes(query) ||
        parent.phone?.toLowerCase().includes(query);
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && parent.isActive !== false) ||
        (statusFilter === 'pending' && parent.isActive === false);
      return matchQuery && matchStatus;
    });
  }, [parents, searchQuery, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredParents.length / PAGE_SIZE);
  const paginated = filteredParents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleRow = (id) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRows.size === paginated.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginated.map((p) => p.id)));
    }
  };

  if (loading) return <SkeletonList items={8} />;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="h1-tab text-[28px] font-semibold tracking-tight text-slate-900">
            {t('parentsPage.title', { defaultValue: 'Ota-onalar' })}
            {parents.length > 0 && (
              <span className="ml-3 text-[16px] font-normal text-slate-400 num">{parents.length}</span>
            )}
          </h1>
          <p className="text-[13.5px] text-slate-500 mt-1">
            {t('parentsPage.subtitle', { defaultValue: "Barcha ro'yxatdan o'tgan ota-onalar" })}
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 h-[38px] px-4 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-[13.5px] font-medium transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          {t('parentsPage.add', { defaultValue: "Yangi ota-ona" })}
        </button>
      </header>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={2} />
          <input
            type="text"
            placeholder={t('parentsPage.search', { defaultValue: 'Qidirish…' })}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="input-ring w-full h-10 pl-10 pr-3 rounded-md border border-slate-300 bg-surface text-[13.5px] text-slate-900 focus:outline-none"
          />
        </div>

        {/* Status filter */}
        <div className="inline-flex items-center p-0.5 rounded-md border border-slate-200 bg-surface text-[13px]">
          {[
            { value: 'all', label: 'Barchasi' },
            { value: 'active', label: 'Faol' },
            { value: 'pending', label: 'Kutmoqda' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setStatusFilter(opt.value); setPage(1); }}
              className={`h-8 px-3 rounded-sm font-medium transition-colors ${
                statusFilter === opt.value ? 'bg-brand-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk action toolbar */}
      {selectedRows.size > 0 && (
        <div className="inline-flex items-center gap-1 p-1.5 rounded-md bg-teak text-teak-text shadow-md">
          <span className="text-[12.5px] px-2.5 num">{selectedRows.size} tanlangan</span>
          <span className="w-px h-5 bg-teak-divider" />
          <button className="h-7 px-2.5 rounded text-[12.5px] hover:bg-teak-hover inline-flex items-center gap-1.5 transition-colors">
            <CheckCircle className="w-3.5 h-3.5" strokeWidth={2} /> Faollashtirish
          </button>
          <button className="h-7 px-2.5 rounded text-[12.5px] hover:bg-teak-hover inline-flex items-center gap-1.5 transition-colors">
            <Download className="w-3.5 h-3.5" strokeWidth={2} /> Eksport
          </button>
          <button
            onClick={() => {
              setConfirmDialog({
                message: `${selectedRows.size} ta ota-onani o'chirishni tasdiqlaysizmi?`,
                onConfirm: async () => {
                  setConfirmDialog(null);
                  for (const id of selectedRows) {
                    try { await api.delete(`/reception/parents/${id}`); } catch {}
                  }
                  setSelectedRows(new Set());
                  loadParents(true);
                },
              });
            }}
            className="h-7 px-2.5 rounded text-[12.5px] text-error-50 hover:bg-error-700/60 inline-flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={2} /> O'chirish
          </button>
        </div>
      )}

      {/* Table */}
      {paginated.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-surface shadow-xs">
          <table className="w-full text-[13.5px]">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="w-10 px-4 py-2.5 text-left">
                  <input
                    type="checkbox"
                    className="accent-brand-600"
                    checked={selectedRows.size === paginated.length && paginated.length > 0}
                    onChange={toggleAll}
                  />
                </th>
                <th className="px-4 py-2.5 text-left font-medium">Ism</th>
                <th className="px-4 py-2.5 text-left font-medium">Telefon</th>
                <th className="px-4 py-2.5 text-left font-medium hidden md:table-cell">Email</th>
                <th className="px-4 py-2.5 text-left font-medium hidden lg:table-cell">Bola</th>
                <th className="px-4 py-2.5 text-left font-medium">Holat</th>
                <th className="px-4 py-2.5 text-right font-medium hidden md:table-cell">Qo'shilgan</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-slate-100">
              {paginated.map((parent) => {
                const initials = `${parent.firstName?.charAt(0) || ''}${parent.lastName?.charAt(0) || ''}`;
                const colClass = avatarColor(initials);
                const joined = parent.createdAt ? new Date(parent.createdAt).toLocaleDateString('uz-Latn-UZ') : '—';
                const childName = parent.children?.[0] ? `${parent.children[0].firstName}` : '—';
                return (
                  <tr key={parent.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="accent-brand-600"
                        checked={selectedRows.has(parent.id)}
                        onChange={() => toggleRow(parent.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-[11px] font-semibold ${colClass}`}>
                          {initials}
                        </div>
                        <span className="text-slate-900 font-medium">{parent.firstName} {parent.lastName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 num text-slate-700">{parent.phone || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                      {/* Fix A: plain mailto link */}
                      {parent.email ? (
                        <a href={`mailto:${parent.email}`} className="hover:text-brand-700 transition-colors">
                          {parent.email}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700 hidden lg:table-cell">{childName}</td>
                    <td className="px-4 py-3">
                      <StatusBadge isActive={parent.isActive} />
                    </td>
                    <td className="px-4 py-3 num text-slate-500 text-right hidden md:table-cell">{joined}</td>
                    <td className="px-4 py-3">
                      <div className="relative group">
                        <button className="p-1 text-slate-500 hover:text-slate-800">
                          <MoreHorizontal className="w-4 h-4" strokeWidth={2} />
                        </button>
                        {/* Action menu (simple) */}
                        <div className="hidden group-hover:block absolute right-0 top-full mt-1 w-36 rounded-md border border-slate-200 bg-surface shadow-md py-1.5 z-10 text-[13px]">
                          <button
                            onClick={() => handleEdit(parent)}
                            className="w-full px-3 py-1.5 text-left hover:bg-slate-50 text-slate-800"
                          >
                            Tahrirlash
                          </button>
                          <button
                            onClick={() => handleAddChild(parent.id)}
                            className="w-full px-3 py-1.5 text-left hover:bg-slate-50 text-slate-800"
                          >
                            Bola qo'shish
                          </button>
                          <div className="my-1 h-px bg-slate-100" />
                          <button
                            onClick={() => handleDelete(parent.id)}
                            className="w-full px-3 py-1.5 text-left hover:bg-error-50 text-error-700"
                          >
                            O'chirish
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Empty state */
        <div className="bg-surface border border-slate-200 rounded-lg shadow-xs p-12 text-center">
          <EmptyDesk size={120} className="mx-auto" />
          <h3 className="text-[18px] font-semibold text-slate-900 mt-4">Hozircha ish yo'q</h3>
          <p className="text-[13.5px] text-slate-500 mt-1 max-w-[40ch] mx-auto">
            {searchQuery
              ? `"${searchQuery}" bo'yicha natija topilmadi`
              : "Yangi ota-ona qo'shilganda bu joyda paydo bo'ladi."}
          </p>
          {!searchQuery && (
            <button
              onClick={handleCreate}
              className="mt-5 inline-flex items-center gap-2 h-9 px-4 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-[13.5px] font-medium transition-colors"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              Yangi ota-ona qo'shish
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <span className="text-[13px] text-slate-500 num">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredParents.length)} / {filteredParents.length}
          </span>
          <div className="inline-flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 rounded-md border border-slate-200 bg-surface text-slate-500 hover:bg-slate-50 inline-flex items-center justify-center disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={2} />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-md text-[13px] font-medium transition-colors ${
                    page === p ? 'bg-brand-600 text-white' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 rounded-md border border-slate-200 bg-surface text-slate-700 hover:bg-slate-50 inline-flex items-center justify-center disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <ParentFormModal
          editingParent={editingParent}
          formData={formData}
          setFormData={setFormData}
          teachers={teachers}
          groups={groups}
          onSubmit={handleSubmit}
          onClose={() => setShowModal(false)}
        />
      )}
      {showChildModal && (
        <ChildFormModal
          childFormData={childFormData}
          setChildFormData={setChildFormData}
          isEditing={false}
          onSubmit={handleSubmitChild}
          onClose={() => setShowChildModal(false)}
        />
      )}
      {showEditChildModal && (
        <ChildFormModal
          childFormData={childFormData}
          setChildFormData={setChildFormData}
          isEditing={true}
          onSubmit={handleUpdateChild}
          onClose={() => setShowEditChildModal(false)}
        />
      )}
      {confirmDialog && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-lg p-6 max-w-sm w-full shadow-xl border border-slate-200">
            <p className="text-slate-800 mb-6">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 h-9 px-4 rounded-md border border-slate-300 hover:bg-slate-50 text-slate-700 text-[13px] font-medium transition-colors"
              >
                {t('common.cancel', { defaultValue: 'Bekor qilish' })}
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="flex-1 h-9 px-4 rounded-md bg-error-600 hover:bg-error-700 text-white text-[13px] font-medium transition-colors"
              >
                {t('common.confirm', { defaultValue: 'Tasdiqlash' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentManagement;
