import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, Plus } from 'lucide-react';
import { ChildAvatar } from '../components/ChildAvatar';
import { useChildRibbon } from '../hooks/useChildRibbon';
import api from '../shared/services/api';

const TABS = [
  { key: 'iep',       label: 'IEP Maqsadlar' },
  { key: 'obs',       label: 'Kuzatuvlar' },
  { key: 'docs',      label: 'Hujjatlar' },
  { key: 'messages',  label: 'Xabarlar' },
  { key: 'gallery',   label: 'Galereya' },
];

const OUTCOME_CONFIG = {
  mastered:    { label: 'Mahorat erishildi', bg: '#E2F0E8', color: '#4F8C72', border: '#A8D2BC' },
  independent: { label: 'Mustaqil',          bg: '#E2F0E8', color: '#4F8C72', border: '#A8D2BC' },
  assisted:    { label: 'Yordam bilan',      bg: '#FBF3E4', color: '#8E6314', border: '#F0DBA8' },
  emerging:    { label: 'Yangi',             bg: '#F6F3FB', color: '#5F567F', border: '#D8CFE5' },
  struggling:  { label: 'Qiynalmoqda',      bg: '#FBF3E4', color: '#8E6314', border: '#F0DBA8' },
};

function OutcomeChip({ outcome }) {
  const o = OUTCOME_CONFIG[outcome] || OUTCOME_CONFIG.emerging;
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{ background: o.bg, color: o.color, border: `1px solid ${o.border}` }}
    >
      {o.label}
    </span>
  );
}

// 12-square heatmap for goal progress
function GoalHeatmap({ records = [] }) {
  const last12 = records.slice(-12);
  return (
    <div className="flex gap-1">
      {[...Array(12)].map((_, i) => {
        const r = last12[i];
        let bg = '#EDEFF2'; // empty
        if (r) {
          if (r.outcome === 'mastered' || r.outcome === 'independent') bg = '#7AB89A';
          else if (r.outcome === 'assisted') bg = '#C58A1F';
          else bg = '#BFB2D3';
        }
        return (
          <span
            key={i}
            className="w-4 h-4 rounded-sm"
            style={{ background: bg }}
            title={r ? `${r.date}: ${r.outcome}` : 'Ma\'lumot yo\'q'}
          />
        );
      })}
    </div>
  );
}

