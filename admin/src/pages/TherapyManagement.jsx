import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import Card from '@shared/components/Card';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { useToast } from '@shared/context/ToastContext';
import { useTranslation } from 'react-i18next';
import {
  Music,
  Video,
  FileText,
  Plus,
  Edit2,
  Trash2,
  Search,
  Play,
  Clock,
  Star,
  X,
  Save,
} from 'lucide-react';

/**
 * Therapy Management Page for Admin
 * 
 * Business Logic:
 * - Admin can create, edit, and delete therapies
 * - Admin can view all therapies (music, video, content)
 * - Admin can filter by type, age group, difficulty level
 */
const TherapyManagement = () => {
  const [therapies, setTherapies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingTherapy, setEditingTherapy] = useState(null);
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
  });
  const [saving, setSaving] = useState(false);
  const { success, error: showError } = useToast();
  const { t } = useTranslation();

  const fetchTherapies = useCallback(async () => {
    try {
      setLoading(true);
      const params = { isActive: true };
      if (filterType !== 'all') {
        params.therapyType = filterType;
      }
      const response = await api.get('/therapy', { params });
      setTherapies(response.data.data?.therapies || response.data.data || []);
    } catch (error) {
      showError(t('therapy.loadError', { defaultValue: 'Terapiyalarni yuklashda xatolik' }));
      setTherapies([]);
    } finally {
      setLoading(false);
    }
  }, [filterType, showError, t]);

  useEffect(() => {
    fetchTherapies();
  }, [fetchTherapies]);

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
    });
    setShowModal(true);
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
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t) : [],
        duration: formData.duration ? parseInt(formData.duration) : null,
      };

      if (editingTherapy) {
        await api.put(`/therapy/${editingTherapy.id}`, therapyData);
        success(t('therapy.updateSuccess', { defaultValue: 'Terapiya yangilandi' }));
      } else {
        await api.post('/therapy', therapyData);
        success(t('therapy.createSuccess', { defaultValue: 'Terapiya yaratildi' }));
      }

      setShowModal(false);
      fetchTherapies();
    } catch (error) {
      showError(error.response?.data?.error || t('therapy.saveError', { defaultValue: 'Saqlashda xatolik' }));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('therapy.confirmDelete', { defaultValue: 'Terapiyani o\'chirishni tasdiqlaysizmi?' }))) {
      return;
    }

    try {
      await api.delete(`/therapy/${id}`);
      success(t('therapy.deleteSuccess', { defaultValue: 'Terapiya o\'chirildi' }));
      fetchTherapies();
    } catch (error) {
      showError(error.response?.data?.error || t('therapy.deleteError', { defaultValue: 'O\'chirishda xatolik' }));
    }
  };

  const getTherapyIcon = (type) => {
    switch (type) {
      case 'music':
        return Music;
      case 'video':
        return Video;
      case 'content':
        return FileText;
      default:
        return Play;
    }
  };

  // TODO(phase-1): therapy type color palette — video=primary, music=purple, content=green; confirm whether all types should use primary or keep distinct category colors
  const getTherapyColor = (type) => {
    switch (type) {
      case 'music':
        return 'bg-purple-50 text-purple-600';
      case 'video':
        return 'bg-brand-50 text-brand-600';
      case 'content':
        return 'bg-success-50 text-success-600';
      default:
        return 'bg-warm-50 text-warm-600';
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
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-warm-900 tracking-tight">
            {t('therapy.management', { defaultValue: 'Terapiya Boshqaruvi' })}
          </h1>
          <p className="text-warm-600 mt-2">
            {t('therapy.managementDesc', { defaultValue: 'Musiqa, video va content terapiyalarni boshqaring' })}
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          {t('therapy.create', { defaultValue: 'Yangi Terapiya' })}
        </button>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-warm-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('therapy.search', { defaultValue: 'Qidirish...' })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-warm-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-brand-600 text-white'
                  : 'bg-warm-100 text-warm-700 hover:bg-warm-200'
              }`}
            >
              {t('therapy.all', { defaultValue: 'Barchasi' })}
            </button>
            <button
              onClick={() => setFilterType('music')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterType === 'music'
                  ? 'bg-brand-600 text-white'
                  : 'bg-warm-100 text-warm-700 hover:bg-warm-200'
              }`}
            >
              <Music className="w-4 h-4 inline mr-1" />
              {t('therapy.music', { defaultValue: 'Musiqa' })}
            </button>
            <button
              onClick={() => setFilterType('video')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterType === 'video'
                  ? 'bg-brand-600 text-white'
                  : 'bg-warm-100 text-warm-700 hover:bg-warm-200'
              }`}
            >
              <Video className="w-4 h-4 inline mr-1" />
              {t('therapy.video', { defaultValue: 'Video' })}
            </button>
            <button
              onClick={() => setFilterType('content')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterType === 'content'
                  ? 'bg-brand-600 text-white'
                  : 'bg-warm-100 text-warm-700 hover:bg-warm-200'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-1" />
              {t('therapy.content', { defaultValue: 'Content' })}
            </button>
          </div>
        </div>
      </Card>

      {/* Therapies List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTherapies.map((therapy) => {
          const Icon = getTherapyIcon(therapy.therapyType);
          const colorClass = getTherapyColor(therapy.therapyType);
          return (
            <Card key={therapy.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4 mb-4">
                <div className={`p-3 rounded-xl ${colorClass}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-warm-900 mb-1">{therapy.title}</h3>
                  <p className="text-sm text-warm-600 line-clamp-2">{therapy.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-warm-600 mb-4">
                {therapy.duration && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{therapy.duration} {t('therapy.min', { defaultValue: 'min' })}</span>
                  </div>
                )}
                {therapy.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-warning-500 fill-yellow-500" />
                    <span>{therapy.rating.toFixed(1)}</span>
                  </div>
                )}
                {therapy.usageCount && (
                  <div className="flex items-center gap-1">
                    <Play className="w-4 h-4" />
                    <span>{therapy.usageCount}</span>
                  </div>
                )}
              </div>

              {therapy.tags && therapy.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {therapy.tags.slice(0, 3).map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-warm-100 text-warm-600 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(therapy)}
                  className="flex-1 px-4 py-2 bg-brand-50 text-brand-600 rounded-lg font-medium hover:bg-brand-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  {t('therapy.edit', { defaultValue: 'Tahrirlash' })}
                </button>
                <button
                  onClick={() => handleDelete(therapy.id)}
                  className="px-4 py-2 bg-error-50 text-error-600 rounded-lg font-medium hover:bg-error-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredTherapies.length === 0 && (
        <Card className="p-12 text-center">
          <Play className="w-16 h-16 text-warm-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-warm-900 mb-2">
            {t('therapy.noTherapies', { defaultValue: 'Terapiyalar topilmadi' })}
          </h3>
          <p className="text-warm-600">
            {t('therapy.noTherapiesDesc', { defaultValue: 'Qidiruv natijalari bo\'sh' })}
          </p>
        </Card>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-warm-100 flex items-center justify-between sticky top-0 bg-surface">
              <h3 className="text-lg font-bold text-warm-900">
                {editingTherapy
                  ? t('therapy.edit', { defaultValue: 'Terapiyani Tahrirlash' })
                  : t('therapy.create', { defaultValue: 'Yangi Terapiya' })}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-warm-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-warm-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-2">
                  {t('therapy.title', { defaultValue: 'Sarlavha' })} *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-warm-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder={t('therapy.titlePlaceholder', { defaultValue: 'Terapiya nomi' })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-warm-700 mb-2">
                  {t('therapy.description', { defaultValue: 'Tavsif' })}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-warm-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder={t('therapy.descriptionPlaceholder', { defaultValue: 'Terapiya tavsifi' })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-warm-700 mb-2">
                    {t('therapy.type', { defaultValue: 'Turi' })} *
                  </label>
                  <select
                    value={formData.therapyType}
                    onChange={(e) => setFormData({ ...formData, therapyType: e.target.value })}
                    className="w-full px-4 py-2 border border-warm-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  >
                    <option value="music">{t('therapy.music', { defaultValue: 'Musiqa' })}</option>
                    <option value="video">{t('therapy.video', { defaultValue: 'Video' })}</option>
                    <option value="content">{t('therapy.content', { defaultValue: 'Content' })}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-warm-700 mb-2">
                    {t('therapy.contentType', { defaultValue: 'Content Turi' })}
                  </label>
                  <select
                    value={formData.contentType}
                    onChange={(e) => setFormData({ ...formData, contentType: e.target.value })}
                    className="w-full px-4 py-2 border border-warm-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  >
                    <option value="audio">{t('therapy.audio', { defaultValue: 'Audio' })}</option>
                    <option value="video">{t('therapy.video', { defaultValue: 'Video' })}</option>
                    <option value="image">{t('therapy.image', { defaultValue: 'Rasm' })}</option>
                    <option value="document">{t('therapy.document', { defaultValue: 'Hujjat' })}</option>
                    <option value="interactive">{t('therapy.interactive', { defaultValue: 'Interaktiv' })}</option>
                    <option value="link">{t('therapy.link', { defaultValue: 'Havola' })}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-warm-700 mb-2">
                  {t('therapy.contentUrl', { defaultValue: 'Content URL' })}
                </label>
                <input
                  type="url"
                  value={formData.contentUrl}
                  onChange={(e) => setFormData({ ...formData, contentUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-warm-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder="https://example.com/therapy.mp3"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-warm-700 mb-2">
                    {t('therapy.duration', { defaultValue: 'Davomiyligi (min)' })}
                  </label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full px-4 py-2 border border-warm-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-warm-700 mb-2">
                    {t('therapy.ageGroup', { defaultValue: 'Yosh Guruhi' })}
                  </label>
                  <select
                    value={formData.ageGroup}
                    onChange={(e) => setFormData({ ...formData, ageGroup: e.target.value })}
                    className="w-full px-4 py-2 border border-warm-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  >
                    <option value="all">{t('therapy.allAges', { defaultValue: 'Barcha' })}</option>
                    <option value="infant">{t('therapy.infant', { defaultValue: 'Chaqaloq' })}</option>
                    <option value="toddler">{t('therapy.toddler', { defaultValue: 'Yosh bola' })}</option>
                    <option value="preschool">{t('therapy.preschool', { defaultValue: 'Muassasagacha' })}</option>
                    <option value="school_age">{t('therapy.schoolAge', { defaultValue: 'Muassasa yoshi' })}</option>
                    <option value="adolescent">{t('therapy.adolescent', { defaultValue: 'O\'smir' })}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-warm-700 mb-2">
                    {t('therapy.difficulty', { defaultValue: 'Qiyinlik' })}
                  </label>
                  <select
                    value={formData.difficultyLevel}
                    onChange={(e) => setFormData({ ...formData, difficultyLevel: e.target.value })}
                    className="w-full px-4 py-2 border border-warm-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  >
                    <option value="all">{t('therapy.allLevels', { defaultValue: 'Barcha' })}</option>
                    <option value="beginner">{t('therapy.beginner', { defaultValue: 'Boshlang\'ich' })}</option>
                    <option value="intermediate">{t('therapy.intermediate', { defaultValue: 'O\'rta' })}</option>
                    <option value="advanced">{t('therapy.advanced', { defaultValue: 'Yuqori' })}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-warm-700 mb-2">
                  {t('therapy.tags', { defaultValue: 'Teglar (vergul bilan ajratilgan)' })}
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-4 py-2 border border-warm-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder="tag1, tag2, tag3"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 bg-warm-100 hover:bg-warm-200 text-warm-700 rounded-lg font-semibold transition-colors"
                  disabled={saving}
                >
                  {t('therapy.cancel', { defaultValue: 'Bekor qilish' })}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{t('therapy.saving', { defaultValue: 'Saqlanmoqda...' })}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>{t('therapy.save', { defaultValue: 'Saqlash' })}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TherapyManagement;
