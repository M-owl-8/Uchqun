import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, ArrowRight, Plus, MessageSquare } from 'lucide-react';
import { ChildAvatar } from '../components/ChildAvatar';
import { useChildRibbon } from '../hooks/useChildRibbon';
import { SkeletonDashboard } from '../../../shared/components/Skeleton';
import { useAuth } from '../shared/context/AuthContext';
import api from '../shared/services/api';
import * as cache from '../../../shared/utils/cache';

const CACHE_KEY = 'teacher:dashboard:v2';
const CACHE_TTL = 90_000;

const STATE_COLORS = {
  present: '#7AB89A',
  absent:  '#959BA8',
  late:    '#C58A1F',
  sick:    '#4D6584',
};

const OUTCOME_BADGES = {
  independent: { label: 'Mustaqil',     bg: '#E2F0E8', color: '#4F8C72' },
  assisted:    { label: 'Yordam bilan', bg: '#FBF3E4', color: '#8E6314' },
  emerging:    { label: 'Yangi',        bg: '#F6F3FB', color: '#5F567F' },
  mastered:    { label: 'Mahorat',      bg: '#E2F0E8', color: '#4F8C72' },
};

function OutcomePill({ outcome }) {
  const o = OUTCOME_BADGES[outcome] || OUTCOME_BADGES.emerging;
  return (
    <span
      className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
      style={{ background: o.bg, color: o.color }}
    >
      {o.label}
    </span>
  );
}

function ChildStateDot({ state }) {
  return (
    <span
      className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-surface"
      style={{ background: STATE_COLORS[state] || STATE_COLORS.absent }}
    />
  );
}

function ObservationRow({ obs }) {
  const ribbon = useChildRibbon(obs.child);
  return (
    <div
      className="rounded-md flex items-center gap-2.5 p-2 hover:bg-slate-50 transition-colors"
      style={{ borderLeft: `3px solid ${ribbon.hex}` }}
    >
      <ChildAvatar child={obs.child} size="xs" />
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-medium text-slate-900 truncate">
          {obs.child?.firstName} {obs.child?.lastName?.charAt(0)}. · {obs.goalLabel}
        </div>
        <div className="text-[10px] text-slate-500">{obs.note}</div>
      </div>
      <OutcomePill outcome={obs.outcome} />
      <span className="text-[10px] text-slate-400 tnum ml-1">{obs.time}</span>
    </div>
  );
}

function AttentionCard({ item }) {
  const ribbon = useChildRibbon(item.child);
  return (
    <div
      className="rounded-lg border border-slate-200 bg-surface shadow-xs p-4 flex items-center gap-4"
      style={item.child ? { borderLeft: `3px solid ${ribbon.hex}` } : {}}
    >
      <ChildAvatar child={item.child} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-medium text-slate-900">{item.title}</div>
        <div className="text-[12px] text-slate-500 mt-0.5">{item.subtitle}</div>
      </div>
      {item.action && (
        <Link
          to={item.action.href}
          className="h-9 px-3 rounded-md bg-brand-600 text-surface text-[12px] font-medium flex items-center gap-1.5 shrink-0 hover:bg-brand-700 transition-colors"
        >
          {item.action.icon && <item.action.icon className="w-3.5 h-3.5" strokeWidth={2} />}
          {item.action.label}
        </Link>
      )}
    </div>
  );
}

