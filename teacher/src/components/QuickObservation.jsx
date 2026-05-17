import { useState, useEffect } from 'react';
import { X, Camera, ChevronDown } from 'lucide-react';
import { ChildAvatar } from './ChildAvatar';
import { useChildRibbon } from '../hooks/useChildRibbon';
import api from '../shared/services/api';

const OUTCOMES = [
  { key: 'emerging',    label: 'Yangi' },
  { key: 'assisted',    label: 'Yordam bilan' },
  { key: 'independent', label: 'Mustaqil' },
  { key: 'mastered',    label: 'Mahorat' },
];

function ChildChip({ child, selected, onClick }) {
  const ribbon = useChildRibbon(child);
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 flex flex-col items-center gap-1"
    >
      <span
        className="w-12 h-12 rounded-full grid place-items-center text-surface text-[12px] font-semibold transition-shadow"
        style={{
          background: ribbon.hex,
          boxShadow: selected
            ? `0 0 0 2px #FFFFFE, 0 0 0 4px ${ribbon.hex}`
            : 'none',
        }}
      >
        {(child.firstName?.[0] || '').toUpperCase()}{(child.lastName?.[0] || '').toUpperCase()}
      </span>
      <span className={`text-[10px] font-medium ${selected ? 'text-slate-900' : 'text-slate-500'}`}>
        {child.firstName}
      </span>
    </button>
  );
}

/**
 * QuickObservation — bottom sheet (mobile) / centered modal (desktop).
 * Opens when FAB is tapped. Closes on save or cancel.
 */
const QuickObservation = ({ onClose, preselectedChild = null }) => {
  const [children, setChildren]       = useState([]);
  const [selectedChild, setSelectedChild] = useState(preselectedChild);
  const [goals, setGoals]             = useState([]);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [outcome, setOutcome]         = useState(null);
  const [note, setNote]               = useState('');
  const [saving, setSaving]           = useState(false);
  const [goalOpen, setGoalOpen]       = useState(false);

  useEffect(() => {
    api.get('/teacher/children').then(res => {
      const list = res.data?.data || res.data || [];
      setChildren(Array.isArray(list) ? list : []);
      if (!selectedChild && list.length > 0) setSelectedChild(list[0]);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedChild?.id) return;
    // TODO(phase-2): /api/v1/children/:id/goals?recent=true&limit=5
    api.get(`/teacher/children/${selectedChild.id}/goals`, { params: { recent: true, limit: 5 } })
      .then(res => {
        const list = res.data?.data || res.data || [];
        setGoals(Array.isArray(list) ? list : []);
        setSelectedGoal(list[0] || null);
      })
      .catch(() => { setGoals([]); setSelectedGoal(null); });
  }, [selectedChild]);

  const handleSave = async () => {
    if (!selectedChild || !outcome) return;
    setSaving(true);
    try {
      await api.post('/teacher/observations', {
        childId:  selectedChild.id,
        goalId:   selectedGoal?.id,
        outcome,
        note,
      });
      onClose();
    } catch {
      // TODO: show error toast
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 z-50"
        onClick={onClose}
      />

      {/* Sheet / Modal */}
      <div className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-50">
        <div
          className="relative bg-surface rounded-t-[20px] md:rounded-xl shadow-lg p-5 pb-6 w-full md:max-w-md"
          onClick={e => e.stopPropagation()}
        >
          {/* Handle (mobile) */}
          <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-3 md:hidden" />

          <div className="flex items-center justify-between">
            <div className="text-[16px] font-semibold text-slate-900">Yangi kuzatuv</div>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-md grid place-items-center hover:bg-slate-100"
            >
              <X className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
            </button>
          </div>

          {/* Child strip */}
          {children.length > 0 && (
            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 mb-2">Bola</div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {children.map(child => (
                  <ChildChip
                    key={child.id}
                    child={child}
                    selected={selectedChild?.id === child.id}
                    onClick={() => setSelectedChild(child)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Goal dropdown */}
          <div className="mt-4">
            <label className="block text-[12px] font-medium text-slate-700 mb-1.5">Maqsad</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setGoalOpen(v => !v)}
                className="w-full h-[44px] px-3 rounded-md border border-slate-200 bg-surface flex items-center justify-between text-[14px] text-slate-900 hover:bg-slate-50 transition-colors"
              >
                <span>{selectedGoal ? `${selectedGoal.title || selectedGoal.label || 'Maqsad'}` : 'Maqsad tanlang'}</span>
                <ChevronDown className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
              </button>
              {goalOpen && goals.length > 0 && (
                <div className="absolute inset-x-0 top-full mt-1 bg-surface border border-slate-200 rounded-md shadow-md z-10 max-h-48 overflow-y-auto">
                  {goals.map(g => (
                    <button
                      key={g.id}
                      type="button"
                      className="w-full text-left px-3 py-2.5 text-[13px] text-slate-900 hover:bg-slate-50 transition-colors"
                      onClick={() => { setSelectedGoal(g); setGoalOpen(false); }}
                    >
                      {g.title || g.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Eng so'nggi yozilgan maqsad — smart default
            </div>
          </div>

          {/* Outcome chips */}
          <div className="mt-4">
            <label className="block text-[12px] font-medium text-slate-700 mb-1.5">Natija</label>
            <div className="grid grid-cols-2 gap-1.5">
              {OUTCOMES.map(o => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setOutcome(o.key)}
                  className="h-10 rounded-md text-[12px] font-medium transition-colors"
                  style={
                    outcome === o.key
                      ? { background: '#7A6FA8', color: '#FFFFFE' }
                      : { border: '1px solid #DDE0E6', background: '#FFFFFE', color: '#3D424F' }
                  }
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div className="mt-4">
            <label className="block text-[12px] font-medium text-slate-700 mb-1.5">
              Izoh <span className="text-slate-400 font-normal">(ixtiyoriy)</span>
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Qisqacha kuzatuv..."
              className="w-full px-3 py-2 rounded-md border border-slate-200 bg-surface text-[14px] placeholder:text-slate-400 resize-none focus:outline-none focus:border-brand-600 transition-colors"
            />
          </div>

          {/* Footer */}
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              className="h-10 px-3 rounded-md border border-slate-200 bg-surface text-[12px] font-medium text-slate-700 flex items-center gap-1.5 hover:bg-slate-50 transition-colors"
            >
              <Camera className="w-4 h-4 text-slate-500" strokeWidth={1.75} /> Rasm
            </button>
            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-3 rounded-md text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Bekor
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !selectedChild || !outcome}
                className="h-10 px-4 rounded-md bg-brand-600 text-surface text-[13px] font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default QuickObservation;
