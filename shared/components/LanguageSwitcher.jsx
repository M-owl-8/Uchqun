import { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LANG_LABELS = { uz: "O'zbekcha", ru: 'Русский', en: 'English' };
const STORAGE_KEY = 'dnp:lang';

/**
 * Unified language switcher — single source of truth for all portals.
 *
 * variant="sidebar"  dark bg, full-width, opens upward  (admin/gov/reception/teacher sidebars)
 * variant="auth"     light bg, compact, opens upward    (all login pages)
 * variant="topbar"   white-on-dark, compact, opens down (parent TopBar)
 *
 * langs     string[] override — defaults to ['uz', 'ru', 'en']
 * onChange  optional callback(lng) fired after i18n + localStorage are updated
 */
export function LanguageSwitcher({
  variant = 'sidebar',
  langs = ['uz', 'ru', 'en'],
  onChange,
}) {
  const { i18n } = useTranslation();
  const currentLang = i18n?.language?.split('-')[0] || 'uz';
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open]);

  const handleSelect = (lng) => {
    i18n?.changeLanguage(lng);
    localStorage.setItem(STORAGE_KEY, lng);
    if (onChange) onChange(lng);
    setOpen(false);
  };

  if (variant === 'auth') {
    return (
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-warm-600 hover:text-warm-900 hover:bg-warm-100 transition-colors"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <Globe className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
          <span>{LANG_LABELS[currentLang] || currentLang.toUpperCase()}</span>
          <ChevronDown
            className="w-3 h-3 shrink-0 transition-transform"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
            strokeWidth={2}
          />
        </button>

        {open && (
          <div
            role="listbox"
            className="absolute right-0 bottom-full mb-1 w-36 rounded-md bg-white border border-gray-200 shadow-sm py-1 z-50"
          >
            {langs.map((lng) => (
              <button
                key={lng}
                type="button"
                role="option"
                aria-selected={currentLang === lng}
                onClick={() => handleSelect(lng)}
                className={`w-full text-left px-3 py-1.5 text-[12px] transition-colors ${
                  currentLang === lng
                    ? 'text-brand-700 font-semibold bg-brand-50'
                    : 'text-gray-800 hover:bg-gray-50'
                }`}
              >
                {LANG_LABELS[lng]}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'topbar') {
    return (
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11.5px] font-medium text-white/70 hover:text-white hover:bg-white/15 transition-colors"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <Globe className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          <span>{currentLang.toUpperCase()}</span>
          <ChevronDown
            className="w-3 h-3 shrink-0 transition-transform"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
            strokeWidth={2}
          />
        </button>

        {open && (
          <div
            role="listbox"
            className="absolute right-0 top-full mt-1 w-36 rounded-md bg-white border border-gray-200 shadow-sm py-1 z-50"
          >
            {langs.map((lng) => (
              <button
                key={lng}
                type="button"
                role="option"
                aria-selected={currentLang === lng}
                onClick={() => handleSelect(lng)}
                className={`w-full text-left px-3 py-1.5 text-[12px] transition-colors ${
                  currentLang === lng
                    ? 'text-brand-700 font-semibold bg-brand-50'
                    : 'text-gray-800 hover:bg-gray-50'
                }`}
              >
                {LANG_LABELS[lng]}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // variant === 'sidebar' — dark background, opens upward, full-width
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11.5px] font-medium text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
        <span className="flex-1 text-left">{LANG_LABELS[currentLang] || currentLang.toUpperCase()}</span>
        <ChevronDown
          className="w-3 h-3 shrink-0 transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          strokeWidth={2}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute bottom-full left-0 right-0 mb-1 rounded-md py-0.5 z-50"
          style={{ background: 'rgba(10,10,10,0.92)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          {langs.map((lng) => (
            <button
              key={lng}
              type="button"
              role="option"
              aria-selected={currentLang === lng}
              onClick={() => handleSelect(lng)}
              className={`w-full text-left px-3 py-1.5 text-[11.5px] transition-colors ${
                currentLang === lng
                  ? 'text-white font-semibold bg-white/10'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {LANG_LABELS[lng]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default LanguageSwitcher;