function buildData(statsRes, childrenRes, obsRes) {
  const rawStats    = statsRes.status    === 'fulfilled' ? (statsRes.value.data?.data    || statsRes.value.data    || {}) : {};
  const rawChildren = childrenRes.status === 'fulfilled' ? (childrenRes.value.data?.data || childrenRes.value.data || []) : [];
  const rawObs      = obsRes.status      === 'fulfilled' ? (obsRes.value.data?.data      || obsRes.value.data      || []) : [];

  const attention = rawChildren
    .filter(c => c.attendanceState === 'absent' || c.needsAttention)
    .slice(0, 5)
    .map(c => ({
      child: c,
      title: c.attendanceState === 'absent'
        ? `${c.firstName} bugun yo'q`
        : `${c.firstName} · diqqat kerak`,
      subtitle: c.attendanceState === 'absent'
        ? "Ota-onaga sabab so'rab xabar yo'llang"
        : (c.attentionNote || ''),
      action: { href: '/teacher/chat', icon: MessageSquare, label: 'Xabar' },
    }));

  return {
    stats: {
      present:         rawStats.present         || rawChildren.filter(c => c.attendanceState === 'present').length || rawChildren.length,
      total:           rawStats.total            || rawChildren.length,
      parents:         rawStats.parents          || rawStats.unreadMessages || 0,
      activities:      rawStats.activities       || rawObs.length || 0,
      activitiesDelta: rawStats.activitiesDelta  || 0,
    },
    children: Array.isArray(rawChildren) ? rawChildren : [],
    observations: Array.isArray(rawObs) ? rawObs : [],
    attention,
  };
}

const FALLBACK_DATA = {
  stats:        { present: 0, total: 0, parents: 0, activities: 0, activitiesDelta: 0 },
  children:     [],
  observations: [],
  attention:    [],
};

