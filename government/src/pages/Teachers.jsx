import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import { GraduationCap, Mail, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Teachers = () => {
  const { t } = useTranslation();
  const [teachers, setTeachers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/government/teachers?limit=100&page=1');
      const data = res.data?.data || {};
      setTeachers(data.teachers || []);
      setTotal(data.total ?? 0);
    } catch (error) {
      setTeachers([]);
      setTotal(0);
      setLoadError(error.response?.data?.error || t('common.loadError', { defaultValue: 'Failed to load data' }));
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

  if (loadError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-red-500">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t('teachersPage.title', { defaultValue: 'Barcha o\'qituvchilar' })}
        </h1>
        <p className="text-gray-600">
          {t('teachersPage.subtitle', { defaultValue: 'Tizimdagi barcha o\'qituvchilar ro\'yxati' })}
        </p>
      </div>

      <Card className="p-6">
        <p className="text-sm text-gray-600 mb-1">
          {t('teachersPage.total', { defaultValue: 'Jami o\'qituvchilar' })}
        </p>
        <p className="text-2xl font-bold text-gray-900">{total}</p>
      </Card>

      {teachers.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">
              {t('teachersPage.notFound', { defaultValue: 'O\'qituvchilar topilmadi' })}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teachers.map((teacher) => (
            <Card key={teacher.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900">
                    {teacher.firstName} {teacher.lastName}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{teacher.email || '—'}</span>
                  </p>
                  {teacher.phone && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {teacher.phone}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Teachers;
