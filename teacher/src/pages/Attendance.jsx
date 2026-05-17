import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCheck } from 'lucide-react';
import { AttendanceGrid } from '../components/AttendanceGrid';
import api from '../shared/services/api';
import { useToast } from '../shared/context/ToastContext';

const FILTER_OPTIONS = [
  { key: 'all',     label: 'Hammasi' },
  { key: 'present', label: 'Bor' },
  { key: 'absent',  label: "Yo'q" },
  { key: 'late',    label: 'Kech' },
  { key: 'sick',    label: 'Kasal' },
];

const formatDate = () => {
  const d = new Date();
  return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', weekday: 'long' });
};

const Attendance = () => {
  const navigate    = useNavigate();
  const { toast }   = useToast() || {};
  const [children, setChildren] = useState([]);
  const [states, setStates]     = useState({});
  const [filter, setFilter]     = useState('all');
  const [saving, setSaving]     = useState(false);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/teacher/children');
        const list = res.data?.data || res.data || [];
        setChildren(Array.isArray(list) ? list : []);
        // Initialize states from existing attendance if available
        const initial = {};
        list.forEach(c => {
          initial[c.id] = c.todayAttendance || 'unset';
        });
        setStates(initial);
      } catch {
        setChildren([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleStateChange = (childId, newState) => {
    setStates(prev => ({ ...prev, [childId]: newState }));
  };

  const handleMarkAll = () => {
    const allPresent = {};
    children.forEach(c => { allPresent[c.id] = 'present'; });
    setStates(allPresent);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const records = children.map(c => ({
        childId: c.id,
        date:    today,
        status:  states[c.id] || 'unset',
      }));
      await api.post('/attendance', { records });
      toast?.({ type: 'success', message: 'Davomat saqlandi' });
      navigate('/teacher');
    } catch {
      toast?.({ type: 'error', message: 'Saqlashda xatolik yuz berdi' });
    } finally {
      setSaving(false);
    }
  };

  // Filter children
  const filtered = filter === 'all'
    ? children
    : children.filter(c => states[c.id] === filter);

  const markedCount = Object.values(states).filter(s => s !== 'unset').length;
  const total       = children.length;
  const progressPct = total > 0 ? Math.round((markedCount / total) * 100) : 0;

  // Count per state for filter chips
  const counts = { all: total };
  children.forEach(c => {
    const s = states[c.id] || 'unset';
    counts[s] = (counts[s] || 0) + 1;
  });

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skel h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-32">
      {/* Date header */}
      <div className="px-1 pt-2 pb-3">
        <div className="text-[20px] font-semibold text-slate-900">{formatDate()}</div>
        <div className="text-[12px] text-slate-500">
          {children[0]?.groupName || 'Guruh'} · {total} bola
        </div>
        <button
          type="button"
          onClick={handleMarkAll}
          className="mt-3 h-9 px-3 rounded-full bg-brand-50 text-brand-700 text-[13px] font-medium flex items-center gap-1.5 hover:bg-brand-100 transition-colors"
        >
          <CheckCheck className="w-4 h-4" strokeWidth={1.75} />
          Hammasi keldi
        </button>
      </div>

      {/* Filter chips */}
      <div className="overflow-x-auto pb-2">
        <div className="flex items-center gap-1.5 text-[12px] min-w-max">
          {FILTER_OPTIONS.map(opt => {
            const count = counts[opt.key] || 0;
            const active = filter === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setFilter(opt.key)}
                className="h-7 px-2.5 rounded-full font-medium transition-colors"
                style={
                  active
                    ? { background: '#2A2E39', color: '#FFFFFE' }
                    : { background: '#FFFFFE', border: '1px solid #DDE0E6', color: '#3D424F' }
                }
              >
                {opt.label} · {count}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      <div className="mt-1">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-[13px] text-slate-500">Bu filtr bo'yicha bola yo'q</div>
        ) : (
          <AttendanceGrid
            children={filtered}
            states={states}
            onStateChange={handleStateChange}
          />
        )}
      </div>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 inset-x-0 bg-surface border-t border-slate-200 p-3 z-30">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="relative w-full h-11 rounded-md text-surface text-[14px] font-medium overflow-hidden disabled:opacity-60"
          style={{ background: '#525868' }}
        >
          {/* Progress fill */}
          <span
            className="absolute left-0 top-0 bottom-0 bg-brand-600 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
          <span className="relative">
            {saving
              ? 'Saqlanmoqda...'
              : `${total} dan ${markedCount} ta belgilangan · Saqlash`}
          </span>
        </button>
      </div>
    </div>
  );
};

export default Attendance;
