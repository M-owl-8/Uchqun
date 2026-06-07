// CROSS-IRR-VISIBILITY — government's child detail page.
//
// New page. Mounted at /government/children/:id. Region-scoped on the
// backend; this page just renders what the controller returns.
//
// Surfaces:
//   - Hero strip (child name, dob, school, region context)
//   - Basic info card (diagnosis, parent, group/teacher)
//   - IRRSummary (read-only, aggregate only — no per-criterion scores;
//     no inline sign — government doesn't counter-sign IRRs)

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, User, Calendar, Heart, ShieldAlert, Building2 } from 'lucide-react';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import IRRSummary from '@shared/components/IRRSummary';
import { formatDateMedium } from '@shared/utils/formatDate';
import api from '../services/api';

const ChildDetail = () => {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const [child, setChild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.get(`/government/children/${id}`)
      .then((res) => {
        if (!alive) return;
        setChild(res.data?.data || null);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err?.response?.data?.error?.code || 'CHILD_FETCH_FAILED');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !child) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <Link to="/government/students" className="inline-flex items-center gap-1 text-[13px] text-brand-700 hover:underline mb-4">
          <ArrowLeft className="w-4 h-4" />
          {t('childDetail.back', { defaultValue: 'Bolalar roʻyxatiga qaytish' })}
        </Link>
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <ShieldAlert className="w-10 h-10 mx-auto mb-3 text-slate-400" />
          <h2 className="text-[16px] font-semibold text-slate-900">
            {t(`error.${error}`, { defaultValue: t('childDetail.notFoundTitle', { defaultValue: 'Bola topilmadi' }) })}
          </h2>
          <p className="text-[13px] text-slate-500 mt-1">
            {t('childDetail.notFoundHint', { defaultValue: 'Ushbu bola sizning hududingizdagi maktab boʻyicha mavjud emas.' })}
          </p>
        </div>
      </div>
    );
  }

  const initials = `${(child.firstName || '').charAt(0)}${(child.lastName || '').charAt(0)}`.toUpperCase();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link to="/government/students" className="inline-flex items-center gap-1 text-[13px] text-brand-700 hover:underline">
        <ArrowLeft className="w-4 h-4" />
        {t('childDetail.back', { defaultValue: 'Bolalar roʻyxatiga qaytish' })}
      </Link>

      {/* Hero */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-brand-100 text-brand-700 grid place-items-center text-[18px] font-semibold shrink-0">
          {initials || '·'}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[20px] font-semibold text-slate-900 truncate">
            {child.firstName} {child.lastName}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-[13px] text-slate-500">
            {child.dateOfBirth && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatDateMedium(child.dateOfBirth, i18n.language)}
              </span>
            )}
            {child.school?.name && (
              <span className="inline-flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                {child.school.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Basic info */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-[14px] font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <User className="w-4 h-4 text-brand-500" />
          {t('childDetail.basicInfo', { defaultValue: "Asosiy ma'lumotlar" })}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
          {child.disabilityType && (
            <div className="flex items-start gap-2">
              <Heart className="w-3.5 h-3.5 text-error-500 mt-0.5" />
              <div>
                <p className="text-slate-500">{t('childDetail.diagnosis', { defaultValue: 'Tashxis' })}</p>
                <p className="text-slate-900 font-medium">{child.disabilityType}</p>
              </div>
            </div>
          )}
          {child.parent && (
            <div className="flex items-start gap-2">
              <User className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-slate-500">{t('childDetail.parent', { defaultValue: 'Ota-ona' })}</p>
                <p className="text-slate-900 font-medium">
                  {child.parent.firstName} {child.parent.lastName}
                  {child.parent.phone && <span className="text-slate-500 ml-2">{child.parent.phone}</span>}
                </p>
              </div>
            </div>
          )}
          {child.group && (
            <div className="flex items-start gap-2">
              <Building2 className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-slate-500">{t('childDetail.group', { defaultValue: 'Guruh' })}</p>
                <p className="text-slate-900 font-medium">{child.group.name}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* IRR — read-only, aggregate only (Q2: government sees aggregate, not per-criterion) */}
      <IRRSummary
        api={api}
        childId={child.id}
        endpointBase="/government/children"
        t={t}
      />
    </div>
  );
};

export default ChildDetail;