function IEPTab({ child, goals }) {
  if (!goals || goals.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-brand-50 grid place-items-center mx-auto">
          <Plus className="w-5 h-5 text-brand-600" strokeWidth={1.75} />
        </div>
        <div className="mt-3 text-[15px] font-semibold text-slate-900">Hozircha maqsad yo'q</div>
        <p className="mt-1 text-[13px] text-slate-500">Birinchi IEP maqsadini qo'shing</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {goals.map(goal => {
        const isMastered  = goal.status === 'mastered';
        const isStruggling = goal.lastOutcome === 'struggling' || goal.lastOutcome === 'assisted';

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
                    {goal.category || 'Maqsad'}
                  </span>
                  {isMastered && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-mint-100 text-mint-700">
                      Mahorat erishildi
                    </span>
                  )}
                  {isStruggling && !isMastered && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-warning-50 text-warning-700">
                      Yordam kerak
                    </span>
                  )}
                </div>
                <div className="mt-1 text-[15px] font-semibold text-slate-900">{goal.title}</div>
                {goal.description && (
                  <p className="mt-1 text-[13px] text-slate-600">{goal.description}</p>
                )}
              </div>
              <OutcomeChip outcome={goal.lastOutcome || 'emerging'} />
            </div>

            {/* Heatmap */}
            <div className="mt-3">
              <div className="text-[11px] text-slate-500 mb-1">So'nggi 12 kuzatuv</div>
              <GoalHeatmap records={goal.recentObservations || []} />
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Link
                to={`/teacher/activities?childId=${child?.id}&goalId=${goal.id}`}
                className="h-8 px-3 rounded-md border border-slate-200 bg-surface text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2} /> Yangi kuzatuv
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const ChildDetail = () => {
  const { id } = useParams();
  const [child, setChild]   = useState(null);
  const [goals, setGoals]   = useState([]);
  const [tab, setTab]       = useState('iep');
  const [loading, setLoading] = useState(true);

  const ribbon = useChildRibbon(child);

  useEffect(() => {
    const loadChild = async () => {
      try {
        const [childRes, goalsRes] = await Promise.allSettled([
          api.get(`/teacher/children/${id}`),
          api.get(`/teacher/children/${id}/goals`), // TODO(phase-2)
        ]);
        if (childRes.status === 'fulfilled') {
          setChild(childRes.value.data?.data || childRes.value.data);
        }
        if (goalsRes.status === 'fulfilled') {
          const gList = goalsRes.value.data?.data || goalsRes.value.data || [];
          setGoals(Array.isArray(gList) ? gList : []);
        }
      } catch {
        // graceful fallback
      } finally {
        setLoading(false);
      }
    };
    loadChild();
  }, [id]);

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
        <div className="text-[15px] text-slate-500">Bola topilmadi</div>
        <Link to="/teacher/parents" className="mt-3 text-[13px] text-brand-700 font-medium hover:underline">
          ← Ro'yxatga qaytish
        </Link>
      </div>
    );
  }

  const parentPhone = child.parentPhone || child.parent?.phone;
  const parentEmail = child.parentEmail || child.parent?.email;
  const parentName  = child.parentName  || child.parent?.name || 'Ota-ona';

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Back */}
      <Link
        to="/teacher/parents"
        className="inline-flex items-center gap-1.5 text-[13px] text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={1.75} /> Guruh ro'yxati
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
                Tibbiy eslatma
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
              to={`/teacher/activities?childId=${id}`}
              className="h-9 px-3.5 rounded-md bg-brand-600 hover:bg-brand-700 text-surface text-[13px] font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" strokeWidth={2} /> Yangi kuzatuv
            </Link>
            <Link
              to={`/teacher/chat?parentId=${child.parentId}`}
              className="h-9 px-3.5 rounded-md border border-slate-200 bg-surface hover:bg-slate-50 text-[13px] font-medium text-slate-700 flex items-center gap-1.5 transition-colors"
            >
              Ota-onaga yozish
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
          <div className="text-[11px] uppercase tracking-[.14em] text-warning-700 font-medium mb-1">Tibbiy eslatma</div>
          {child.medicalNote}
        </div>
      )}

      {/* Tabs */}
      <div>
        <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className="px-3 pb-3 text-[13px] font-medium relative whitespace-nowrap transition-colors"
              style={
                tab === t.key
                  ? { color: '#5F567F' }
                  : { color: '#6F7585' }
              }
            >
              {t.label}
              {tab === t.key && (
                <span
                  className="absolute left-0 right-0 -bottom-px h-[2px] rounded-full"
                  style={{ background: '#7A6FA8' }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'iep' && <IEPTab child={child} goals={goals} />}
        {tab === 'obs' && (
          <div className="py-8 text-center text-[13px] text-slate-500">
            Kuzatuvlar tez orada qo'shiladi
          </div>
        )}
        {tab === 'docs' && (
          <div className="py-8 text-center text-[13px] text-slate-500">
            Hujjatlar tez orada qo'shiladi
          </div>
        )}
        {tab === 'messages' && (
          <div className="py-8 text-center">
            <Link to="/teacher/chat" className="text-[13px] text-brand-700 font-medium hover:underline">
              Chat sahifasiga o'tish →
            </Link>
          </div>
        )}
        {tab === 'gallery' && (
          <div className="py-8 text-center">
            <Link to="/teacher/media" className="text-[13px] text-brand-700 font-medium hover:underline">
              Galereya sahifasiga o'tish →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChildDetail;
