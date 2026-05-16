import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import Card from '@shared/components/Card';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { useToast } from '@shared/context/ToastContext';
import { 
  Users,
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  Save
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ConfirmDialog from '@shared/components/ConfirmDialog';

const GroupManagement = () => {
  const [groups, setGroups] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    teacherId: '',
    capacity: 20,
    ageRange: '',
  });
  const { success, error: showError } = useToast();
  const { t } = useTranslation();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const teachersRes = await api.get('/reception/teachers').catch(() => ({ data: { data: [] } }));
      setTeachers(Array.isArray(teachersRes.data.data) ? teachersRes.data.data : []);
      const groupsRes = await api.get('/groups').catch(() => ({ data: { groups: [] } }));
      setGroups(Array.isArray(groupsRes.data.groups) ? groupsRes.data.groups : []);
    } catch (error) {
      showError(error.response?.data?.error || t('groupsPage.toastLoadError'));
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [showError, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = () => {
    setEditingGroup(null);
    setFormData({
      name: '',
      description: '',
      teacherId: teachers.length > 0 ? teachers[0].id : '',
      capacity: 20,
      ageRange: '',
    });
    setShowModal(true);
  };

  const handleEdit = (group) => {
    setEditingGroup(group);
    const capacity = group.capacity && !isNaN(group.capacity) ? parseInt(group.capacity, 10) : 20;
    setFormData({
      name: group.name || '',
      description: group.description || '',
      teacherId: group.teacherId || group.teacherIds?.[0] || '',
      capacity: capacity,
      ageRange: group.ageRange || '',
    });
    setShowModal(true);
  };

  const handleDelete = (groupId) => {
    setConfirmDialog({
      message: t('groupsPage.confirmDelete'),
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/groups/${groupId}`);
          success(t('groupsPage.toastDelete'));
          loadData();
        } catch (error) {
          showError(error.response?.data?.error || t('groupsPage.toastDeleteError'));
        }
      },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.teacherId) {
      showError(t('groupsPage.form.selectTeacher'));
      return;
    }
    
    try {
      if (editingGroup) {
        await api.put(`/groups/${editingGroup.id}`, formData);
        success(t('groupsPage.toastUpdate'));
      } else {
        await api.post('/groups', formData);
        success(t('groupsPage.toastCreate'));
      }
      
      setShowModal(false);
      loadData();
    } catch (error) {
      showError(error.response?.data?.error || t('groupsPage.toastSaveError'));
    }
  };

  const filteredGroups = groups.filter((group) => {
    const query = searchQuery.toLowerCase();
    return group.name?.toLowerCase().includes(query) ||
           group.description?.toLowerCase().includes(query);
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">{t('groupsPage.title')}</h1>
          <p className="text-slate-500 font-medium mt-1">{t('groupsPage.subtitle')}</p>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder={t('groupsPage.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-3 bg-surface border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent w-full md:w-64"
            />
          </div>

          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">{t('groupsPage.add')}</span>
          </button>
        </div>
      </div>

      {filteredGroups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((group) => {
            const groupTeacher = group.teacher || teachers.find(t => t.id === (group.teacherId || group.teacherIds?.[0]));
            return (
              <Card key={group.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{group.name}</h3>
                    {group.ageRange && (
                      <p className="text-sm text-slate-500">{t('groupsPage.form.ageRange')}: {group.ageRange}</p>
                    )}
                  </div>
                </div>

                {group.description && (
                  <p className="text-sm text-slate-600 mb-4">{group.description}</p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="text-sm text-slate-600">
                    <strong>{t('groupsPage.labels.capacity')}</strong> {group.capacity} {t('parentsPage.children', {count: group.capacity})}
                  </div>
                  {groupTeacher && (
                    <div className="text-sm text-slate-600">
                      <strong>{t('groupsPage.labels.teacher')}</strong> {groupTeacher.firstName} {groupTeacher.lastName}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleEdit(group)}
                    className="flex-1 flex items-center justify-center gap-2 px-2 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors text-sm min-w-0"
                  >
                    <Edit2 className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{t('groupsPage.buttons.edit')}</span>
                  </button>
                  <button
                    onClick={() => handleDelete(group.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-2 py-2 bg-error-50 text-error-600 rounded-lg font-medium hover:bg-error-100 transition-colors text-sm min-w-0"
                  >
                    <Trash2 className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{t('groupsPage.buttons.delete')}</span>
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Users className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400 font-medium text-lg">
            {searchQuery ? t('groupsPage.noGroupsFound') : t('groupsPage.noGroups')}
          </p>
          {!searchQuery && (
            <button
              onClick={handleCreate}
              className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              {t('groupsPage.addFirst')}
            </button>
          )}
        </Card>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-surface border-b border-slate-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingGroup ? t('groupsPage.form.update') : t('groupsPage.form.create')}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{t('groupsPage.form.name')}</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{t('groupsPage.form.description')}</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{t('groupsPage.form.capacity')}</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.capacity || ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                      setFormData({ ...formData, capacity: isNaN(value) ? '' : value });
                    }}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
                <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{t('groupsPage.form.ageRange')}</label>
                  <input
                    type="text"
                    value={formData.ageRange}
                    onChange={(e) => setFormData({ ...formData, ageRange: e.target.value })}
                    placeholder={t('groupsPage.form.ageRange')}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('groupsPage.form.teacher')} <span className="text-error-500">*</span>
                </label>
                <select
                  required
                  value={formData.teacherId}
                  onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                >
                  <option value="">{t('groupsPage.form.teacher')}</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.firstName} {teacher.lastName}
                    </option>
                  ))}
                </select>
                {teachers.length === 0 && (
                  <p className="text-sm text-slate-500 mt-2">{t('teachersPage.noTeachers')}</p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                >
                  {t('groupsPage.form.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {editingGroup ? t('groupsPage.form.update') : t('groupsPage.form.create')}
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

export default GroupManagement;

