import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import * as cache from '../../../shared/utils/cache';
import { useToast } from '@shared/context/ToastContext';
import { ArrowLeft, GraduationCap } from 'lucide-react';

const TeacherDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { error: toastError } = useToast();
  const toastErrorRef = useRef(toastError);
  toastErrorRef.current = toastError;

  const cacheKey = `admin:teacher:${id}`;
  const [teacher, setTeacher] = useState(() => cache.get(cacheKey) ?? null);
  const [loading, setLoading] = useState(!cache.get(cacheKey));

  useEffect(() => {
    const controller = new AbortController();

    const fetchTeacher = async () => {
      try {
        const res = await api.get(`/admin/teachers/${id}`, { signal: controller.signal });
        const data = res.data.data;
        cache.set(cacheKey, data);
        setTeacher(data);
      } catch (err) {
        if (err.code === 'ERR_CANCELED') return;
        toastErrorRef.current(t('teacherDetail.loadError', { defaultValue: 'Failed to load teacher' }));
      } finally {
        setLoading(false);
      }
    };

    if (cache.get(cacheKey)) {
      setLoading(false);
      fetchTeacher().catch(() => {});
    } else {
      fetchTeacher();
    }

    return () => controller.abort();
  }, [id, cacheKey, t]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
        <div className="skel h-8 w-48" />
        <div className="bg-surface border border-warm-200 rounded-lg p-6 space-y-3">
          <div className="skel h-12 w-12 rounded-full" />
          <div className="skel h-6 w-48" />
          <div className="skel h-4 w-64" />
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-warm-500">{t('teacherDetail.loadError', { defaultValue: 'Failed to load teacher' })}</p>
        <button onClick={() => navigate('/admin/teachers')} className="mt-4 text-brand-700 hover:underline text-sm">
          {t('teacherDetail.back', { defaultValue: 'Back to teachers' })}
        </button>
      </div>
    );
  }

  const groups = teacher.groups ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate('/admin/teachers')}
        className="inline-flex items-center gap-1.5 text-sm text-warm-600 hover:text-warm-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
        {t('teacherDetail.back', { defaultValue: 'Back to teachers' })}
      </button>

      {/* View-only notice */}
      <p className="text-xs text-warm-400 italic">
        {t('teacherDetail.viewOnly', { defaultValue: 'View only — managed by reception' })}
      </p>

      {/* Teacher card */}
      <div className="bg-surface border border-warm-200 rounded-lg p-6">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xl font-bold">
            {teacher.firstName?.charAt(0)}{teacher.lastName?.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-warm-900">
              {teacher.firstName} {teacher.lastName}
            </h1>
            <p className="text-sm text-warm-500">{teacher.email}</p>
            {teacher.phone && <p className="text-sm text-warm-500">{teacher.phone}</p>}
          </div>
        </div>
      </div>

      {/* Groups */}
      <div className="bg-surface border border-warm-200 rounded-lg">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-warm-100">
          <GraduationCap className="w-5 h-5 text-warm-500" strokeWidth={1.75} />
          <p className="font-semibold text-warm-900">
            {t('teacherDetail.groups', { defaultValue: 'Assigned Groups' })}
          </p>
        </div>
        {groups.length === 0 ? (
          <p className="px-5 py-6 text-sm text-warm-400 text-center">
            {t('teacherDetail.noGroups', { defaultValue: 'No groups assigned' })}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-warm-100 text-left">
                <th className="px-5 py-3 font-medium text-warm-500">
                  {t('teacherDetail.groupName', { defaultValue: 'Group' })}
                </th>
                <th className="px-5 py-3 font-medium text-warm-500">
                  {t('teacherDetail.ageRange', { defaultValue: 'Age Range' })}
                </th>
                <th className="px-5 py-3 font-medium text-warm-500">
                  {t('teacherDetail.capacity', { defaultValue: 'Capacity' })}
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id} className="border-b border-warm-50 last:border-0">
                  <td className="px-5 py-3 text-warm-900 font-medium">{g.name}</td>
                  <td className="px-5 py-3 text-warm-600">{g.ageRange ?? '—'}</td>
                  <td className="px-5 py-3 text-warm-600 num">{g.capacity ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TeacherDetail;
