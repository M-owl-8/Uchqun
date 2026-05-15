import { useEffect, useState } from 'react';
import { FileX, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import LoadingSpinner from '../shared/components/LoadingSpinner';
import { useAuth } from '../shared/context/AuthContext';
import { useToast } from '../shared/context/ToastContext';
import api from '../shared/services/api';
import * as cache from '../../../shared/utils/cache';
import ConfirmDialog from '../shared/components/ConfirmDialog';
import ActivityCard from './activities/ActivityCard';
import ActivityDetailsModal from './activities/ActivityDetailsModal';
import ActivityFormModal from './activities/ActivityFormModal';

const Activities = () => {
  const { isTeacher, user } = useAuth();
  const { success, error: showError } = useToast();
  const { t, i18n } = useTranslation();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [formData, setFormData] = useState({
    parentId: '',
    childId: '',
    teacher: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'Teacher',
    skill: '',
    goal: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    tasks: [''],
    methods: '',
    progress: '',
    observation: '',
    services: [],
  });
  const [parents, setParents] = useState([]);
  const [children, setChildren] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const locale = (() => {
    if (i18n.language === 'uz') return 'uz-UZ';
    if (i18n.language === 'ru') return 'ru-RU';
    return 'en-US';
  })();

  useEffect(() => {
    loadActivities();
    if (isTeacher) {
      loadParents();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTeacher]);

  const getParentsList = async () => {
    const cached = cache.get('teacher:parents');
    if (cached) return cached;
    const parentsRes = await api.get('/teacher/parents');
    const list = Array.isArray(parentsRes.data.parents) ? parentsRes.data.parents : [];
    cache.set('teacher:parents', list);
    return list;
  };

  const loadParents = async () => {
    try {
      const parentsList = await getParentsList();
      setParents(parentsList);
      if (parentsList.length === 1 && !formData.parentId) {
        const parentId = parentsList[0].id;
        setFormData(prev => ({ ...prev, parentId }));
        await loadChildrenForParent(parentId);
      }
    } catch (error) {
      showError(error.response?.data?.error || t('activitiesPage.toastLoadError'));
    }
  };

  const loadChildrenForParent = async (parentId) => {
    try {
      const parentsList = await getParentsList();
      setParents(parentsList);
      const selectedParent = parentsList.find(p => p.id === parentId);
      if (selectedParent && selectedParent.children && Array.isArray(selectedParent.children)) {
        setChildren(selectedParent.children);
        if (selectedParent.children.length > 0) {
          setFormData(prev => ({ ...prev, childId: prev.childId || selectedParent.children[0].id }));
        } else {
          setFormData(prev => ({ ...prev, childId: '' }));
        }
      } else {
        setChildren([]);
        setFormData(prev => ({ ...prev, childId: '' }));
      }
    } catch (error) {
      setChildren([]);
      setFormData(prev => ({ ...prev, childId: '' }));
    }
  };

  const loadActivities = async (bust = false) => {
    const cached = !bust && cache.get('teacher:activities');
    if (cached) { setActivities(cached); setLoading(false); return; }
    try {
      setLoading(true);
      const response = await api.get('/activities');
      const data = Array.isArray(response.data) ? response.data : [];
      cache.set('teacher:activities', data);
      setActivities(data);
    } catch (error) {
      showError(error.response?.data?.error || t('activitiesPage.toastLoadError'));
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setEditingActivity(null);

    if (parents.length === 0) {
      await loadParents();
    }

    const firstParent = parents.length > 0 ? parents[0] : null;
    const firstChild = firstParent && firstParent.children && firstParent.children.length > 0
      ? firstParent.children[0].id : '';

    const today = new Date().toISOString().split('T')[0];
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    const endDateDefault = threeMonthsLater.toISOString().split('T')[0];

    setFormData({
      parentId: firstParent ? firstParent.id : '',
      childId: firstChild,
      teacher: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'Teacher',
      skill: '',
      goal: '',
      startDate: today,
      endDate: endDateDefault,
      tasks: [''],
      methods: '',
      progress: '',
      observation: '',
      services: [],
    });

    if (firstParent) {
      await loadChildrenForParent(firstParent.id);
    }

    setShowModal(true);
  };

  const handleEdit = async (activity) => {
    setEditingActivity(activity);

    let parentId = '';
    if (activity.child && activity.child.id) {
      const parent = parents.find(p =>
        p.children && p.children.some(c => c.id === activity.child.id)
      );
      if (parent) {
        parentId = parent.id;
        loadChildrenForParent(parent.id);
      }
    }

    setFormData({
      parentId: parentId,
      childId: activity.childId || '',
      teacher: activity.teacher || (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'Teacher'),
      skill: activity.skill || '',
      goal: activity.goal || '',
      startDate: activity.startDate ? activity.startDate.split('T')[0] : new Date().toISOString().split('T')[0],
      endDate: activity.endDate ? activity.endDate.split('T')[0] : '',
      tasks: Array.isArray(activity.tasks) && activity.tasks.length > 0 ? activity.tasks : [''],
      methods: activity.methods || '',
      progress: activity.progress || '',
      observation: activity.observation || '',
      services: Array.isArray(activity.services) ? activity.services : [],
    });
    setShowModal(true);
  };

  const handleDelete = (activityId) => {
    setConfirmDialog({
      message: t('activitiesPage.confirmDelete'),
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/activities/${activityId}`);
          success(t('activitiesPage.toastDelete'));
          loadActivities(true);
        } catch (error) {
          showError(error.response?.data?.error || t('activitiesPage.toastError'));
        }
      },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingActivity) {
        await api.put(`/activities/${editingActivity.id}`, formData);
        success(t('activitiesPage.toastUpdate'));
      } else {
        if (!formData.childId) {
          showError(t('activitiesPage.selectChildError'));
          return;
        }
        if (!formData.skill || !formData.goal || !formData.startDate || !formData.endDate) {
          showError(t('activitiesPage.requiredFieldsError'));
          return;
        }
        await api.post('/activities', formData);
        success(t('activitiesPage.toastCreate'));
      }

      setShowModal(false);
      loadActivities(true);
    } catch (error) {
      showError(error.response?.data?.error || t('activitiesPage.toastError'));
    }
  };

  if (loading) return <div className="flex justify-center items-center h-96"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="max-w-5xl mx-auto pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="text-center md:text-left">
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight drop-shadow-sm">{t('activitiesPage.title')}</h1>
          <p className="text-white/90 font-medium drop-shadow-sm">{t('activitiesPage.subtitle')}</p>
        </div>

        {isTeacher && (
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">{t('activitiesPage.add')}</span>
          </button>
        )}
      </div>

      {/* Activities Cards Grid */}
      {activities.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {activities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              isTeacher={isTeacher}
              locale={locale}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDetails={(a) => { setSelectedActivity(a); setShowDetailsModal(true); }}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-gray-200">
          <FileX className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 font-medium text-lg">{t('activitiesPage.empty')}</p>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedActivity && (
        <ActivityDetailsModal
          activity={selectedActivity}
          locale={locale}
          onClose={() => { setShowDetailsModal(false); setSelectedActivity(null); }}
        />
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <ActivityFormModal
          editingActivity={editingActivity}
          formData={formData}
          setFormData={setFormData}
          isTeacher={isTeacher}
          parents={parents}
          childList={children}
          onSubmit={handleSubmit}
          onClose={() => setShowModal(false)}
          loadChildrenForParent={loadChildrenForParent}
        />
      )}

      <ConfirmDialog dialog={confirmDialog} onCancel={() => setConfirmDialog(null)} />
    </div>
  );
};

export default Activities;
