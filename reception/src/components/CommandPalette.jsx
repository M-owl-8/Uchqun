import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, UploadCloud, UsersRound, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const quickActions = [
  {
    id: 'new-parent',
    label: "Yangi ota-ona qo'shish",
    kbd: '⌘ N',
    icon: UserPlus,
    iconBg: 'bg-brand-50 text-brand-700',
    href: '/reception/parents/new',
  },
  {
    id: 'upload-doc',
    label: 'Hujjat yuklash',
    kbd: '⌘ U',
    icon: UploadCloud,
    iconBg: 'bg-brand-50 text-brand-700',
    href: '/reception/documents',
  },
  {
    id: 'new-group',
    label: 'Guruhlar',
    kbd: '⌘ G',
    icon: UsersRound,
    iconBg: 'bg-brand-50 text-brand-700',
    href: '/reception/groups',
  },
];

export default function CommandPalette({ open, onClose }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);

  const items = quickActions;
  const filtered = query
    ? items.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))
    : items;

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const select = useCallback((item) => {
    onClose();
    navigate(item.href);
  }, [onClose, navigate]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[activeIdx]) select(filtered[activeIdx]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, filtered, activeIdx, select, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center pt-[15vh] bg-slate-900/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[600px] mx-4 bg-surface rounded-lg shadow-xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search row */}
        <div className="flex items-center gap-3 px-5 h-14 border-b border-slate-100">
          <Search className="w-5 h-5 text-slate-400 shrink-0" strokeWidth={2} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
            placeholder={t('palette.placeholder', { defaultValue: "Ota-ona, o'qituvchi, guruh yoki amal qidiring…" })}
            className="flex-1 bg-transparent outline-none text-[15px] text-slate-900 placeholder:text-slate-400"
          />
          <span className="kbd">esc</span>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[420px] overflow-y-auto slim">
          {filtered.length === 0 ? (
            <div className="px-5 py-8 text-center text-[13.5px] text-slate-400">
              {t('palette.noResults', { defaultValue: "Natija topilmadi" })}
            </div>
          ) : (
            <>
              <div className="px-4 pt-3 pb-1 text-[11px] font-mono uppercase tracking-wider text-slate-500">
                {t('palette.quickActions', { defaultValue: 'Tezkor amallar' })}
              </div>
              {filtered.map((item, idx) => (
                <button
                  key={item.id}
                  className={`w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors ${
                    idx === activeIdx ? 'bg-brand-50/70' : 'hover:bg-slate-50'
                  }`}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => select(item)}
                >
                  <div className={`w-7 h-7 rounded-md inline-flex items-center justify-center shrink-0 ${item.iconBg}`}>
                    <item.icon className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <div className="flex-1">
                    <div className="text-[14px] text-slate-900">{item.label}</div>
                  </div>
                  {item.kbd && <span className="kbd">{item.kbd}</span>}
                </button>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-4 h-9 flex items-center justify-between text-[11.5px] text-slate-500 bg-paper">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <span className="kbd">↑</span><span className="kbd">↓</span>
              {' '}navigatsiya
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="kbd">↵</span> tanlash
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="kbd">esc</span> yopish
            </span>
          </div>
          <span className="font-mono">⌘ K</span>
        </div>
      </div>
    </div>
  );
}