const Dashboard = () => {
  const { user } = useAuth();
  const [data, setData]       = useState(() => cache.get(CACHE_KEY));
  const [loading, setLoading] = useState(!cache.get(CACHE_KEY));

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      const cached = cache.get(CACHE_KEY);
      if (cached) {
        setData(cached);
        setLoading(false);
        try {
          const [s, c, o] = await Promise.allSettled([
            api.get('/teacher/dashboard/counts',         { signal: controller.signal }),
            api.get('/teacher/children',                 { signal: controller.signal }), // TODO(phase-2)
            api.get('/teacher/observations/recent?limit=8', { signal: controller.signal }), // TODO(phase-2)
          ]);
          const fresh = buildData(s, c, o);
          cache.set(CACHE_KEY, fresh, CACHE_TTL);
          setData(fresh);
        } catch { /* stale data stays visible */ }
        return;
      }

      try {
        const [s, c, o] = await Promise.allSettled([
          api.get('/teacher/dashboard/counts',         { signal: controller.signal }),
          api.get('/teacher/children',                 { signal: controller.signal }), // TODO(phase-2)
          api.get('/teacher/observations/recent?limit=8', { signal: controller.signal }), // TODO(phase-2)
        ]);
        const fresh = buildData(s, c, o);
        cache.set(CACHE_KEY, fresh, CACHE_TTL);
        setData(fresh);
      } catch (err) {
        if (err.code === 'ERR_CANCELED') return;
        setData(FALLBACK_DATA);
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, []);

  if (loading) return <SkeletonDashboard stats={3} cards={3} />;

  const stats    = data?.stats        || {};
  const children = data?.children     || [];
  const obs      = data?.observations || [];
  const attention = data?.attention   || [];

  const today = new Date().toLocaleDateString('uz-UZ', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* ===== DESKTOP ===== */}
      <div className="hidden md:block">
        <div className="flex items-start gap-3">
          <h1
            className="text-[30px] font-semibold text-slate-900"
            style={{ borderLeft: '4px solid #7A6FA8', paddingLeft: '14px' }}
          >
            Bugun
          </h1>
          <p className="mt-2 text-[14px] text-slate-600 self-end">
            Xush kelibsiz, {user?.firstName} opa/aka.
            {children.length > 0 && ` "${children[0]?.groupName || ''}" guruhi · ${children.length} bola.`}
          </p>
          <div className="ml-auto text-right shrink-0">
            <div className="text-[13px] text-slate-500">{today}</div>
          </div>
          <Link
            to="/teacher/activities"
            className="h-9 px-3.5 rounded-md bg-brand-600 hover:bg-brand-700 text-surface text-[13px] font-medium flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" strokeWidth={2} /> Yangi yozuv
          </Link>
        </div>

        {/* Class at a glance */}
        {children.length > 0 && (
          <div className="mt-6 rounded-xl bg-surface border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] uppercase tracking-[.14em] text-slate-500">Sinf bir qarashda</div>
              <span className="text-[11px] text-slate-500 tnum">
                {stats.present || children.length}/{children.length} keldi
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {children.map((child) => (
                <Link key={child.id} to={`/teacher/children/${child.id}`} className="relative" title={`${child.firstName} ${child.lastName}`}>
                  <ChildAvatar child={child} size="sm" />
                  <ChildStateDot state={child.attendanceState || 'present'} />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 3-col stats */}
        <div className="mt-5 grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-surface border border-slate-200 shadow-xs p-5">
            <div className="text-[11px] uppercase tracking-[.14em] text-slate-500">Davomat</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-[28px] font-semibold text-slate-900 tnum leading-none">{stats.present || 0}</span>
              <span className="text-[14px] text-slate-500">/ {children.length || 0} keldi</span>
            </div>
            {children.length > 0 && (
              <>
                <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <span className="block h-full bg-mint-500" style={{ width: `${Math.round(((stats.present || 0) / (children.length || 1)) * 100)}%` }} />
                </div>
                <div className="mt-1 text-[11px] text-mint-700 font-medium">
                  {Math.round(((stats.present || 0) / (children.length || 1)) * 100)}% · normal
                </div>
              </>
            )}
          </div>

          <div className="rounded-lg bg-surface border border-slate-200 shadow-xs p-5">
            <div className="text-[11px] uppercase tracking-[.14em] text-slate-500">Kuzatuvlar bugun</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-[28px] font-semibold text-slate-900 tnum leading-none">{stats.activities || 0}</span>
              {stats.activitiesDelta > 0 && (
                <span className="text-[11px] text-mint-700 font-medium flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" strokeWidth={2} />
                  +{stats.activitiesDelta} vs kecha
                </span>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-surface border border-slate-200 shadow-xs p-5">
            <div className="text-[11px] uppercase tracking-[.14em] text-slate-500">Yangi xabarlar</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-[28px] font-semibold text-slate-900 tnum leading-none">{stats.parents || 0}</span>
              <span className="text-[13px] text-slate-500">ota-onadan</span>
            </div>
            <Link to="/teacher/chat" className="mt-3 text-[12px] text-brand-700 font-medium flex items-center gap-1 hover:underline">
              Xabarlarni ko'rish <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
            </Link>
          </div>
        </div>

        {/* Bugungi diqqat */}
        {attention.length > 0 && (
          <div className="mt-7">
            <div className="flex items-baseline gap-3">
              <span className="w-[3px] h-5 bg-brand-600 rounded" />
              <h2 className="text-[22px] font-semibold text-slate-900">Bugungi diqqat</h2>
              <span className="text-[12px] text-slate-500">{attention.length} ta · javob kutmoqda</span>
            </div>
            <div className="mt-3 grid gap-2.5">
              {attention.map((item, i) => <AttentionCard key={i} item={item} />)}
            </div>
          </div>
        )}

        {/* Bottom 2-col */}
        <div className="mt-7 grid grid-cols-[1.2fr_1fr] gap-4">
          <div className="rounded-xl border border-slate-200 bg-surface shadow-xs p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-[3px] h-4 bg-brand-600 rounded" />
              <h2 className="text-[18px] font-semibold text-slate-900">So'nggi kuzatuvlar</h2>
            </div>
            {obs.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-slate-500">Bugun hali kuzatuv yozilmadi</div>
            ) : (
              <div className="space-y-1.5">
                {obs.slice(0, 6).map((o, i) => <ObservationRow key={i} obs={o} />)}
              </div>
            )}
            <Link to="/teacher/activities" className="mt-3 inline-flex items-center gap-1 text-[12px] text-brand-700 font-medium hover:underline">
              Hammasini ko'rish <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
            </Link>
          </div>

          <div className="rounded-xl border border-slate-200 bg-surface shadow-xs p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-[3px] h-4 bg-brand-600 rounded" />
              <h2 className="text-[18px] font-semibold text-slate-900">Tezkor havolalar</h2>
            </div>
            <div className="space-y-2">
              {[
                { to: '/teacher/attendance', label: 'Davomat belgilash' },
                { to: '/teacher/parents',    label: "Bolalar ro'yxati" },
                { to: '/teacher/chat',       label: 'Ota-onalar bilan chat', badge: stats.parents },
                { to: '/teacher/reflection', label: 'Kun jurnali' },
              ].map(link => (
                <Link key={link.to} to={link.to} className="flex items-center gap-3 p-3 rounded-lg bg-paper hover:bg-brand-50 transition-colors">
                  <span className="text-[13px] font-medium text-slate-900">{link.label}</span>
                  {link.badge > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-error-500 text-surface text-[10px] font-medium">{link.badge}</span>
                  )}
                  <ArrowRight className="w-4 h-4 text-slate-400 ml-auto" strokeWidth={1.75} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===== MOBILE ===== */}
      <div className="md:hidden space-y-4">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900">Bugun, {user?.firstName} opa/aka</h1>
          <p className="text-[13px] text-slate-500">{today}</p>
        </div>

        {children.length > 0 && (
          <div className="rounded-xl bg-surface border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] uppercase tracking-[.14em] text-slate-500">Guruh</span>
              <span className="text-[11px] text-slate-500 tnum">{stats.present || 0}/{children.length}</span>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {children.slice(0, 12).map((child) => (
                <Link key={child.id} to={`/teacher/children/${child.id}`} className="flex flex-col items-center relative">
                  <div className="relative">
                    <ChildAvatar child={child} size="xs" />
                    <ChildStateDot state={child.attendanceState || 'present'} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-surface border border-slate-200 p-3">
            <div className="text-[10px] uppercase tracking-[.1em] text-slate-500">Davomat</div>
            <div className="mt-1 flex items-baseline gap-0.5">
              <span className="text-[20px] font-semibold text-slate-900 tnum">{stats.present || 0}</span>
              <span className="text-[11px] text-slate-500">/{children.length || 0}</span>
            </div>
          </div>
          <div className="rounded-lg bg-surface border border-slate-200 p-3">
            <div className="text-[10px] uppercase tracking-[.1em] text-slate-500">Kuzatuv</div>
            <div className="mt-1"><span className="text-[20px] font-semibold text-slate-900 tnum">{stats.activities || 0}</span></div>
          </div>
          <div className="rounded-lg bg-surface border border-slate-200 p-3">
            <div className="text-[10px] uppercase tracking-[.1em] text-slate-500">Xabar</div>
            <div className="mt-1"><span className="text-[20px] font-semibold text-slate-900 tnum">{stats.parents || 0}</span></div>
          </div>
        </div>

        {attention.length > 0 && (
          <div className="space-y-2">
            <div className="text-[12px] font-medium text-slate-900">Bugungi diqqat</div>
            {attention.slice(0, 3).map((item, i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-surface p-3 flex items-start gap-3">
                <ChildAvatar child={item.child} size="xs" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-slate-900">{item.title}</div>
                  <div className="text-[11px] text-slate-500">{item.subtitle}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-surface p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-medium text-slate-900">So'nggi kuzatuvlar</span>
          </div>
          {obs.length === 0 ? (
            <p className="text-[12px] text-slate-500 text-center py-4">Hali kuzatuv yozilmadi</p>
          ) : (
            <div className="space-y-1.5">
              {obs.slice(0, 5).map((o, i) => <ObservationRow key={i} obs={o} />)}
            </div>
          )}
          <Link to="/teacher/activities" className="mt-3 inline-flex items-center gap-1 text-[12px] text-brand-700 font-medium">
            Hammasini ko'rish <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
