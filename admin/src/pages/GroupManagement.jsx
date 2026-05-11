import { useEffect, useState } from 'react';
import api from '../services/api';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';
import { 
  UsersRound, 
  Search,
  UserCheck,
  Calendar
} from 'lucide-react';

/**
 * Group Management Page (Read-Only for Admin)
 * 
 * Business Logic:
 * - Admin can only VIEW groups (read-only)
 * - Admin cannot create, edit, or delete groups
 */
const GroupManagement = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { error: toastError } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    fetchGroups();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/groups');
      setGroups(response.data.groups || response.data.data || []);
    } catch (error) {
      toastError(t('groupsPage.loadError') || 'Error');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = groups.filter((group) => {
    const query = searchQuery.toLowerCase();
    return (
      group.name?.toLowerCase().includes(query) ||
      group.description?.toLowerCase().includes(query)
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">{t('groupsPage.title')}</h1>
          <p className="text-gray-500 font-medium mt-1">{t('groupsPage.subtitle')}</p>
        </div>

        <div className="relative flex-1 md:flex-initial md:w-64">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('groupsPage.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full"
          />
        </div>
      </div>

      {filteredGroups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((group) => (
            <Card key={group.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700">
                    <UsersRound className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {group.name}
                    </h3>
                    {group.description && (
            <p className="text-sm text-gray-500 mt-1">{group.description}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {group.teacher && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <UserCheck className="w-4 h-4 text-gray-400" />
                    <span>
                      {group.teacher.firstName} {group.teacher.lastName}
                    </span>
                  </div>
                )}
                {group.capacity && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <UsersRound className="w-4 h-4 text-gray-400" />
                    <span>{t('groupsPage.capacity', { count: group.capacity })}</span>
                  </div>
                )}
                {group.ageRange && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>{t('groupsPage.age', { range: group.ageRange })}</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <UsersRound className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 font-medium text-lg">
            {searchQuery ? t('groupsPage.emptySearch') : t('groupsPage.empty')}
          </p>
        </Card>
      )}
    </div>
  );
};

export default GroupManagement;
