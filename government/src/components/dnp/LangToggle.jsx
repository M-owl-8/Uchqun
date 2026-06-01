import { useEffect } from 'react';
import { GlobeIcon } from '../icons/GlobeIcon';

const STORAGE_KEY = 'dnp:lang';

/**
 * DNP LangToggle — globe icon + UZ/RU segmented buttons.
 *
 * Props:
 *   lang     'uz' | 'ru'
 *   setLang  (lang: string) => void
 */
export function LangToggle({ lang, setLang }) {
  // On mount: read persisted preference and apply it
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'uz' || saved === 'ru' || saved === 'en') {
      setLang(saved);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSelect(value) {
    setLang(value);
    localStorage.setItem(STORAGE_KEY, value);
    document.documentElement.lang = value;
  }

  return (
    <div className="inline-flex items-center gap-[4px]">
      <span className="text-[#6A7A6B] mr-[2px]">
        <GlobeIcon size={14} />
      </span>

      {['uz', 'ru', 'en'].map((code) => {
        const isActive = lang === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => handleSelect(code)}
            className={[
              'px-[9px] py-[5px] rounded-[7px]',
              'text-[11.5px] font-bold tracking-[0.04em] uppercase',
              'transition-colors duration-150',
              isActive
                ? 'bg-[#4F7B4E] text-white'
                : 'text-[#6A7A6B] hover:bg-[rgba(28,42,30,.05)]',
            ].join(' ')}
          >
            {code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
