import { useState, useEffect, useRef } from 'react';
import { Lock, TrendingUp } from 'lucide-react';
import { ChildRibbon } from '../components/ChildRibbon';
import { ChildAvatar } from '../components/ChildAvatar';
import { ParentJournalComposer } from '../components/ParentJournalComposer';
import { useChildRibbon } from '../hooks/useChildRibbon';
import api from '../shared/services/api';

const getReflectionKey = () => {
  const d = new Date().toISOString().split('T')[0];
  return `teacher:reflection:${d}`;
};

function ObservationItem({ obs }) {
  const ribbon = useChildRibbon(obs.child);
  const isPositive = obs.outcome === 'mastered' || obs.outcome === 'independent';
  const isStruggling = obs.outcome === 'assisted' || obs.outcome === 'struggling';

  return (
    <div
      className="rounded-lg border border-slate-200 p-4"
      style={{ borderLeft: `4px solid ${ribbon.hex}` }}
    >
      <div className="flex items-start gap-3">
        <ChildAvatar child={obs.child} size="xs" />
        <div className="flex-1">
          <div className="text-[13px] font-medium text-slate-900">
            {obs.child?.firstName} {obs.child?.lastName?.charAt(0)}. · {obs.goalLabel}
          </div>
          {obs.note && (
            <p className="mt-1 text-[12px] text-slate-600">{obs.note}</p>
          )}
          {isPositive && (
            <div
              className="mt-2 rounded-md px-3 py-2 text-[12px]"
              style={{ background: '#E2F0E8', borderLeft: '3px solid #4F8C72' }}
            >
              <div className="flex items-center gap-1 text-mint-700 font-medium">
                <TrendingUp className="w-3.5 h-3.5" strokeWidth={1.75} />
                Yaxshi natija
              </div>
            </div>
          )}
          {isStruggling && (
            <div
              className="mt-2 rounded-md px-3 py-2 text-[12px]"
              style={{ background: '#FBF3E4', borderLeft: '3px solid #C58A1F' }}
            >
              <span className="text-warning-700 font-medium">Yordam kerak</span>
            </div>
          )}
        </div>
        <span className="text-[10px] text-slate-400 tnum shrink-0">{obs.time}</span>
      </div>
    </div>
  );
}

const DailyReflection = () => {
  const reflKey = getReflectionKey();
  const [reflection, setReflection] = useState(
    () => localStorage.getItem(reflKey) || ''
  );
  const [observations, setObservations] = useState([]);
  const [children, setChildren]         = useState([]);
  const [saving, setSaving]             = useState(false);
  const autoSaveTimer = useRef(null);

  const today = new Date().toLocaleDateString('uz-UZ', {
    day: 'numeric', month: 'long', year: 'numeric', weekday: 'long',
  });

  useEffect(() => {
    Promise.allSettled([
      api.get('/teacher/children'),
      api.get('/teacher/observations/recent?limit=20'), // TODO(phase-2)
    ]).then(([childRes, obsRes]) => {
      if (childRes.status === 'fulfilled') {
        const list = childRes.value.data?.data || childRes.value.data || [];
        setChildren(Array.isArray(list) ? list : []);
      }
      if (obsRes.status === 'fulfilled') {
        const list = obsRes.value.data?.data || obsRes.value.data || [];
        setObservations(Array.isArray(list) ? list : []);
      }
    });
  }, []);

  // Auto-save reflection to localStorage
  useEffect(() => {
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      localStorage.setItem(reflKey, reflection);
    }, 1000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [reflection, reflKey]);

  const handleSaveReflection = async () => {
    if (!reflection.trim()) return;
    setSaving(true);
    try {
      await api.post('/teacher/reflections', {
        date:      new Date().toISOString().split('T')[0],
        content:   reflection,
        isPrivate: true,
      });
    } catch {
      // Graceful fail — localStorage has the draft
    } finally {
      setSaving(false);
    }
  };

  const handleJournalSend = async (payload) => {
    await api.post('/teacher/journal', payload);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1
          className="text-[28px] font-semibold text-slate-900"
          style={{ borderLeft: '4px solid #7A6FA8', paddingLeft: '14px' }}
        >
          Kun jurnali
        </h1>
        <p className="mt-1 text-[14px] text-slate-600 pl-[18px]">{today}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1.4fr] gap-6">
        {/* LEFT: Private reflection + observations */}
        <div className="space-y-5">
          {/* Private reflection textarea */}
          <div className="rounded-xl border border-slate-200 bg-surface p-5">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
              <span className="text-[12px] font-medium text-slate-700 uppercase tracking-[.1em]">Shaxsiy</span>
              <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px]">
                Faqat men ko'raman
              </span>
            </div>
            <textarea
              value={reflection}
              onChange={e => setReflection(e.target.value)}
              onBlur={handleSaveReflection}
              placeholder="Bugungi kun haqida shaxsiy fikrlaringizni yozing..."
              className="w-full text-[15px] text-slate-800 leading-[1.7] placeholder:text-slate-400 outline-none resize-none bg-transparent"
              rows={6}
            />
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>Avtomatik saqlanadi</span>
              {saving && <span className="text-brand-700">Saqlanmoqda...</span>}
            </div>
          </div>

          {/* Today's observations by child */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-[3px] h-4 bg-brand-600 rounded" />
              <h2 className="text-[16px] font-semibold text-slate-900">Bugungi kuzatuvlar</h2>
              <span className="ml-auto text-[12px] text-slate-500">{observations.length} ta</span>
            </div>

            {observations.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-surface p-8 text-center text-[13px] text-slate-500">
                Bugun hali kuzatuv yozilmadi
              </div>
            ) : (
              <div className="space-y-2">
                {observations.map((obs, i) => (
                  <ObservationItem key={i} obs={obs} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Parent journal composer */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-[3px] h-4 bg-brand-600 rounded" />
            <h2 className="text-[16px] font-semibold text-slate-900">Ota-onaga jurnal</h2>
          </div>
          <div style={{ minHeight: 500 }}>
            <ParentJournalComposer
              children={children}
              onSend={handleJournalSend}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyReflection;
