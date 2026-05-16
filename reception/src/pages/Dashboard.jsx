import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import * as cache from '../../../shared/utils/cache';
import {
  UserPlus,
  GraduationCap,
  UploadCloud,
  ArrowUpRight,
  FileText,
  UserCheck,
  UsersRound,
  Edit3,
  CheckCircle,
  MessageSquare,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const CACHE_KEY = 'reception:dashboard';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [stats, setStats] = useState(() => cache.get(CACHE_KEY)?.stats ?? null);
  const [teachers, setTeachers] = useState(() => cache.get(CACHE_KEY)?.teachers ?? []);
  const [parents, setParents] = useState(() => cache.get(CACHE_KEY)?.parents ?? []);
  const [pendingDocs, setPendingDocs] = useState(() => cache.get(CACHE_KEY)?.pendingDocs ?? []);
  const [loading, setLoading] = useState(!cache.get(CACHE_KEY));

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchFresh = async () => {
      const [parentsRes, teachersRes, groupsRes, docsRes] = await Promise.allSettled([
        api.get('/reception/parents', { signal }),
        api.get('/reception/teachers', { signal }),
        api.get('/groups', { signal }),
        // TODO(phase-2): wire to /reception/my-documents?status=pending
        api.get('/reception/my-documents', { signal }).catch(() => ({ data: { documents: [] } })),
      ]);
      const p = parentsRes.status === 'fulfilled' && Array.isArray(parentsRes.value.data?.data) ? parentsRes.value.data.data : [];
      const tc = teachersRes.status === 'fulfilled' && Array.isArray(teachersRes.value.data?.data) ? teachersRes.value.data.data : [];
      const g = groupsRes.status === 'fulfilled' && Array.isArray(groupsRes.value.data?.groups) ? groupsRes.value.data.groups : [];
      const docs = docsRes.status === 'fulfilled' && Array.isArray(docsRes.value.data?.documents) ? docsRes.value.data.documents : [];
      const pending = docs.filter((d) => d.status === 'pending');
      return { stats: { parents: p.length, teachers: tc.length, groups: g.length }, teachers: tc, parents: p, pendingDocs: pending };
    };

    const apply = (result) => {
      setStats(result.stats);
      setTeachers(result.teachers);
      setParents(result.parents);
      setPendingDocs(result.pendingDocs || []);
    };

    const cached = cache.get(CACHE_KEY);
    if (cached) {
      apply(cached);
      setLoading(false);
      fetchFresh()
        .then((result) => { cache.set(CACHE_KEY, result); apply(result); })
        .catch(() => {});
      return () => controller.abort();
    }

    fetchFresh()
      .then((result) => { cache.set(CACHE_KEY, result); apply(result); })
      .catch(() => { setStats({ parents: 0, teachers: 0, groups: 0 }); })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const now = new Date();
  const dateStr = now.toLocaleDateString('uz-Latn-UZ', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('uz-Latn-UZ', { hour: '2-digit', minute: '2-digit' });

  // Derive pending-activation parents (isActive === false)
  const pendingParents = parents.filter((p) => p.isActive === false).slice(0, 3);

  // Recent activity (derive from parents list — newest first)
  const recentActivity = [...parents]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Page header */}
      <header className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <h1 className="h1-tab text-[30px] font-semibold tracking-tight text-slate-900">
            {t('dashboard.title', { defaultValue: 'Boshqaruv paneli' })}
          </h1>
          <p className="text-[14px] text-slate-600 mt-2">
            {t('dashboard.greeting', { defaultValue: 'Xush kelibsiz' })},{' '}
            <span className="font-medium text-slate-900">{user?.firstName || ''}</span>.{' '}
            {t('dashboard.todayTasks', { defaultValue: 'Bugun qiladigan ishlaringiz:' })}
          </p>
        </div>
        <div className="text-right text-[12.5px] text-slate-500">
          <div className="num">
            {t('dashboard.lastUpdated', { defaultValue: 'Oxirgi yangilanish' })}: <span className="text-slate-700">{dateStr}, {timeStr}</span>
          </div>
          <div className="mt-1 inline-flex items-center gap-1.5">
            {t('dashboard.quickSearch', { defaultValue: 'Tezkor qidiruv' })}{' '}
            <span className="kbd">⌘ K</span>
          </div>
        </div>
      </header>

      {/* Quick-create row */}
      <section>
        <div className="grid md:grid-cols-3 gap-4">
          <button
            className="lift bg-surface border border-slate-200 rounded-lg shadow-xs hover:shadow-sm hover:border-brand-300 p-5 text-left"
            onClick={() => navigate('/reception/parents/new')}
          >
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-md bg-brand-50 text-brand-700 inline-flex items-center justify-center">
                <UserPlus className="w-6 h-6" strokeWidth={2} />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400" strokeWidth={2} />
            </div>
            <div className="mt-4 text-[15px] font-medium text-slate-900">
              {t('dashboard.newParent', { defaultValue: "Yangi ota-ona" })}
            </div>
            <div className="text-[12.5px] text-slate-500 mt-0.5">
              {t('dashboard.newParentSub', { defaultValue: '3 qadamli sehrgar bilan' })}
            </div>
          </button>

          <button
            className="lift bg-surface border border-slate-200 rounded-lg shadow-xs hover:shadow-sm hover:border-brand-300 p-5 text-left"
            onClick={() => navigate('/reception/teachers')}
          >
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-md bg-accent-100 text-accent-700 inline-flex items-center justify-center">
                <GraduationCap className="w-6 h-6" strokeWidth={2} />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400" strokeWidth={2} />
            </div>
            <div className="mt-4 text-[15px] font-medium text-slate-900">
              {t('dashboard.newTeacher', { defaultValue: "Yangi o'qituvchi" })}
            </div>
            <div className="text-[12.5px] text-slate-500 mt-0.5">
              {t('dashboard.newTeacherSub', { defaultValue: 'Hisob va guruh tayinlash' })}
            </div>
          </button>

          <button
            className="lift bg-surface border border-slate-200 rounded-lg shadow-xs hover:shadow-sm hover:border-brand-300 p-5 text-left"
            onClick={() => navigate('/reception/documents')}
          >
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-md bg-info-50 text-info-700 inline-flex items-center justify-center">
                <UploadCloud className="w-6 h-6" strokeWidth={2} />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400" strokeWidth={2} />
            </div>
            <div className="mt-4 text-[15px] font-medium text-slate-900">
              {t('dashboard.uploadDoc', { defaultValue: 'Hujjat yuklash' })}
            </div>
            <div className="text-[12.5px] text-slate-500 mt-0.5">
              {t('dashboard.uploadDocSub', { defaultValue: 'Maktab rahbari tasdiqlaydi' })}
            </div>
          </button>
        </div>
      </section>

      {/* Bugungi ishlar */}
      <section>
        <h2 className="h2-tab text-[18px] font-semibold text-slate-900 mb-4">
          {t('dashboard.todayWork', { defaultValue: 'Bugungi ishlar' })}
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {/* Pending docs card */}
          <article className="bg-surface border border-slate-200 rounded-lg shadow-xs">
            <header className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <h3 className="text-[14px] font-semibold text-slate-900">
                {t('dashboard.pendingDocs', { defaultValue: 'Tasdiq kutayotgan hujjatlarim' })}
              </h3>
              {pendingDocs.length > 0 && (
                <span className="inline-flex items-center h-6 px-2 rounded-sm bg-warning-50 text-warning-700 text-[12px] border border-warning-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning-600 mr-1.5" />
                  <span className="num">{pendingDocs.length} ta</span>
                </span>
              )}
            </header>
            {pendingDocs.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {pendingDocs.slice(0, 3).map((doc) => (
                  <li key={doc.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-warning-50 text-warning-700 inline-flex items-center justify-center">
                      <FileText className="w-4 h-4" strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-medium text-slate-900 truncate">{doc.name || doc.fileName}</div>
                      <div className="text-[12px] text-slate-500 num">{doc.size || ''}</div>
                    </div>
                    <button className="text-[12.5px] text-brand-700 font-medium hover:text-brand-800">
                      {t('common.view', { defaultValue: "Ko'rish" })}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-5 py-6 text-center text-[13px] text-slate-400">
                {t('dashboard.noPendingDocs', { defaultValue: 'Tasdiq kutayotgan hujjat yo\'q' })}
              </div>
            )}
            <footer className="px-5 py-2.5 border-t border-slate-100 bg-paper rounded-b-lg">
              <Link
                to="/reception/documents"
                className="text-[12.5px] text-brand-700 font-medium hover:text-brand-800 inline-flex items-center gap-1.5"
              >
                {t('dashboard.goToDocs', { defaultValue: 'Mening hujjatlarim sahifasiga' })}
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
              </Link>
            </footer>
          </article>

          {/* Pending activation parents */}
          <article className="bg-surface border border-slate-200 rounded-lg shadow-xs">
            <header className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <h3 className="text-[14px] font-semibold text-slate-900">
                {t('dashboard.pendingParents', { defaultValue: 'Faollashtirish kutayotgan ota-onalar' })}
              </h3>
              {pendingParents.length > 0 && (
                <span className="inline-flex items-center h-6 px-2 rounded-sm bg-info-50 text-info-700 text-[12px] border border-info-100 num">
                  {pendingParents.length}
                </span>
              )}
            </header>
            {pendingParents.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {pendingParents.map((parent) => (
                  <li key={parent.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-800 inline-flex items-center justify-center text-[11px] font-semibold">
                      {parent.firstName?.charAt(0)}{parent.lastName?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-medium text-slate-900 truncate">
                        {parent.firstName} {parent.lastName}
                      </div>
                      <div className="text-[12px] text-slate-500 num truncate">{parent.phone}</div>
                    </div>
                    <button className="h-7 px-2.5 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-medium transition-colors">
                      {t('dashboard.activate', { defaultValue: 'Faollashtirish' })}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-5 py-6 text-center text-[13px] text-slate-400">
                {t('dashboard.noPendingParents', { defaultValue: "Faollashtirish kutayotgan ota-ona yo'q" })}
              </div>
            )}
            <footer className="px-5 py-2.5 border-t border-slate-100 bg-paper rounded-b-lg">
              <Link
                to="/reception/parents"
                className="text-[12.5px] text-brand-700 font-medium hover:text-brand-800 inline-flex items-center gap-1.5"
              >
                {t('dashboard.parentsList', { defaultValue: "Ota-onalar ro'yxati" })}
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
              </Link>
            </footer>
          </article>
        </div>
      </section>

      {/* So'nggi faoliyat */}
      {recentActivity.length > 0 && (
        <section>
          <h2 className="h2-tab text-[18px] font-semibold text-slate-900 mb-4">
            {t('dashboard.recentActivity', { defaultValue: "So'nggi faoliyat" })}
          </h2>
          <article className="bg-surface border border-slate-200 rounded-lg shadow-xs">
            <ul className="divide-y divide-slate-100">
              {recentActivity.map((parent) => (
                <li key={parent.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-success-50 text-success-700 inline-flex items-center justify-center">
                    <UserPlus className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <div className="flex-1 text-[13.5px]">
                    <span className="font-medium text-slate-900">{parent.firstName} {parent.lastName}</span>
                    {' '}{t('dashboard.added', { defaultValue: "qo'shildi" })}
                    {parent.children?.length > 0 && (
                      <> · bola <span className="font-medium text-slate-900">{parent.children[0]?.firstName}</span></>
                    )}
                  </div>
                  <div className="text-[12px] text-slate-500 num shrink-0">
                    {parent.createdAt ? new Date(parent.createdAt).toLocaleDateString('uz-Latn-UZ') : ''}
                  </div>
                </li>
              ))}
            </ul>
          </article>
        </section>
      )}

      {/* Lower split: children grid + school stats */}
      <section className="grid lg:grid-cols-[2fr_1fr] gap-4">
        {/* New children */}
        <article className="bg-surface border border-slate-200 rounded-lg shadow-xs">
          <header className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <h3 className="h2-tab text-[14px] font-semibold text-slate-900">
              {t('dashboard.newChildren', { defaultValue: 'Sizning guruhlaringizdagi yangi bolalar' })}
            </h3>
            <Link to="/reception/parents" className="text-[12.5px] text-brand-700 hover:text-brand-800 font-medium">
              {t('common.viewAll', { defaultValue: 'Barchasini ko\'rish' })}
            </Link>
          </header>
          <div className="grid md:grid-cols-2 gap-3 p-5">
            {parents.flatMap((p) => (p.children || []).map((c) => ({ ...c, parentName: `${p.firstName} ${p.lastName}` }))).slice(0, 4).map((child, idx) => (
              <div
                key={child.id || idx}
                className="flex items-center gap-3 p-3 rounded-md border border-slate-100 hover:border-slate-200 hover:bg-slate-50/60 transition-colors"
              >
                <div className="w-11 h-11 rounded-md bg-brand-100 text-brand-800 inline-flex items-center justify-center font-semibold">
                  {child.firstName?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-medium text-slate-900 truncate">
                    {child.firstName} {child.lastName}
                  </div>
                  <div className="text-[12px] text-slate-500 truncate num">
                    {child.parentName}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" strokeWidth={2} />
              </div>
            ))}
            {parents.flatMap((p) => p.children || []).length === 0 && (
              <div className="col-span-2 py-4 text-center text-[13px] text-slate-400">
                {t('dashboard.noChildren', { defaultValue: 'Hozircha bola yo\'q' })}
              </div>
            )}
          </div>
        </article>

        {/* School stats */}
        <article className="bg-surface border border-slate-200 rounded-lg shadow-xs">
          <header className="px-5 py-3 border-b border-slate-100">
            <h3 className="h2-tab text-[14px] font-semibold text-slate-900">
              {t('dashboard.schoolStats', { defaultValue: 'Maktab statistikasi' })}
            </h3>
          </header>
          <dl className="divide-y divide-slate-100 text-[13.5px]">
            <div className="px-5 py-3 flex items-baseline justify-between">
              <dt className="text-slate-500">{t('dashboard.totalParents', { defaultValue: 'Jami ota-onalar' })}</dt>
              <dd className="num font-semibold text-slate-900">{stats?.parents ?? 0}</dd>
            </div>
            <div className="px-5 py-3 flex items-baseline justify-between">
              <dt className="text-slate-500">{t('dashboard.totalTeachers', { defaultValue: "O'qituvchilar" })}</dt>
              <dd className="num font-semibold text-slate-900">{stats?.teachers ?? 0}</dd>
            </div>
            <div className="px-5 py-3 flex items-baseline justify-between">
              <dt className="text-slate-500">{t('dashboard.totalGroups', { defaultValue: 'Guruhlar' })}</dt>
              <dd className="num font-semibold text-slate-900">{stats?.groups ?? 0}</dd>
            </div>
          </dl>
        </article>
      </section>
    </div>
  );
};

export default Dashboard;
