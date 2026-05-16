import { useState, useMemo } from 'react';
import { useFetch } from '@shared/hooks/useFetch';
import Card from '@shared/components/Card';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { GraduationCap, Mail, Phone, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Teachers = () => {
  const { t } = useTranslation();
  const { data, loading, error } = useFetch('/government/teachers?limit=100&page=1');
  const teachers = data?.teachers || [];
  const total = data?.total ?? 0;
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter(s =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q)
    );
  }, [teachers, search]);

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
          {t('teachersPage.title', { defaultValue: "Barcha o'qituvchilar" })}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {t('teachersPage.subtitle', { defaultValue: "Tizimdagi barcha o'qituvchilar ro'yxati" })}
        </p>
      </div>

      <Card className="p-5">
        <p className="text-xs text-gray-500 mb-1">{t('teachersPage.total', { defaultValue: "Jami o'qituvchilar" })}</p>
        <p className="text-2xl font-semibold text-inkGreen-900 tabular-nums">{total}</p>
      </Card>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('teachersPage.searchPlaceholder', { defaultValue: "Ism yoki email..." })}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <GraduationCap className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              {t('teachersPage.notFound', { defaultValue: "O'qituvchilar topilmadi" })}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((teacher) => (
            <Card key={teacher.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-6 h-6 text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900">
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
