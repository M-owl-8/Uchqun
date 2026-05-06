import { useEffect, useState, memo, useMemo } from 'react';
import api from '../services/api';
import Card from '../components/Card';
import { SkeletonList } from '../../../shared/components/Skeleton';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';
import { 
  UserCheck, 
  Search,
  Mail,
  Phone,
  Eye,
  GraduationCap,
  Briefcase
} from 'lucide-react';

/**
 * Teacher Management Page (Read-Only for Admin)
 * 
 * Business Logic:
 * - Admin can only VIEW teachers (read-only)
 * - Admin cannot create, edit, or delete teachers
 */
const TeacherManagement = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { showToast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/teachers');
      setTeachers(response.data.data || []);
    } catch (error) {
      showToast(t('teachersPage.loadError') || 'Error', 'error');
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeachers = useMemo(() => teachers.filter((teacher) => {
    const query = searchQuery.toLowerCase();
    return (
      teacher.firstName?.toLowerCase().includes(query) ||
      teacher.lastName?.toLowerCase().includes(query) ||
      teacher.email?.toLowerCase().includes(query) ||
      teacher.phone?.toLowerCase().includes(query)
    );
  }), [teachers, searchQuery]);

  if (loading) {
    return <SkeletonList items={6} />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">{t('teachersPage.title')}</h1>
          <p className="text-gray-500 font-medium mt-1">{t('teachersPage.subtitle')}</p>
        </div>

        <form role="search" aria-label={t('teachersPage.search')} className="relative flex-1 md:flex-initial md:w-64">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
          <input
            type="text"
            placeholder={t('teachersPage.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={t('teachersPage.search')}
            className="pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full"
          />
        </form>
      </div>

      {filteredTeachers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeachers.map((teacher) => (
            <TeacherCard key={teacher.id} teacher={teacher} t={t} />
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <UserCheck className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 font-medium text-lg">
            {searchQuery ? t('teachersPage.emptySearch') : t('teachersPage.empty')}
          </p>
        </Card>
      )}
    </div>
  );
};

const TeacherCard = memo(({ teacher, t }) => (
  <Card className="p-6 hover:shadow-lg transition-shadow">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
          {teacher.firstName?.charAt(0)}{teacher.lastName?.charAt(0)}
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">{teacher.firstName} {teacher.lastName}</h3>
          <p className="text-sm text-gray-500">{teacher.email}</p>
        </div>
      </div>
    </div>
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Mail className="w-4 h-4 text-gray-400" aria-hidden="true" />
        <span>{teacher.email}</span>
      </div>
      {teacher.phone && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Phone className="w-4 h-4 text-gray-400" aria-hidden="true" />
          <span>{teacher.phone}</span>
        </div>
      )}
      <div className="flex items-center gap-2 text-sm text-primary-600 mt-3 pt-3 border-t border-gray-100">
        <UserCheck className="w-4 h-4" aria-hidden="true" />
        <span className="font-medium">{t('teachersPage.badge')}</span>
      </div>
    </div>
  </Card>
));

export default TeacherManagement;
