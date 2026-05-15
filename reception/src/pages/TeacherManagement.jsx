import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import * as cache from '../../../shared/utils/cache';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../context/ToastContext';
import {
  UserCheck,
  Plus,
  Edit2,
  Trash2,
  Search,
  Mail,
  Phone,
  X,
  Save,
  Star,
  MessageSquare,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ConfirmDialog from '../components/ConfirmDialog';

const TeacherManagement = () => {
  const [teachers, setTeachers] = useState(() => cache.get('reception:teachers') || []);
  const [loading, setLoading] = useState(!cache.get('reception:teachers'));
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [showRatings, setShowRatings] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [ratingData, setRatingData] = useState({
    summary: { average: 0, count: 0 },
    ratings: [],
  });
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
  });
  const { success, error: showError } = useToast();
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);

  const loadTeachers = useCallback(async (bust = false) => {
    const CACHE_KEY = 'reception:teachers';
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchFresh = () => api.get('/reception/teachers', { signal })
      .then(res => {
        const d = Array.isArray(res.data.data) ? res.data.data : [];
        cache.set(CACHE_KEY, d);
        setTeachers(d);
      });

    const cached = !bust && cache.get(CACHE_KEY);
    if (cached) {
      setTeachers(cached);
      setLoading(false);
      fetchFresh().catch(() => {});
      return;
    }

    try {
      setLoading(true);
      await fetchFresh();
    } catch (error) {
      if (error.code === 'ERR_CANCELED') return;
      showError(error.response?.data?.error || t('teachersPage.toastLoadError'));
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  }, [showError, t]);

  useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

  const handleCreate = () => {
    setEditingTeacher(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
    });
    setShowModal(true);
  };

  const handleEdit = (teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      firstName: teacher.firstName || '',
      lastName: teacher.lastName || '',
      email: teacher.email || '',
      phone: teacher.phone || '',
      password: '', // Don't pre-fill password
    });
    setShowModal(true);
  };

  const handleViewRatings = async (teacher) => {
    setSelectedTeacher(teacher);
    setShowRatings(true);
    setRatingsLoading(true);
    try {
      const response = await api.get(`/reception/teachers/${teacher.id}/ratings`);
      const data = response.data?.data || {};
      setRatingData({
        summary: data.summary || { average: 0, count: 0 },
        ratings: Array.isArray(data.ratings) ? data.ratings : [],
      });
    } catch (err) {
      showError(err.response?.data?.error || t('teachersPage.ratings.toastError'));
      setRatingData({ summary: { average: 0, count: 0 }, ratings: [] });
    } finally {
      setRatingsLoading(false);
    }
  };

  const closeRatings = () => {
    setShowRatings(false);
    setSelectedTeacher(null);
    setRatingData({ summary: { average: 0, count: 0 }, ratings: [] });
  };

  const formatDate = (value) => {
    if (!value) return '';
    return new Date(value).toLocaleString();
  };

  const handleDelete = (teacherId) => {
    setConfirmDialog({
      message: t('teachersPage.confirmDelete'),
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/reception/teachers/${teacherId}`);
          success(t('teachersPage.toastDelete'));
          loadTeachers(true);
        } catch (error) {
          showError(error.response?.data?.error || t('teachersPage.toastDeleteError'));
        }
      },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingTeacher) {
        // Update teacher info
        const updateData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
        };
        // Include password in update if provided
        if (formData.password) {
          updateData.password = formData.password;
        }
        await api.put(`/reception/teachers/${editingTeacher.id}`, updateData);
        
        success(t('teachersPage.toastUpdate'));
      } else {
        const teacherData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        };
        await api.post('/reception/teachers', teacherData);
        success(t('teachersPage.toastCreate'));
      }
      
      setShowModal(false);
      loadTeachers(true);
    } catch (error) {
      showError(error.response?.data?.error || t('teachersPage.toastSaveError'));
    }
  };

  const filteredTeachers = teachers.filter((teacher) => {
    const query = searchQuery.toLowerCase();
    return (
      teacher.firstName?.toLowerCase().includes(query) ||
      teacher.lastName?.toLowerCase().includes(query) ||
      teacher.email?.toLowerCase().includes(query) ||
      teacher.phone?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96" role="status" aria-label="Loading teachers">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">{t('teachersPage.title')}</h1>
          <p className="text-gray-500 font-medium mt-1">{t('teachersPage.subtitle')}</p>
        </div>

        <div className="flex gap-3">
          <form role="search" aria-label={t('teachersPage.search')} className="relative flex-1 md:flex-initial">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
            <input
              type="text"
              placeholder={t('teachersPage.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label={t('teachersPage.search')}
              className="pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full md:w-64"
            />
          </form>

          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">{t('teachersPage.add')}</span>
          </button>
        </div>
      </div>

      {filteredTeachers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeachers.map((teacher) => (
            <Card
              key={teacher.id}
              className="p-6 hover:shadow-lg transition-shadow"
              onClick={() => handleViewRatings(teacher)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                    {teacher.firstName?.charAt(0)}{teacher.lastName?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {teacher.firstName} {teacher.lastName}
                    </h3>
                    <p className="text-sm text-gray-500">{teacher.email}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{teacher.email}</span>
                </div>
                {teacher.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{teacher.phone}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(teacher);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-2 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm min-w-0"
                >
                  <Edit2 className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{t('teachersPage.buttons.edit')}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(teacher.id);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-2 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors text-sm min-w-0"
                >
                  <Trash2 className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{t('teachersPage.buttons.delete')}</span>
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <UserCheck className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 font-medium text-lg">
            {searchQuery ? t('teachersPage.noTeachersFound') : t('teachersPage.noTeachers')}
          </p>
          {!searchQuery && (
            <button
              onClick={handleCreate}
              className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              {t('teachersPage.addFirst')}
            </button>
          )}
        </Card>
      )}

      {showRatings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ratings-modal-title"
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-primary-600 uppercase tracking-wide">
                  {t('teachersPage.ratings.title')}
                </p>
                <h2 id="ratings-modal-title" className="text-2xl font-bold text-gray-900">
                  {selectedTeacher?.firstName} {selectedTeacher?.lastName}
                </h2>
              </div>
              <button
                onClick={closeRatings}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label={t('common.close', { defaultValue: 'Close' })}
              >
                <X className="w-5 h-5 text-gray-500" aria-hidden="true" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <Star className="w-6 h-6 text-primary-500 fill-primary-500" aria-hidden="true" />
                  <div>
                    <p className="text-sm text-gray-500">{t('teachersPage.ratings.average')}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Number(ratingData.summary.average || 0).toFixed(1)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">{t('teachersPage.ratings.total')}</p>
                  <p className="text-lg font-semibold text-gray-900">{ratingData.summary.count || 0}</p>
                </div>
              </div>

              {ratingsLoading ? (
                <div className="flex justify-center items-center py-16" role="status" aria-label="Loading ratings">
                  <LoadingSpinner size="lg" />
                </div>
              ) : ratingData.ratings.length > 0 ? (
                <div className="space-y-4">
                  {ratingData.ratings.map((r) => (
                    <div key={r.id} className="border border-gray-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className="w-4 h-4"
                              fill={s <= r.stars ? '#f97316' : 'none'}
                              stroke={s <= r.stars ? '#ea580c' : '#d1d5db'}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-gray-400">{formatDate(r.updatedAt || r.createdAt)}</span>
                      </div>
                      {r.comment ? (
                        <div className="flex items-start gap-2 text-gray-700">
                          <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5" />
                          <p className="text-sm leading-relaxed">{r.comment}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">{t('teachersPage.ratings.noComment')}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        {r.parentName
                          ? t('teachersPage.ratings.byParent', { name: r.parentName })
                          : t('teachersPage.ratings.anonymous')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl">
                  <p className="text-gray-500">{t('teachersPage.ratings.empty')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="teacher-modal-title"
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 id="teacher-modal-title" className="text-2xl font-bold text-gray-900">
                {editingTeacher ? t('teachersPage.form.update') : t('teachersPage.form.create')}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label={t('common.close', { defaultValue: 'Close' })}
              >
                <X className="w-5 h-5 text-gray-500" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmit} aria-label={editingTeacher ? t('teachersPage.form.update') : t('teachersPage.form.create')} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('teachersPage.form.firstName')}</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('teachersPage.form.lastName')}</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('teachersPage.form.email')}</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('teachersPage.form.phone')}</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {editingTeacher ? `${t('teachersPage.form.password')} (${t('teachersPage.form.update').toLowerCase()})` : t('teachersPage.form.password')}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!editingTeacher}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? t('common.hidePassword', { defaultValue: 'Hide password' }) : t('common.showPassword', { defaultValue: 'Show password' })}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  {t('teachersPage.form.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {editingTeacher ? t('teachersPage.form.update') : t('teachersPage.form.create')}
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

export default TeacherManagement;

