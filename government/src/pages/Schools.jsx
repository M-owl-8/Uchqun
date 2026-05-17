import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '@shared/hooks/useFetch';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { Building2, Star, Search, ChevronRight, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Schools = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, loading, error } = useFetch('/government/schools');
  const schools = data?.schools || [];

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const exportCSV = () => {
    const rows = [
      ['#', 'Name', 'Address', 'Type', 'Region', 'Students', 'Teachers', 'Rating', 'Ratings Count'],
      ...filtered.map((s, i) => [
        i + 1, s.name || '', s.address || '', s.type || '', s.region || '',
        s.studentsCount || 0, s.teachersCount || 0,
        (s.averageRating || 0).toFixed(2), s.ratingsCount || 0,
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/[\r\n]+/g, ' ').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schools-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(() => {
    let result = schools;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s => s.name?.toLowerCase().includes(q) || s.address?.toLowerCase().includes(q));
    }
    if (typeFilter) {
      result = result.filter(s => s.type === typeFilter);
    }
    return result.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
  }, [schools, search, typeFilter]);

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
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  const typeLabel = (type) => {
    if (type === 'school') return t('schools.typeSchool', { defaultValue: 'Maktab' });
    if (type === 'kindergarten') return t('schools.typeKindergarten', { defaultValue: "Bog'cha" });
    if (type === 'both') return t('schools.typeBoth', { defaultValue: 'Aralash' });
    return type || '\u2014';
  };

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-inkGreen-900">
            {t('schools.title', { defaultValue: 'Muassasalar' })}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('schools.subtitle', { defaultValue: 'Barcha muassasalar va ularning baholari' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-brand-50 text-brand-700 border border-brand-200">
            {schools.length}
          </span>
          {filtered.length > 0 && (
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              {t('schools.exportCSV', { defaultValue: 'CSV' })}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('schools.searchPlaceholder', { defaultValue: 'Muassasa nomi yoki manzili...' })}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
        >
          <option value="">{t('schools.allTypes', { defaultValue: 'Barcha turlar' })}</option>
          <option value="school">{t('schools.typeSchool', { defaultValue: 'Maktab' })}</option>
          <option value="kindergarten">{t('schools.typeKindergarten', { defaultValue: "Bog'cha" })}</option>
          <option value="both">{t('schools.typeBoth', { defaultValue: 'Aralash' })}</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-paper-card border border-gray-200 rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              {t('schools.notFound', { defaultValue: 'Muassasalar topilmadi' })}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100 bg-paper-deep">
                <th className="text-left px-5 py-3 font-medium">#</th>
                <th className="text-left px-5 py-3 font-medium">{t('schools.colName', { defaultValue: 'Muassasa' })}</th>
                <th className="text-left px-5 py-3 font-medium hidden md:table-cell">{t('schools.colType', { defaultValue: 'Tur' })}</th>
                <th className="text-left px-5 py-3 font-medium hidden sm:table-cell">{t('schools.colStudents', { defaultValue: "O'quvchilar" })}</th>
                <th className="text-left px-5 py-3 font-medium">{t('schools.colRating', { defaultValue: 'Reyting' })}</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((school, index) => (
                <tr
                  key={school.id}
                  onClick={() => navigate(`/government/schools/${school.id}`)}
                  className="border-b border-gray-50 last:border-0 hover:bg-brand-50 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3.5 text-gray-400 tabular-nums">{index + 1}</td>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-gray-900">{school.name}</p>
                    {school.address && <p className="text-xs text-gray-400 mt-0.5">{school.address}</p>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 hidden md:table-cell">{typeLabel(school.type)}</td>
                  <td className="px-5 py-3.5 text-gray-500 tabular-nums hidden sm:table-cell">{school.studentsCount || 0}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold tabular-nums text-gray-900">{(school.averageRating || 0).toFixed(1)}</span>
                      <span className="text-xs text-gray-400">({school.ratingsCount || 0})</span>
                    </div>
                  </td>
                  <td className="px-3">
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-paper-deep flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {filtered.length} / {schools.length} {t('schools.shown', { defaultValue: "ko'rsatilmoqda" })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Schools;
