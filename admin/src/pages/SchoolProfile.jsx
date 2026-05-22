import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import * as cache from '../../../shared/utils/cache';
import { useToast } from '@shared/context/ToastContext';

const CACHE_KEY = 'admin:school-profile';

const SchoolProfile = () => {
  const { t } = useTranslation();
  const { success: toastSuccess, error: toastError } = useToast();

  const [school, setSchool] = useState(() => cache.get(CACHE_KEY) ?? null);
  const [loading, setLoading] = useState(!cache.get(CACHE_KEY));
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState({ phone: '', email: '', address: '', description: '', director: '' });

  useEffect(() => {
    const controller = new AbortController();

    const fetchSchool = async () => {
      try {
        const res = await api.get('/admin/school', { signal: controller.signal });
        const data = res.data.data;
        cache.set(CACHE_KEY, data);
        setSchool(data);
        setEditing({
          phone: data.phone ?? '',
          email: data.email ?? '',
          address: data.address ?? '',
          description: data.description ?? '',
          director: data.director ?? '',
        });
      } catch (err) {
        if (err.code === 'ERR_CANCELED') return;
        toastError(t('schoolProfile.loadError', { defaultValue: 'Failed to load school profile' }));
      } finally {
        setLoading(false);
      }
    };

    const cached = cache.get(CACHE_KEY);
    if (cached) {
      setEditing({
        phone: cached.phone ?? '',
        email: cached.email ?? '',
        address: cached.address ?? '',
        description: cached.description ?? '',
        director: cached.director ?? '',
      });
      setLoading(false);
      fetchSchool().catch(() => {});
    } else {
      fetchSchool();
    }

    return () => controller.abort();
  }, [t, toastError]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.patch('/admin/school', {
        phone: editing.phone,
        email: editing.email,
        address: editing.address,
        description: editing.description,
        director: editing.director,
      });
      const data = res.data.data;
      cache.set(CACHE_KEY, data);
      setSchool(data);
      toastSuccess(t('schoolProfile.saveSuccess', { defaultValue: 'School profile updated' }));
    } catch {
      toastError(t('schoolProfile.saveError', { defaultValue: 'Failed to save changes' }));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
        <div className="skel h-8 w-64 mb-2" />
        <div className="skel h-4 w-96" />
        <div className="bg-surface border border-warm-200 rounded-lg p-6 space-y-3">
          {[1,2,3].map((i) => <div key={i} className="skel h-4 w-full" />)}
        </div>
        <div className="bg-surface border border-warm-200 rounded-lg p-6 space-y-3">
          {[1,2,3,4,5].map((i) => <div key={i} className="skel h-10 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-warm-900">
          {school?.name ?? t('schoolProfile.title', { defaultValue: 'School Profile' })}
        </h1>
        <p className="text-warm-500 mt-1">{t('schoolProfile.subtitle', { defaultValue: "View and update your school's contact information" })}</p>
        <div className="flex items-center gap-2 mt-3">
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-warm-100 text-warm-700">
            {school?.type ?? '—'}
          </span>
          {school?.isActive ? (
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
              {t('schoolProfile.statusActive', { defaultValue: 'Active' })}
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
              {t('schoolProfile.statusArchived', { defaultValue: 'Archived' })}
            </span>
          )}
        </div>
      </div>

      {/* Government-controlled read-only section */}
      <div className="bg-warm-50 border border-warm-200 rounded-lg p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-warm-500 mb-4">
          {t('schoolProfile.readOnly', { defaultValue: 'Government-controlled (read only)' })}
        </p>
        <dl className="grid sm:grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-warm-500 mb-0.5">{t('schoolProfile.region', { defaultValue: 'Region' })}</dt>
            <dd className="font-medium text-warm-900">{school?.region?.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-warm-500 mb-0.5">{t('schoolProfile.category', { defaultValue: 'Category' })}</dt>
            <dd className="font-medium text-warm-900">{school?.category?.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-warm-500 mb-0.5">{t('schoolProfile.type', { defaultValue: 'Type' })}</dt>
            <dd className="font-medium text-warm-900">{school?.type ?? '—'}</dd>
          </div>
        </dl>
      </div>

      {/* Editable contact section */}
      <div className="bg-surface border border-warm-200 rounded-lg p-5 space-y-4">
        {[
          { key: 'phone', label: t('schoolProfile.phone', { defaultValue: 'Phone' }), type: 'text' },
          { key: 'email', label: t('schoolProfile.email', { defaultValue: 'Email' }), type: 'email' },
          { key: 'address', label: t('schoolProfile.address', { defaultValue: 'Address' }), type: 'text' },
          { key: 'director', label: t('schoolProfile.director', { defaultValue: 'Director' }), type: 'text' },
        ].map(({ key, label, type }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-warm-700 mb-1">{label}</label>
            <input
              type={type}
              value={editing[key]}
              onChange={(e) => setEditing((prev) => ({ ...prev, [key]: e.target.value }))}
              className="w-full px-3 py-2 border border-warm-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        ))}
        <div>
          <label className="block text-sm font-medium text-warm-700 mb-1">
            {t('schoolProfile.description', { defaultValue: 'Description' })}
          </label>
          <textarea
            value={editing.description}
            onChange={(e) => setEditing((prev) => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-warm-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>

        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
          >
            {saving
              ? t('schoolProfile.saving', { defaultValue: 'Saving…' })
              : t('schoolProfile.save', { defaultValue: 'Save Changes' })}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SchoolProfile;
