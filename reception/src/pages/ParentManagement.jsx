import { useCallback, useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import Card from '../components/Card';
import { SkeletonList } from '../../../shared/components/Skeleton';
import * as cache from '../../../shared/utils/cache';
import { useToast } from '../context/ToastContext';
import { Users, Plus, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ParentCard from './parents/ParentCard';
import ParentFormModal from './parents/ParentFormModal';
import ChildFormModal from './parents/ChildFormModal';

const ParentManagement = () => {
  const [parents, setParents] = useState(() => cache.get('reception:parents') || []);
  const [teachers, setTeachers] = useState(() => cache.get('reception:teachers') || []);
  const [groups, setGroups] = useState(() => cache.get('reception:groups') || []);
  const [loading, setLoading] = useState(!cache.get('reception:parents'));
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showChildModal, setShowChildModal] = useState(false);
  const [showEditChildModal, setShowEditChildModal] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState(null);
  const [selectedChild, setSelectedChild] = useState(null);
  const [editingParent, setEditingParent] = useState(null);
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
  const [confirmDialog, setConfirmDialog] = useState(null);
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
    const signal = controller.signal;

    const fetchFresh = () => api.get('/reception/parents', { signal })
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
    setEditingParent(null);
    setFormData({
      firstName: '', lastName: '', email: '', phone: '', password: '',
      teacherId: '', groupId: '',
      child: { firstName: '', lastName: '', dateOfBirth: '', gender: 'Male', disabilityType: '', specialNeeds: '', school: 'Uchqun School', photo: null },
    });
    setShowModal(true);
  };

  const handleEdit = (parent) => {
    setEditingParent(parent);
    setFormData({
      firstName: parent.firstName || '',
      lastName: parent.lastName || '',
      email: parent.email || '',
      phone: parent.phone || '',
      password: '',
      teacherId: parent.teacherId || '',
      groupId: parent.groupId || '',
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
      firstName: child.firstName || '',
      lastName: child.lastName || '',
      dateOfBirth: child.dateOfBirth ? child.dateOfBirth.split('T')[0] : '',
      gender: child.gender || 'Male',
      disabilityType: child.disabilityType || '',
      specialNeeds: child.specialNeeds || '',
      photo: null,
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
    setChildFormData({
      firstName: '', lastName: '', dateOfBirth: '', gender: 'Male',
      disabilityType: '', specialNeeds: '', school: 'Uchqun School',
      photo: null, photoPreview: null,
    });
    setShowChildModal(true);
  };

  const handleSubmitChild = async (e) => {
    e.preventDefault();
    if (!selectedParentId) { showError(t('parentsPage.parentIdMissing')); return; }
    if (!childFormData.firstName || !childFormData.lastName || !childFormData.dateOfBirth || !childFormData.disabilityType) {
      showError(t('parentsPage.childRequiredFields'));
      return;
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
      showError(t('parentsPage.childRequiredFields'));
      return;
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
      showError(t('parentsPage.form.groupRequiredError') || 'Guruh tanlash majburiy');
      return;
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

  const filteredParents = useMemo(() => parents.filter((parent) => {
    const query = searchQuery.toLowerCase();
    return (
      parent.firstName?.toLowerCase().includes(query) ||
      parent.lastName?.toLowerCase().includes(query) ||
      parent.email?.toLowerCase().includes(query) ||
      parent.phone?.toLowerCase().includes(query)
    );
  }), [parents, searchQuery]);

  if (loading) return <SkeletonList items={8} />;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">{t('parentsPage.title')}</h1>
          <p className="text-gray-500 font-medium mt-1">{t('parentsPage.subtitle')}</p>
        </div>

        <div className="flex gap-3">
          <form role="search" aria-label={t('parentsPage.search')} className="relative flex-1 md:flex-initial">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
            <input
              type="text"
              placeholder={t('parentsPage.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label={t('parentsPage.search')}
              className="pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full md:w-64"
            />
          </form>

          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">{t('parentsPage.add')}</span>
          </button>
        </div>
      </div>

      {filteredParents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredParents.map((parent) => (
            <ParentCard
              key={parent.id}
              parent={parent}
              onAddChild={handleAddChild}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onEditChild={handleEditChild}
              onDeleteChild={handleDeleteChild}
            />
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 font-medium text-lg">
            {searchQuery ? t('parentsPage.noParentsFound') : t('parentsPage.noParents')}
          </p>
          {!searchQuery && (
            <button
              onClick={handleCreate}
              className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add First Parent
            </button>
          )}
        </Card>
      )}

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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <p className="text-gray-800 mb-6">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                {t('common.confirm', { defaultValue: 'Confirm' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentManagement;
