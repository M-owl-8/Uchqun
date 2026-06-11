import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, Plus, FileText } from 'lucide-react';
import { ChildAvatar } from '../components/ChildAvatar';
import { useChildRibbon } from '../hooks/useChildRibbon';
import { useTranslation } from 'react-i18next';
import api from '../shared/services/api';
import { useToast } from '../shared/context/ToastContext';

const TABS = [
  { key: 'iep',      labelKey: 'childDetail.tab.iep' },
  { key: 'docs',     labelKey: 'childDetail.tab.docs' },
  { key: 'messages', labelKey: 'childDetail.tab.messages' },
  { key: 'gallery',  labelKey: 'childDetail.tab.gallery' },
];

function IEPTab({ goals }) {
  const { t } = useTranslation();
  if (!goals || goals.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-brand-50 grid place-items-center mx-auto">
          <Plus className="w-5 h-5 text-brand-600" strokeWidth={1.75} />
        </div>
        <div className="mt-3 text-[15px] font-semibold text-slate-900">{t('childDetail.empty.noGoalsTitle')}</div>
        <p className="mt-1 text-[13px] text-slate-500">{t('childDetail.empty.noGoalsBody')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {goals.map(goal => {
        const isMastered = goal.status === 'mastered';
        return (
          <div
            key={goal.id}
            className="rounded-lg border p-5"
            style={
              isMastered
                ? { background: 'rgba(226,240,232,.40)', borderColor: '#A8D2BC' }
                : { background: '#FFFFFE', borderColor: '#DDE0E6' }
            }
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-medium">
                    {goal.category || t('childDetail.label.goalDefault')}
                  </span>
                  {isMastered && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-mint-100 text-mint-700">
                      {t('childDetail.badge.mastered')}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-[15px] font-semibold text-slate-900">{goal.title}</div>
                {goal.description && (
                  <p className="mt-1 text-[13px] text-slate-600">{goal.description}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const ChildDetail = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const { error: showError } = useToast();
  const [child, setChild]   = useState(null);
  const [goals, setGoals]   = useState([]);
  const [irr, setIrr]       = useState(null);
  const [tab, setTab]       = useState('iep');
  const [loading, setLoading] = useState(true);

  const ribbon = useChildRibbon(child);

  useEffect(() => {
    const loadChild = async () => {
      try {
        const [childRes, goalsRes, irrRes] = await Promise.allSettled([
          api.get(`/teacher/children/${id}`),
          api.get(`/teacher/children/${id}/goals`), // final endpoint (teacherRoutes.js — confirmed S29)
          api.get(`/teacher/children/${id}/irr`),
        ]);
        if (childRes.status === 'fulfilled') {
          setChild(childRes.value.data?.data || childRes.value.data);
        }
        if (goalsRes.status === 'fulfilled') {
          const gList = goalsRes.value.data?.data || goalsRes.value.data || [];
          setGoals(Array.isArray(gList) ? gList : []);
        }
        if (irrRes.status === 'fulfilled') {
          setIrr(irrRes.value.data?.data || null);
        } else if (irrRes.reason?.response?.status !== 404) {
          showError(t('childDetail.errorIrrLoad'));
        }
      } catch {
        // graceful fallback
      } finally {
        setLoading(false);
      }
    };
    loadChild();
  }, [id, showError, t]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="skel h-40 rounded-2xl" />
        <div className="skel h-8 rounded-md" />
        <div className="skel h-32 rounded-lg" />
      </div>
    );
  }

  if (!child) {
    return (
      <div className="text-center py-16">
        <div className="text-[15px] text-slate-500">{t('childDetail.empty.noChild')}</div>
        <Link to="/teacher/bolalar" className="mt-3 text-[13px] text-brand-700 font-medium hover:underline">
          ← Ro&apos;yxatga qaytish
        </Link>
      </div>
    );
  }

  const parentPhone = child.parentPhone || child.parent?.phone;
  const parentEmail = child.parentEmail || child.parent?.email;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Back */}
      <Link
        to="/teacher/bolalar"
        className="inline-flex items-center gap-1.5 text-[13px] text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={1.75} /> {t('childDetail.button.parentList')}
      </Link>

      {/* Hero card */}
      <div
        className="rounded-2xl border border-slate-200 bg-surface shadow-sm p-6 flex flex-col sm:flex-row items-start gap-5"
        style={{ borderLeft: `6px solid ${ribbon.hex}` }}
      >
        <ChildAvatar child={child} size="xl" shape="square" />
        <div className="flex-1 min-w-0">
          <h1 className="text-[22px] font-semibold text-slate-900">
            {child.firstName} {child.lastName}
          </h1>
          <div className="mt-1 text-[13px] text-slate-500">
            {child.age ? `${child.age} yosh · ` : ''}
            {child.groupName || ''}
          </div>

          {/* Status badges */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {child.diagnosis && (
              <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[11px] font-medium">
                {child.diagnosis}
              </span>
            )}
            {child.iepActive && (
              <span className="px-2 py-0.5 rounded-full bg-mint-100 text-mint-700 text-[11px] font-medium">
                IEP faol
              </span>
            )}
            {child.medicalNote && (
              <span className="px-2 py-0.5 rounded-full bg-warning-50 text-warning-700 text-[11px] font-medium">
                {t('childDetail.label.medicalNote')}
              </span>
            )}
          </div>

          {/* Parent contact — Fix A: plain mailto links, no Cloudflare obfuscation */}
          <div className="mt-4 flex flex-wrap gap-3">
            {parentPhone && (
              <a
                href={`tel:${parentPhone}`}
                className="flex items-center gap-1.5 text-[13px] text-brand-700 hover:text-brand-800 font-medium"
              >
                <Phone className="w-4 h-4" strokeWidth={1.75} /> {parentPhone}
              </a>
            )}
            {parentEmail && (
              <a
                href={`mailto:${parentEmail}`}
                className="flex items-center gap-1.5 text-[13px] text-brand-700 hover:text-brand-800 font-medium"
              >
                <Mail className="w-4 h-4" strokeWidth={1.75} /> {parentEmail}
              </a>
            )}
          </div>

          {/* CTA buttons */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to={`/teacher/chat?parentId=${child.parentId}`}
              className="h-9 px-3.5 rounded-md border border-slate-200 bg-surface hover:bg-slate-50 text-[13px] font-medium text-slate-700 flex items-center gap-1.5 transition-colors"
            >
              Ota-onaga yozish
            </Link>
            <Link
              to={`/teacher/children/${id}/irr`}
              className="h-9 px-3.5 rounded-md border border-slate-200 bg-surface hover:bg-slate-50 text-[13px] font-medium text-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-4 h-4" strokeWidth={1.75} />
              {irr ? t('childDetail.button.viewIrr') : t('childDetail.button.createIrr')}
            </Link>
          </div>
        </div>
      </div>

      {/* Medical note (if any) */}
      {child.medicalNote && (
        <div
          className="rounded-lg border p-4 text-[13px] text-slate-800"
          style={{ background: '#FBF3E4', borderColor: '#F0DBA8' }}
        >
          <div className="text-[11px] uppercase tracking-[.14em] text-warning-700 font-medium mb-1">{t('childDetail.label.medicalNote')}</div>
          {child.medicalNote}
        </div>
      )}

      {/* Tabs */}
      <div>
        <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto">
          {TABS.map(tab_ => (
            <button
              key={tab_.key}
              type="button"
              onClick={() => setTab(tab_.key)}
              className="px-3 pb-3 text-[13px] font-medium relative whitespace-nowrap transition-colors"
              style={
                tab === tab_.key
                  ? { color: '#5F567F' }
                  : { color: '#6F7585' }
              }
            >
              {t(tab_.labelKey)}
              {tab === tab_.key && (
                <span
                  className="absolute left-0 right-0 -bottom-px h-[2px] rounded-full"
                  style={{ background: '#7A6FA8' }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'iep' && <IEPTab goals={goals} />}
        {tab === 'docs' && (
          <div className="py-8 text-center text-[13px] text-slate-500">
            {t('childDetail.empty.docsComingSoon')}
          </div>
        )}
        {tab === 'messages' && (
          <div className="py-8 text-center">
            <Link to="/teacher/xabar?tab=chat" className="text-[13px] text-brand-700 font-medium hover:underline">
              Chat sahifasiga o&apos;tish →
            </Link>
          </div>
        )}
        {tab === 'gallery' && (
          <div className="py-8 text-center">
            <Link to="/teacher/media" className="text-[13px] text-brand-700 font-medium hover:underline">
              {t('childDetail.empty.galleryRedirect')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChildDetail;
