import { useState, useMemo } from 'react';
import { useFetch } from '@shared/hooks/useFetch';
import Card from '@shared/components/Card';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { Users, Building2, User, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Students = () => {
  const { t } = useTranslation();
  const { data, loading, error } = useFetch('/government/students?limit=100&page=1');
  const students = data?.students || [];
  const total = data?.total ?? 0;
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(s =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      (s.schoolName || s.school || '').toLowerCase().includes(q)
    );
  }, [students, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-inkGreen-900">
          {t('studentsPage.title', { defaultValue: "Barcha o'quvchilar" })}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {t('studentsPage.subtitle', { defaultValue: "Tizimdagi barcha o'quvchilar ro'yxati" })}
        </p>
      </div>

      <Card className="p-5">
        <p className="text-xs text-gray-500 mb-1">{t('studentsPage.total', { defaultValue: "Jami o'quvchilar" })}</p>
        <p className="text-2xl font-semibold text-inkGreen-900 tabular-nums">{total}</p>
      </Card>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('studentsPage.searchPlaceholder', { defaultValue: "Ism yoki maktab..." })}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              {t('studentsPage.notFound', { defaultValue: "O'quvchilar topilmadi" })}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((student) => (
            <Card key={student.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900">
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
