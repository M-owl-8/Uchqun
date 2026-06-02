import { useState, useRef, useEffect } from 'react';
import { GlobeIcon } from '../icons/GlobeIcon';

const STORAGE_KEY = 'dnp:lang';

const LABELS = {
  uz: "O'zbekcha",
  ru: 'Русский',
  en: 'English',
};

export function LangDropdown({ lang, setLang }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'uz' || saved === 'ru' || saved === 'en') setLang(saved);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  function handleSelect(value) {
    setLang(value);
    localStorage.setItem(STORAGE_KEY, value);
    document.documentElement.lang = value;
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-[5px] px-[9px] py-[5px] rounded-[8px] text-[12px] font-semibold text-[#9E907C] hover:text-[#756959] hover:bg-[#EFE9DE]/60 transition-colors"
      >
        <GlobeIcon size={13} />
        <span>{LABELS[lang] || lang.toUpperCase()}</span>
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"
          style={{ transition: 'transform 150ms', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <path d="M2 3.5 5 6.5 8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Language"
          className="absolute bottom-full right-0 mb-1.5 w-[148px] rounded-[10px] bg-[#FFFCF8] border border-[#EFE9DE] shadow-card py-1 z-10"
        >
          {['uz', 'ru', 'en'].map((code) => (
            <button
              key={code}
              type="button"
              role="option"
              aria-selected={lang === code}
              onClick={() => handleSelect(code)}
              className={[
                'w-full text-left px-3 py-[7px] text-[13px] transition-colors',
                lang === code
                  ? 'text-[#A85C40] font-semibold bg-[rgba(168,92,64,.06)]'
                  : 'text-[#1E1A16] hover:bg-[#EFE9DE]/60',
              ].join(' ')}
            >
              {LABELS[code]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
