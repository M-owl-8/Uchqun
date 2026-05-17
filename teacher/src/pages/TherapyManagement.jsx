import { useCallback, useEffect, useState } from 'react';
import api from '../shared/services/api';
import * as cache from '../../../shared/utils/cache';
import LoadingSpinner from '../shared/components/LoadingSpinner';
import { useToast } from '../shared/context/ToastContext';
import { useTranslation } from 'react-i18next';
import { FileText, Music, Play, Plus, Video } from 'lucide-react';
import Card from '../shared/components/Card';
import TherapyFilters from './therapy/TherapyFilters';
import TherapyCard from './therapy/TherapyCard';
import TherapyFormModal from './therapy/TherapyFormModal';
import TherapyAssignModal from './therapy/TherapyAssignModal';

const TherapyManagement = () => {
  const [therapies, setTherapies] = useState([]);
  const [childList, setChildList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingTherapy, setEditingTherapy] = useState(null);
  const [assigningTherapy, setAssigningTherapy] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    therapyType: 'music',
    contentUrl: '',
    contentType: 'audio',
    duration: '',
    ageGroup: 'all',
    difficultyLevel: 'all',
    tags: '',
    childId: '',
  });
  const [assignFormData, setAssignFormData] = useState({
    childId: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const { success, error: showError } = useToast();
  const { t } = useTranslation();

  const buildChildList = (parents) => {
    const all = [];
    parents.forEach(p => {
      if (p.children?.length > 0) {
        p.children.forEach(c => all.push({ ...c, parentName: `${p.firstName} ${p.lastName}` }));
      }
    });
    return all;
  };

  const fetchTherapies = useCallback(async (bust = false, signal) => {
    const cacheKey = `teacher:therapy:${filterType}`;
    const cached = !bust && cache.get(cacheKey);
    const params = { isActive: true, ...(filterType !== 'all' ? { therapyType: filterType } : {}) };

    if (cached) {
      setTherapies(cached);
      setLoading(false);
      api.get('/therapy', { params, signal })
        .then(res => {
          const data = res.data.data?.therapies || res.data.data || [];
          cache.set(cacheKey, data);
          setTherapies(data);
        })
        .catch(() => {});
      return;
    }
    try {
      setLoading(true);
      const response = await api.get('/therapy', { params, signal });
      const data = response.data.data?.therapies || response.data.data || [];
      cache.set(cacheKey, data);
      setTherapies(data);
    } catch (error) {
      if (error.code === 'ERR_CANCELED') return;
      showError(t('therapy.loadError', { defaultValue: 'Terapiyalarni yuklashda xatolik' }));
      setTherapies([]);
    } finally {
      setLoading(false);
    }
  }, [filterType, showError, t]);

  const fetchChildren = useCallback(async (signal) => {
    const cached = cache.get('teacher:parents');
    if (cached) {
      setChildList(buildChildList(cached));
      setLoadingChildren(false);
      api.get('/teacher/parents', { signal })
        .then(res => {
          const parents = res.data.parents || [];
          cache.set('teacher:parents', parents);
          setChildList(buildChildList(parents));
        })
        .catch(() => {});
      return;
    }
    try {
      setLoadingChildren(true);
      const response = await api.get('/teacher/parents', { signal });
      const parents = response.data.parents || [];
      cache.set('teacher:parents', parents);
      setChildList(buildChildList(parents));
    } catch (error) {
      if (error.code === 'ERR_CANCELED') return;
      setChildList([]);
    } finally {
      setLoadingChildren(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchTherapies(false, controller.signal);
    fetchChildren(controller.signal);
    return () => controller.abort();
  }, [fetchTherapies, fetchChildren]);

  const handleCreate = () => {
    setEditingTherapy(null);
    setFormData({
      title: '',
      description: '',
      therapyType: 'music',
      contentUrl: '',
      contentType: 'audio',
      duration: '',
      ageGroup: 'all',
      difficultyLevel: 'all',
      tags: '',
      childId: '',
    });
    setShowModal(true);
  };

  const handleEdit = (therapy) => {
    setEditingTherapy(therapy);
    setFormData({
      title: therapy.title || '',
      description: therapy.description || '',
      therapyType: therapy.therapyType || 'music',
      contentUrl: therapy.contentUrl || '',
      contentType: therapy.contentType || 'audio',
      duration: therapy.duration || '',
      ageGroup: therapy.ageGroup || 'all',
      difficultyLevel: therapy.difficultyLevel || 'all',
      tags: therapy.tags?.join(', ') || '',
      childId: '',
    });
    setShowModal(true);
  };

  const handleAssign = (therapy) => {
    setAssigningTherapy(therapy);
    setAssignFormData({ childId: '', notes: '' });
    setShowAssignModal(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.therapyType) {
      showError(t('therapy.validation.required', { defaultValue: 'Sarlavha va tur majburiy' }));
      return;
    }

    try {
      setSaving(true);
      const therapyData = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        duration: formData.duration ? parseInt(formData.duration) : null,
        childId: formData.childId || undefined,
      };

      if (editingTherapy) {
        await api.put(`/therapy/${editingTherapy.id}`, therapyData);
        success(t('therapy.updateSuccess', { defaultValue: 'Terapiya yangilandi' }));
      } else {
        await api.post('/therapy', therapyData);
        success(t('therapy.createSuccess', { defaultValue: 'Terapiya yaratildi' }));
      }

      setShowModal(false);
      cache.invalidatePrefix('teacher:therapy');
      fetchTherapies(true);
    } catch (error) {
      showError(error.response?.data?.error || t('therapy.saveError', { defaultValue: 'Saqlashda xatolik' }));
    } finally {
      setSaving(false);
    }
  };

  const handleAssignSave = async () => {
    if (!assignFormData.childId) {
      showError(t('therapy.selectChild', { defaultValue: 'Bolani tanlang' }));
      return;
    }

    if (!assigningTherapy) return;

    try {
      setAssigning(true);
      await api.post(`/therapy/${assigningTherapy.id}/start`, {
        childId: assignFormData.childId,
      });
      success(t('therapy.assignSuccess', { defaultValue: 'Terapiya bolaga tayinlandi' }));
      setShowAssignModal(false);
      cache.invalidatePrefix('teacher:therapy');
      fetchTherapies(true);
    } catch (error) {
      showError(error.response?.data?.error || t('therapy.assignError', { defaultValue: 'Tayinlashda xatolik' }));
    } finally {
      setAssigning(false);
    }
  };

  const handleDelete = async (id) => {
    if (pendingDeleteId !== id) {
      setPendingDeleteId(id);
      showError(t('common.confirmDeleteClick', { defaultValue: 'Click again to confirm deletion' }));
      setTimeout(() => setPendingDeleteId(null), 5000);
      return;
    }
    setPendingDeleteId(null);

    try {
      await api.delete(`/therapy/${id}`);
      success(t('therapy.deleteSuccess', { defaultValue: 'Terapiya o\'chirildi' }));
      cache.invalidatePrefix('teacher:therapy');
      fetchTherapies(true);
    } catch (error) {
      showError(error.response?.data?.error || t('therapy.deleteError', { defaultValue: 'O\'chirishda xatolik' }));
    }
  };

  const getTherapyIcon = (type) => {
    switch (type) {
      case 'music': return Music;
      case 'video': return Video;
      case 'content': return FileText;
      default: return Play;
    }
  };

  const getTherapyColor = (type) => {
    switch (type) {
      case 'music': return 'bg-purple-50 text-purple-600';
      case 'video': return 'bg-brand-50 text-brand-600';
      case 'content': return 'bg-success-50 text-success-600';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  const filteredTherapies = therapies.filter((therapy) => {
    const query = searchQuery.toLowerCase();
    return (
      therapy.title?.toLowerCase().includes(query) ||
      therapy.description?.toLowerCase().includes(query) ||
      therapy.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight drop-shadow-sm">
            {t('therapy.management', { defaultValue: 'Terapiya Boshqaruvi' })}
          </h1>
          <p className="text-white/90 font-medium mt-1 drop-shadow-sm">
            {t('therapy.managementDesc', { defaultValue: 'Musiqa, video va content terapiyalarni boshqaring va bolalarga tayinlang' })}
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          {t('therapy.create', { defaultValue: 'Yangi Terapiya' })}
        </button>
      </div>

      <TherapyFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterType={filterType}
        setFilterType={setFilterType}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTherapies.map((therapy) => (
          <TherapyCard
            key={therapy.id}
            therapy={therapy}
            pendingDeleteId={pendingDeleteId}
            getTherapyIcon={getTherapyIcon}
            getTherapyColor={getTherapyColor}
            onAssign={handleAssign}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {filteredTherapies.length === 0 && (
        <Card className="p-12 text-center">
          <Play className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {t('therapy.noTherapies', { defaultValue: 'Terapiyalar topilmadi' })}
          </h3>
          <p className="text-slate-600">
            {t('therapy.noTherapiesDesc', { defaultValue: 'Qidiruv natijalari bo\'sh' })}
          </p>
        </Card>
      )}

      {showModal && (
        <TherapyFormModal
          editingTherapy={editingTherapy}
          formData={formData}
          setFormData={setFormData}
          childList={childList}
          saving={saving}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}

      {showAssignModal && assigningTherapy && (
        <TherapyAssignModal
          assignFormData={assignFormData}
          setAssignFormData={setAssignFormData}
          childList={childList}
          loadingChildren={loadingChildren}
          assigning={assigning}
          onAssignSave={handleAssignSave}
          onClose={() => setShowAssignModal(false)}
        />
      )}
    </div>
  );
};

export default TherapyManagement;
