import { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import { SkeletonList } from '../../../shared/components/Skeleton';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Search,
  Phone,
  Eye,
  FileText,
  Utensils,
  Image as ImageIcon,
  Baby
} from 'lucide-react';

/**
 * Parent Management Page (Read-Only for Admin)
 * 
 * Business Logic:
 * - Admin can only VIEW parents (read-only)
 * - Admin cannot create, edit, or delete parents
 * - Clicking on a parent shows their activities, meals, and media
 */
const ParentManagement = () => {
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParent, setSelectedParent] = useState(null);
  const [parentData, setParentData] = useState(null);
  const [loadingParentData, setLoadingParentData] = useState(false);
  const { error: toastError } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    fetchParents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchParents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/parents');
      setParents(response.data.data || []);
    } catch (error) {
      toastError(t('parentsPage.loadError') || 'Error');
      setParents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewParent = async (parent) => {
    setSelectedParent(parent);
    setLoadingParentData(true);
    try {
      const response = await api.get(`/admin/parents/${parent.id}`);
      setParentData(response.data.data);
    } catch (error) {
      toastError(t('parentsPage.dataError') || 'Error');
    } finally {
      setLoadingParentData(false);
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

  if (loading) {
    return <SkeletonList items={8} />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">{t('parentsPage.title')}</h1>
          <p className="text-gray-500 font-medium mt-1">{t('parentsPage.subtitle')}</p>
        </div>

        <form role="search" aria-label={t('parentsPage.search')} className="relative flex-1 md:flex-initial md:w-64">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
          <input
            type="text"
            placeholder={t('parentsPage.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={t('parentsPage.search')}
            className="pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full"
          />
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Parent List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{t('parentsPage.listTitle')}</h2>
          </div>
          <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
            {filteredParents.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>{searchQuery ? t('parentsPage.emptySearch') : t('parentsPage.empty')}</p>
              </div>
            ) : (
              filteredParents.map((parent) => (
                <div
                  key={parent.id}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedParent?.id === parent.id
                      ? 'bg-primary-50 border-l-4 border-primary-500'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleViewParent(parent)}
                  aria-label={`${t('parentsPage.viewLabel') || 'View'} ${parent.firstName} ${parent.lastName}`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleViewParent(parent)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold" aria-hidden="true">
                          {parent.firstName?.charAt(0)}{parent.lastName?.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {parent.firstName} {parent.lastName}
                          </h3>
                          <p className="text-sm text-gray-600">{parent.email}</p>
                        </div>
                      </div>
                      {parent.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                          <Phone className="w-4 h-4" aria-hidden="true" />
                          <span>{parent.phone}</span>
                        </div>
                      )}
                    </div>
                    <Eye className="w-5 h-5 text-gray-400" aria-hidden="true" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Parent Data View */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {selectedParent ? (
            <>
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedParent.firstName} {selectedParent.lastName}
                </h2>
                <p className="text-sm text-gray-600">{selectedParent.email}</p>
              </div>
              {loadingParentData ? (
                <div className="p-8 text-center" role="status" aria-label="Loading parent data">
                  <LoadingSpinner size="md" />
                </div>
              ) : parentData ? (
                <div className="p-4 space-y-6">
                  {/* Children */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Baby className="w-5 h-5 text-primary-600" />
                      <h3 className="font-semibold text-gray-900">Children ({parentData.children?.length || 0})</h3>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {parentData.children && parentData.children.length > 0 ? (
                        parentData.children.map((child) => (
                          <div key={child.id} className="p-3 bg-gray-50 rounded-lg">
                            <p className="font-medium text-gray-900">{child.firstName} {child.lastName}</p>
                            <div className="text-xs text-gray-500 mt-1">
                              <p>DOB: {new Date(child.dateOfBirth).toLocaleDateString()}</p>
                              <p>Gender: {child.gender}</p>
                              <p>School: {child.childSchool?.name || ''}</p>
                              <p>Class: {child.class}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No children registered</p>
                      )}
                    </div>
                  </div>

                  {/* Activities */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-5 h-5 text-primary-600" />
                      <h3 className="font-semibold text-gray-900">Activities ({parentData.activities?.length || 0})</h3>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {parentData.activities && parentData.activities.length > 0 ? (
                        parentData.activities.map((activity) => (
                          <div key={activity.id} className="p-2 bg-gray-50 rounded text-sm">
                            <p className="font-medium">{activity.title}</p>
                            <p className="text-xs text-gray-500">{new Date(activity.activityDate).toLocaleDateString()}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No activities</p>
                      )}
                    </div>
                  </div>

                  {/* Meals */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Utensils className="w-5 h-5 text-primary-600" />
                      <h3 className="font-semibold text-gray-900">Meals ({parentData.meals?.length || 0})</h3>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {parentData.meals && parentData.meals.length > 0 ? (
                        parentData.meals.map((meal) => (
                          <div key={meal.id} className="p-2 bg-gray-50 rounded text-sm">
                            <p className="font-medium">{meal.mealName}</p>
                            <p className="text-xs text-gray-500">{meal.mealType} - {new Date(meal.mealDate).toLocaleDateString()}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No meals</p>
                      )}
                    </div>
                  </div>

                  {/* Media */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <ImageIcon className="w-5 h-5 text-primary-600" />
                      <h3 className="font-semibold text-gray-900">Media ({parentData.media?.length || 0})</h3>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {parentData.media && parentData.media.length > 0 ? (
                        parentData.media.map((media) => (
                          <div key={media.id} className="p-2 bg-gray-50 rounded text-sm">
                            <p className="font-medium">{media.title || media.fileName}</p>
                            <p className="text-xs text-gray-500">{media.fileType} - {new Date(media.uploadDate).toLocaleDateString()}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No media</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <p>Failed to load parent data</p>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Select a parent to view their data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParentManagement;
