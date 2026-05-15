import { useCallback, useEffect, useState } from 'react';
import { Film, Image as ImageIcon, LayoutGrid, Plus } from 'lucide-react';
import LoadingSpinner from '../shared/components/LoadingSpinner';
import { useAuth } from '../shared/context/AuthContext';
import { useToast } from '../shared/context/ToastContext';
import api from '../shared/services/api';
import * as cache from '../../../shared/utils/cache';
import { useTranslation } from 'react-i18next';
import ConfirmDialog from '../shared/components/ConfirmDialog';
import MediaCard from './media/MediaCard';
import MediaViewModal from './media/MediaViewModal';
import MediaFormModal from './media/MediaFormModal';

const Media = () => {
  const { isTeacher } = useAuth();
  const { success, error: showError } = useToast();
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingMedia, setEditingMedia] = useState(null);
  const [formData, setFormData] = useState({
    childId: '',
    title: '',
    description: '',
    type: 'photo',
    date: new Date().toISOString().split('T')[0],
  });
  const [childList, setChildList] = useState([]);
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Defensive: remove any legacy thumbnail field rendered from old bundles
  useEffect(() => {
    if (!showModal) return;
    const thumbInput = document.querySelector('input[placeholder="https://example.com/thumbnail.jpg"]');
    if (thumbInput) {
      const container = thumbInput.closest('div');
      if (container && container.parentElement) {
        container.parentElement.removeChild(container);
      } else {
        thumbInput.remove();
      }
    }
  }, [showModal]);

  const loadChildren = useCallback(async () => {
    try {
      let parentsList = cache.get('teacher:parents');
      if (!parentsList) {
        const parentsRes = await api.get('/teacher/parents');
        parentsList = Array.isArray(parentsRes.data.parents) ? parentsRes.data.parents : [];
        cache.set('teacher:parents', parentsList);
      }
      const allChildren = parentsList.flatMap(p => Array.isArray(p.children) ? p.children : []);
      setChildList(allChildren);
      if (allChildren.length > 0) {
        setFormData(prev => prev.childId ? prev : { ...prev, childId: allChildren[0].id });
      }
    } catch (error) { void error; }
  }, []);

  const loadMedia = useCallback(async (bust = false, signal) => {
    const cached = !bust && cache.get('teacher:media');
    if (cached) { setMedia(cached); setLoading(false); return; }
    try {
      setLoading(true);
      const response = await api.get('/media', { signal });
      const data = Array.isArray(response.data) ? response.data : [];
      cache.set('teacher:media', data);
      setMedia(data);
    } catch (error) {
      if (error.code === 'ERR_CANCELED') return;
      showError(error.response?.data?.error || t('mediaPage.toastLoadError'));
      setMedia([]);
    } finally {
      setLoading(false);
    }
  }, [showError, t]);

  useEffect(() => {
    const controller = new AbortController();
    loadMedia(false, controller.signal);
    if (isTeacher) {
      loadChildren();
    }
    return () => controller.abort();
  }, [isTeacher, loadMedia, loadChildren]);

  const handleCreate = () => {
    setEditingMedia(null);
    setFormData({
      childId: childList.length > 0 ? childList[0].id : '',
      title: '',
      description: '',
      type: 'photo',
      date: new Date().toISOString().split('T')[0],
    });
    setShowModal(true);
    setFile(null);
  };

  const handleEdit = (mediaItem, e) => {
    e?.stopPropagation();
    setEditingMedia(mediaItem);
    setFormData({
      childId: mediaItem.childId || '',
      title: mediaItem.title || '',
      description: mediaItem.description || '',
      type: mediaItem.type || 'photo',
      date: mediaItem.date ? mediaItem.date.split('T')[0] : new Date().toISOString().split('T')[0],
    });
    setShowModal(true);
    setFile(null);
  };

  const handleDelete = (mediaId, e) => {
    e?.stopPropagation();
    setConfirmDialog({
      message: t('mediaPage.confirmDelete'),
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/media/${mediaId}`);
          success(t('mediaPage.toastDelete'));
          loadMedia(true);
        } catch (error) {
          showError(error.response?.data?.error || t('mediaPage.toastError'));
        }
      },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingMedia) {
        await api.put(`/media/${editingMedia.id}`, {
          childId: formData.childId,
          title: formData.title,
          description: formData.description,
          type: formData.type,
          date: formData.date
        });
        success(t('mediaPage.toastUpdate'));
      } else {
        if (!formData.childId) {
          showError(t('mediaPage.modal.selectChild'));
          return;
        }
        if (!formData.title || formData.title.trim() === '') {
          showError(t('mediaPage.modal.title'));
          return;
        }
        if (!file) {
          showError(t('mediaPage.modal.fileRequired'));
          return;
        }

        const payload = new FormData();
        payload.append('childId', formData.childId);
        payload.append('title', formData.title.trim());
        if (formData.description) payload.append('description', formData.description.trim());
        if (formData.date) payload.append('date', formData.date);
        payload.append('file', file);

        await api.post('/media/upload', payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        success(t('mediaPage.toastCreate'));
      }

      setShowModal(false);
      loadMedia(true);
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.details?.join(', ') || error.message || t('mediaPage.toastError');
      showError(errorMessage);
    }
  };

  const filteredMedia = filter === 'all' ? media : media.filter((item) => item.type === filter);

  if (loading) return <div className="flex justify-center items-center h-96"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight drop-shadow-sm">{t('mediaPage.title')}</h1>
          <p className="text-white/90 font-medium mt-1 drop-shadow-sm">{t('mediaPage.subtitle')}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
            {[
              { id: 'all', label: t('mediaPage.filters.all'), icon: LayoutGrid },
              { id: 'photo', label: t('mediaPage.filters.photo'), icon: ImageIcon },
              { id: 'video', label: t('mediaPage.filters.video'), icon: Film },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => setFilter(option.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  filter === option.id
                    ? 'bg-white text-primary-600 shadow-md scale-105'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                }`}
              >
                <option.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{option.label}</span>
              </button>
            ))}
          </div>

          {isTeacher && (
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">{t('mediaPage.add')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Media Grid */}
      {filteredMedia.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMedia.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              isTeacher={isTeacher}
              onSelect={setSelectedMedia}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-32 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
          <ImageIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 font-bold text-lg">{t('mediaPage.empty')}</p>
        </div>
      )}

      {selectedMedia && (
        <MediaViewModal
          selectedMedia={selectedMedia}
          onClose={() => setSelectedMedia(null)}
        />
      )}

      {showModal && (
        <MediaFormModal
          editingMedia={editingMedia}
          formData={formData}
          setFormData={setFormData}
          childList={childList}
          isTeacher={isTeacher}
          setFile={setFile}
          onSubmit={handleSubmit}
          onClose={() => setShowModal(false)}
        />
      )}

      <ConfirmDialog dialog={confirmDialog} onCancel={() => setConfirmDialog(null)} />
    </div>
  );
};

export default Media;
