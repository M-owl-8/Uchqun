import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import { Users, Building2, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Students = () => {
  const { t } = useTranslation();
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/government/students?limit=500');
      const data = res.data?.data || {};
      setStudents(data.students || []);
      setTotal(data.total ?? 0);
    } catch (error) {
      setStudents([]);
      setTotal(0);
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t('studentsPage.title', { defaultValue: 'Barcha o\'quvchilar' })}
        </h1>
        <p className="text-gray-600">
          {t('studentsPage.subtitle', { defaultValue: 'Tizimdagi barcha o\'quvchilar ro\'yxati' })}
        </p>
      </div>

      <Card className="p-6">
        <p className="text-sm text-gray-600 mb-1">
          {t('studentsPage.total', { defaultValue: 'Jami o\'quvchilar' })}
        </p>
        <p className="text-2xl font-bold text-gray-900">{total}</p>
      </Card>

      {students.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">
              {t('studentsPage.notFound', { defaultValue: 'O\'quvchilar topilmadi' })}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((student) => (
            <Card key={student.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900">
                    {student.firstName} {student.lastName}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                    <Building2 className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{student.schoolName || student.school || '—'}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('studentsPage.parent', { defaultValue: 'Ota-ona' })}: {student.parentName || '—'}
                  </p>
                  {student.dateOfBirth && (
                    <p className="text-xs text-gray-500">
                      {t('studentsPage.dob', { defaultValue: 'Tug\'ilgan sana' })}: {student.dateOfBirth}
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

export default Students;
