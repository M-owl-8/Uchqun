import { useState, useCallback, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { GraduationCap, Search, Globe, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useRegionName } from '../hooks/useRegionName';

const LIMIT = 50;

const Students = () => {
  const { t } = useTranslation();
  const { isRepublic, isRegionAccount } = useAuth();
  const regionName = useRegionName();

  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');

  const load = useCallback(async (newOffset = 0) => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await api.get('/government/students', { params: { limit: LIMIT, offset: newOffset } });
      const data = res.data?.data || {};
      if (newOffset === 0) {
        setStudents(data.students || []);
      } else {
        setStudents((prev) => [...prev, ...(data.students || [])]);
      }
      setTotal(data.total || 0);
      setOffset(newOffset);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(0); }, [load]);

  const filtered = search.trim()
    ? students.filter((s) => {
        const q = search.toLowerCase();
        const name = `${s.firstName ?? ''} ${s.lastName ?? ''}`.toLowerCase();
        const school = (s.schoolName ?? '').toLowerCase();
        return name.includes(q) || school.includes(q);
      })
    : students;

  const canLoadMore = students.length < total;

  const subtitle = isRegionAccount && regionName
    ? t('studentsPage.subtitleRegion', { name: regionName, defaultValue: 'Students in {{name}}' })
    : t('studentsPage.subtitle', { defaultValue: 'All students registered in the system' });

  const emptyMessage = isRegionAccount && regionName && !search.trim()
    ? t('studentsPage.notFoundRegion', { name: regionName, defaultValue: 'No students in {{name}} yet' })
    : t('studentsPage.notFound', { defaultValue: 'No students found' });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-inkGreen-900">
          {t('studentsPage.title', { defaultValue: 'All Students' })}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
        <div className="flex items-center gap-1.5 mt-1" data-testid="scope-label">
          {isRepublic ? (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <Globe className="w-3 h-3" />
              {t('scope.national', { defaultValue: 'All regions' })}
            </span>
          ) : isRegionAccount && regionName ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200">
              <MapPin className="w-3 h-3" />
              {regionName}
            </span>
          ) : null}
        </div>
      </div>

      {/* Search + total */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('studentsPage.searchPlaceholder', { defaultValue: 'Name or school...' })}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
          />
        </div>
        {!loading && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-brand-50 text-brand-700 border border-brand-200 flex-shrink-0">
            {total} {t('studentsPage.total', { defaultValue: 'Total students' })}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="bg-paper-card border border-gray-200 rounded-lg overflow-hidden">
        {loading && students.length === 0 ? (
          <div className="flex items-center justify-center py-16" data-testid="loading">
            <LoadingSpinner size="lg" />
          </div>
        ) : loadError ? (
          <div className="py-16 text-center text-sm text-red-500" data-testid="error">
            {t('common.error', { defaultValue: 'An error occurred' })}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center" data-testid="empty">
            <GraduationCap className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">{emptyMessage}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100 bg-paper-deep">
                <th className="text-left px-5 py-3 font-medium">#</th>
                <th className="text-left px-5 py-3 font-medium">{t('colName', { defaultValue: 'Name' })}</th>
                <th className="text-left px-5 py-3 font-medium hidden sm:table-cell">{t('studentsPage.dob', { defaultValue: 'Date of birth' })}</th>
                <th className="text-left px-5 py-3 font-medium hidden md:table-cell">{t('studentsPage.school', { defaultValue: 'School' })}</th>
                <th className="text-left px-5 py-3 font-medium hidden lg:table-cell">{t('studentsPage.parent', { defaultValue: 'Parent' })}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-brand-50 transition-colors">
                  <td className="px-5 py-3 text-gray-400 tabular-nums">{i + 1}</td>
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {s.firstName} {s.lastName}
                    {s.gender && <span className="ml-2 text-xs text-gray-400">{t(`gender.${s.gender.toLowerCase()}`, { defaultValue: s.gender })}</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-500 hidden sm:table-cell tabular-nums">
                    {s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-500 hidden md:table-cell">{s.schoolName || '—'}</td>
                  <td className="px-5 py-3 text-gray-500 hidden lg:table-cell">{s.parentName || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Load more */}
      {canLoadMore && !search.trim() && (
        <div className="flex justify-center">
          <button
            onClick={() => load(offset + LIMIT)}
            disabled={loading}
            className="px-5 py-2 text-sm font-medium text-brand-600 border border-brand-200 rounded-md hover:bg-brand-50 transition-colors disabled:opacity-50"
          >
            {loading ? <LoadingSpinner size="xs" /> : t('studentsPage.loadMore', { defaultValue: 'Load more' })}
          </button>
        </div>
      )}
    </div>
  );
};

export default Students;
