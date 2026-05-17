import { useState, useEffect, useRef } from 'react';
import { Send, Cloud, Camera, X } from 'lucide-react';
import { ChildAvatar } from './ChildAvatar';

const MOMENT_CHIPS = [
  { key: 'first',   label: 'Birinchi marta', style: { background: '#E2F0E8', color: '#4F8C72', border: '1px solid #A8D2BC' } },
  { key: 'success', label: 'Yaxshi natija',   style: { background: '#F6F3FB', color: '#5F567F', border: '1px solid #D8CFE5' } },
  { key: 'help',    label: 'Yordam kerak',    style: { background: '#FBF3E4', color: '#8E6314', border: '1px solid #F0DBA8' } },
];

const getDraftKey = () => {
  const d = new Date().toISOString().split('T')[0];
  return `teacher:journal:draft:${d}`;
};

/**
 * ParentJournalComposer
 * Left rail: child multi-select (180px)
 * Composer: subject + body + moment chips + photo gallery
 * Auto-saves to localStorage every 5s
 */
export function ParentJournalComposer({ children = [], onSend }) {
  const today  = new Date().toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' });
  const draftKey = getDraftKey();

  const [selectedIds, setSelectedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem(draftKey + ':ids') || '[]'); } catch { return []; }
  });
  const [selectAll, setSelectAll]     = useState(false);
  const [subject, setSubject]         = useState(() => localStorage.getItem(draftKey + ':subject') || '');
  const [body, setBody]               = useState(() => localStorage.getItem(draftKey + ':body') || '');
  const [photos, setPhotos]           = useState([]);
  const [lastSaved, setLastSaved]     = useState(null);
  const [sending, setSending]         = useState(false);
  const fileRef = useRef();

  // Auto-save every 5s
  useEffect(() => {
    const timer = setInterval(() => {
      localStorage.setItem(draftKey + ':subject', subject);
      localStorage.setItem(draftKey + ':body',    body);
      localStorage.setItem(draftKey + ':ids',     JSON.stringify(selectedIds));
      setLastSaved(new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }));
    }, 5000);
    return () => clearInterval(timer);
  }, [subject, body, selectedIds, draftKey]);

  const toggleChild = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectAll) {
      setSelectedIds([]);
      setSelectAll(false);
    } else {
      setSelectedIds(children.map(c => c.id));
      setSelectAll(true);
    }
  };

  const handleSend = async () => {
    if (!subject || !body || selectedIds.length === 0) return;
    setSending(true);
    try {
      await onSend?.({ subject, body, recipientIds: selectedIds, photos });
      // Clear draft
      localStorage.removeItem(draftKey + ':subject');
      localStorage.removeItem(draftKey + ':body');
      localStorage.removeItem(draftKey + ':ids');
      setSubject(''); setBody(''); setSelectedIds([]); setPhotos([]);
    } catch {
      // TODO: toast
    } finally {
      setSending(false);
    }
  };

  const insertMoment = (chip) => {
    const marker = `\n\n[${chip.label}] `;
    setBody(prev => prev + marker);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-surface shadow-sm overflow-hidden h-full flex flex-col">
      <div className="flex flex-1 overflow-hidden">
        {/* Left rail — children */}
        <aside className="shrink-0 border-r border-slate-200 bg-paper p-5 overflow-y-auto" style={{ width: 180 }}>
          <div className="text-[11px] uppercase tracking-[.14em] text-slate-500">Bolalar</div>
          <label className="mt-3 flex items-center gap-2 text-[12px] font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={toggleAll}
              className="rounded accent-brand-600"
            />
            Hammasiga jo'natish
          </label>
          <div className="mt-3 space-y-1.5">
            {children.map(child => {
              const checked = selectedIds.includes(child.id);
              return (
                <label
                  key={child.id}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors"
                  style={checked ? { background: '#F6F3FB' } : {}}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleChild(child.id)}
                    className="rounded accent-brand-600"
                  />
                  <ChildAvatar child={child} size="xs" />
                  <span className={`text-[12px] ${checked ? 'font-medium text-slate-900' : 'text-slate-700'}`}>
                    {child.firstName} {child.lastName?.charAt(0)}.
                  </span>
                </label>
              );
            })}
          </div>
          {selectedIds.length > 0 && (
            <div className="mt-4 text-[11px] text-brand-700 font-medium">
              {selectedIds.length} ta tanlandi
            </div>
          )}
        </aside>

        {/* Composer */}
        <div className="flex-1 flex flex-col overflow-hidden p-7">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[12px] text-slate-500 tnum">{today}</div>
            <div className="flex items-center gap-1.5">
              {lastSaved && (
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Cloud className="w-3.5 h-3.5" strokeWidth={1.75} />
                  {lastSaved} da saqlandi
                </span>
              )}
            </div>
          </div>

          {/* Subject */}
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Mavzu..."
            className="w-full text-[20px] font-semibold text-slate-900 placeholder:text-slate-400 outline-none border-0 border-b border-transparent focus:border-brand-300 pb-2 bg-transparent transition-colors"
          />

          {/* Body */}
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Bugungi kun haqida ota-onaga yozing..."
            className="flex-1 mt-5 text-[15px] text-slate-800 leading-[1.7] placeholder:text-slate-400 outline-none resize-none bg-transparent"
            style={{ minHeight: 120 }}
          />

          {/* Moment chips */}
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            {MOMENT_CHIPS.map(chip => (
              <button
                key={chip.key}
                type="button"
                onClick={() => insertMoment(chip)}
                className="h-7 px-3 rounded-full text-[12px] font-medium transition-opacity hover:opacity-80"
                style={chip.style}
              >
                + {chip.label}
              </button>
            ))}
            <button
              type="button"
              ref={fileRef}
              onClick={() => fileRef.current?.click()}
              className="h-7 px-3 rounded-full text-[12px] font-medium border border-dashed border-slate-300 text-slate-500 flex items-center gap-1 hover:bg-slate-50 transition-colors"
            >
              <Camera className="w-3.5 h-3.5" strokeWidth={1.75} /> Lavha
            </button>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              multiple
              onChange={e => {
                const files = Array.from(e.target.files || []).slice(0, 3 - photos.length);
                setPhotos(prev => [...prev, ...files].slice(0, 3));
              }}
            />
          </div>

          {/* Photo thumbnails */}
          {photos.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              {photos.map((file, i) => (
                <div key={i} className="relative rounded-md overflow-hidden" style={{ width: 80, height: 60 }}>
                  <img
                    src={URL.createObjectURL(file)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 w-4 h-4 rounded-full bg-slate-900/60 grid place-items-center text-surface"
                  >
                    <X className="w-2.5 h-2.5" strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
            <div className="text-[12px] text-slate-500">
              {selectedIds.length === 0
                ? 'Qabul qiluvchi tanlanmagan'
                : `${selectedIds.length} ota-onaga`}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="h-9 px-3.5 rounded-md bg-surface border border-slate-200 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Qoralama
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || !subject || !body || selectedIds.length === 0}
                className="h-9 px-4 rounded-md bg-brand-600 text-surface text-[13px] font-medium flex items-center gap-1.5 hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" strokeWidth={1.75} />
                Jo'natish · {selectedIds.length}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
