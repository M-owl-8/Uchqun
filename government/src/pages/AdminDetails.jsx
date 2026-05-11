import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Shield,
  Building2,
  Users,
  GraduationCap,
  ArrowLeft,
  UserCheck,
  User,
  Baby,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const AdminDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !UUID_RE.test(id)) {
      setLoading(false);
      return;
    }
    loadAdminDetails();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadAdminDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/government/admins/${id}`);
      setData(res.data?.data || null);
    } catch {
      // handled by empty data state
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">
          {t('adminDetails.notFound', { defaultValue: 'Admin topilmadi' })}
        </p>
        <button
          onClick={() => navigate('/government')}
          className="mt-4 text-primary-600 hover:text-primary-700"
        >
          {t('adminDetails.back', { defaultValue: 'Orqaga qaytish' })}
        </button>
      </div>
    );
  }

  const { admin, stats, receptions, schools, teachers, parents, children } = data;

  const statCards = [
    {
      title: t('adminDetails.students', { defaultValue: 'O\'quvchilar' }),
      value: stats.students || 0,
      icon: Baby,
      color: 'bg-pink-500',
      description: t('adminDetails.studentsDesc', { defaultValue: 'Jami o\'quvchilar soni' }),
    },
    {
      title: t('adminDetails.parents', { defaultValue: 'Ota-onalar' }),
      value: stats.parents || 0,
      icon: Users,
      color: 'bg-orange-500',
      description: t('adminDetails.parentsDesc', { defaultValue: 'Jami ota-onalar soni' }),
    },
    {
      title: t('adminDetails.teachers', { defaultValue: 'O\'qituvchilar' }),
      value: stats.teachers || 0,
      icon: GraduationCap,
      color: 'bg-purple-500',
      description: t('adminDetails.teachersDesc', { defaultValue: 'Jami o\'qituvchilar soni' }),
    },
    {
      title: t('adminDetails.receptions', { defaultValue: 'Receptionlar' }),
      value: stats.receptions || 0,
      icon: UserCheck,
      color: 'bg-blue-500',
      description: t('adminDetails.receptionsDesc', { defaultValue: 'Jami receptionlar soni' }),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/government')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {admin.firstName} {admin.lastName}
          </h1>
          <p className="text-gray-600">{admin.email}</p>
        </div>
      </div>

      {/* Admin Info Card */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary-600" />
          </div>
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  {t('adminDetails.email', { defaultValue: 'Email' })}
                </p>
                <p className="font-semibold text-gray-900">{admin.email}</p>
              </div>
              {admin.phone && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    {t('adminDetails.phone', { defaultValue: 'Telefon' })}
                  </p>
                  <p className="font-semibold text-gray-900">{admin.phone}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  {t('adminDetails.createdAt', { defaultValue: 'Yaratilgan sana' })}
                </p>
                <p className="font-semibold text-gray-900">
                  {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString(i18n.language) : '—'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  {t('adminDetails.status', { defaultValue: 'Holati' })}
                </p>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  admin.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {admin.isActive 
                    ? t('profile.active', { defaultValue: 'Faol' })
                    : t('profile.inactive', { defaultValue: 'Nofaol' })
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Statistics Cards */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          {t('adminDetails.statistics', { defaultValue: 'Statistika' })}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mb-1">{card.value}</p>
                    {card.description && (
                      <p className="text-xs text-gray-500">{card.description}</p>
                    )}
                  </div>
                  <div className={`${card.color} p-3 rounded-lg shadow-sm`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Receptions */}
      {receptions.length > 0 && (
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {t('adminDetails.receptions', { defaultValue: 'Receptionlar' })} ({receptions.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {receptions.map((reception) => (
              <div key={reception.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <UserCheck className="w-5 h-5 text-primary-600" />
                  <h3 className="font-bold text-gray-900">
                    {reception.firstName} {reception.lastName}
                  </h3>
                </div>
                <p className="text-sm text-gray-600">{reception.email}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Schools */}
      {schools.length > 0 && (
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {t('adminDetails.schools', { defaultValue: 'Muassasalar' })} ({schools.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schools.map((school) => (
              <div key={school.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-gray-900">{school.name}</h3>
                </div>
                {school.address && (
                  <p className="text-sm text-gray-600">{school.address}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Teachers */}
      {teachers.length > 0 && (
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {t('adminDetails.teachers', { defaultValue: 'O\'qituvchilar' })} ({teachers.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teachers.map((teacher) => (
              <div key={teacher.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <GraduationCap className="w-5 h-5 text-purple-600" />
                  <h3 className="font-bold text-gray-900">
                    {teacher.firstName} {teacher.lastName}
                  </h3>
                </div>
                <p className="text-sm text-gray-600">{teacher.email}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Parents */}
      {parents.length > 0 && (
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {t('adminDetails.parents', { defaultValue: 'Ota-onalar' })} ({parents.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {parents.map((parent) => (
              <div key={parent.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <User className="w-5 h-5 text-orange-600" />
                  <h3 className="font-bold text-gray-900">
                    {parent.firstName} {parent.lastName}
                  </h3>
                </div>
                <p className="text-sm text-gray-600">{parent.email}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Children */}
      {children.length > 0 && (
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {t('adminDetails.students', { defaultValue: 'O\'quvchilar' })} ({children.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {children.map((child) => (
              <div key={child.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Baby className="w-5 h-5 text-pink-600" />
                  <h3 className="font-bold text-gray-900">
                    {child.firstName} {child.lastName}
                  </h3>
                </div>
                {child.birthDate && (
                  <p className="text-sm text-gray-600">
                    {t('adminDetails.birthDate', { defaultValue: "Tug'ilgan" })}: {new Date(child.birthDate).toLocaleDateString(i18n.language)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdminDetails;
