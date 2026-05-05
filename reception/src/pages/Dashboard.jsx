import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Card from '../components/Card';
import { SkeletonDashboard } from '../../../shared/components/Skeleton';
import {
  Users,
  Shield,
  UserCheck,
  UsersRound,
  Eye,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    const loadData = async () => {
      try {
        // Reception Dashboard - Updated to use correct endpoints
        const [
          parentsRes,
          teachersRes,
          groupsRes,
        ] = await Promise.allSettled([
          api.get('/reception/parents'),
          api.get('/reception/teachers'),
          api.get('/groups'),
        ]);

        const parents = parentsRes.status === 'fulfilled' && parentsRes.value.data?.data && Array.isArray(parentsRes.value.data.data) 
          ? parentsRes.value.data.data 
          : [];
        const teachers = teachersRes.status === 'fulfilled' && teachersRes.value.data?.data && Array.isArray(teachersRes.value.data.data) 
          ? teachersRes.value.data.data 
          : [];
        const groups = groupsRes.status === 'fulfilled' && groupsRes.value.data?.groups && Array.isArray(groupsRes.value.data.groups) 
          ? groupsRes.value.data.groups 
          : [];

        setStats({
          parents: parents.length,
          teachers: teachers.length,
          groups: groups.length,
        });
        setTeachers(teachers);
        setParents(parents);
      } catch (error) {
        // Set default stats if error occurs
        setStats({
          parents: 0,
          teachers: 0,
          groups: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return <SkeletonDashboard stats={4} cards={2} />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary-600 to-primary-500 rounded-2xl p-6 md:p-8 -mx-4 md:mx-0">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-6 h-6 text-white" />
          <p className="text-white/90 text-sm font-medium">{t('dashboard.role')}</p>
        </div>
        <p className="text-white/90 text-sm mb-1">{t('dashboard.welcome')}</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white">
          {user?.firstName || ''} {user?.lastName || ''}
        </h1>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.stats')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{t('dashboard.totalParents')}</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.parents || 0}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-xl">
                <Users className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{t('dashboard.totalTeachers')}</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.teachers || 0}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl">
                <UserCheck className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{t('dashboard.totalGroups')}</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.groups || 0}</p>
              </div>
              <div className="p-3 bg-primary-50 rounded-xl">
                <UsersRound className="w-8 h-8 text-primary-600" />
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Teachers List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{t('dashboard.teachersList', { defaultValue: 'Teachers' })}</h2>
          <Link to="/reception/teachers" className="text-sm text-primary-600 hover:underline">
            {t('common.viewAll', { defaultValue: 'View All' })}
          </Link>
        </div>
        {teachers.length > 0 ? (
          <Card className="overflow-hidden">
            <div className="divide-y divide-gray-100">
              {teachers.slice(0, 5).map((teacher) => (
                <div key={teacher._id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                      {teacher.firstName?.charAt(0)}{teacher.lastName?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{teacher.firstName} {teacher.lastName}</p>
                      <p className="text-sm text-gray-500">{teacher.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      teacher.isActive !== false
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {teacher.isActive !== false ? t('common.active', { defaultValue: 'Active' }) : t('common.inactive', { defaultValue: 'Inactive' })}
                    </span>
                    <Link
                      to={`/reception/teachers/${teacher._id}`}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      <Eye className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card className="p-6 text-center">
            <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{t('dashboard.noTeachers', { defaultValue: 'No teachers yet' })}</p>
            <Link
              to="/reception/teachers/new"
              className="inline-block mt-3 text-primary-600 hover:underline text-sm"
            >
              {t('dashboard.addTeacher', { defaultValue: 'Add Teacher' })}
            </Link>
          </Card>
        )}
      </div>

      {/* Parents List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{t('dashboard.parentsList', { defaultValue: 'Parents' })}</h2>
          <Link to="/reception/parents" className="text-sm text-primary-600 hover:underline">
            {t('common.viewAll', { defaultValue: 'View All' })}
          </Link>
        </div>
        {parents.length > 0 ? (
          <Card className="overflow-hidden">
            <div className="divide-y divide-gray-100">
              {parents.slice(0, 5).map((parent) => (
                <div key={parent._id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-semibold">
                      {parent.firstName?.charAt(0)}{parent.lastName?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{parent.firstName} {parent.lastName}</p>
                      <p className="text-sm text-gray-500">{parent.email}</p>
                      {parent.children && parent.children.length > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          {parent.children.length} {parent.children.length === 1 ? t('dashboard.child') : t('dashboard.children')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      parent.isActive !== false
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {parent.isActive !== false ? t('common.active', { defaultValue: 'Active' }) : t('common.inactive', { defaultValue: 'Inactive' })}
                    </span>
                    <Link
                      to={`/reception/parents/${parent._id}`}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      <Eye className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card className="p-6 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{t('dashboard.noParents', { defaultValue: 'No parents yet' })}</p>
            <Link
              to="/reception/parents/new"
              className="inline-block mt-3 text-primary-600 hover:underline text-sm"
            >
              {t('dashboard.addParent', { defaultValue: 'Add Parent' })}
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
