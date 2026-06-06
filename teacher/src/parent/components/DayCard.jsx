import { Activity, UtensilsCrossed, Camera } from 'lucide-react';
import { useTranslation } from 'react-i18next';
// PP-DATE-LOCALE: shared util drives the dashboard date display via i18n.language.
import { formatDateWeekdayMonth } from '@shared/utils/formatDate';

/**
 * DayCard — a single school day rendered as a book page.
 *
 * Props:
 *   date         string   ISO date string or display date
 *   activities   number
 *   meals        number
 *   media        number
 *   milestone    string?  milestone label (renders honey sticker)
 *   isToday      boolean
 *   onClick      fn?
 */
const DayCard = ({
  date,
  activities = 0,
  meals = 0,
  media = 0,
  milestone,
  isToday = false,
  onClick,
}) => {
  const { i18n } = useTranslation();
  const displayDate = typeof date === 'string' && date.includes('-')
    ? formatDateWeekdayMonth(date, i18n.language)
    : date;

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={`page-card page-corner rounded-xl p-5 transition-shadow ${
        onClick ? 'cursor-pointer hover:shadow-md active:scale-[.99]' : ''
      } ${isToday ? 'ring-1 ring-p-brand-300' : ''}`}
    >
      {/* Date row */}
      <div className="flex items-start justify-between mb-3">
        <div>
          {isToday && (
            <span className="text-[10px] uppercase tracking-[.12em] font-semibold text-p-brand-600 block mb-0.5">
              Bugun
            </span>
          )}
          <p className="font-serif text-[15px] font-semibold text-p-ink leading-snug">
            {displayDate}
          </p>
        </div>
        {milestone && (
          <span className="ml-2 shrink-0 px-2 py-0.5 rounded-full bg-p-honey-100 text-p-honey-700 text-[11px] font-semibold border border-p-honey-300">
            {milestone}
          </span>
        )}
      </div>

      {/* Stitch divider */}
      <div className="stitch mb-3" />

      {/* Stats row */}
      <div className="flex items-center gap-5 text-[13px] text-p-sepia-600">
        <span className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-p-brand-400" />
          {activities}
        </span>
        <span className="flex items-center gap-1.5">
          <UtensilsCrossed className="w-3.5 h-3.5 text-p-brand-400" />
          {meals}
        </span>
        <span className="flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-p-brand-400" />
          {media}
        </span>
      </div>
    </div>
  );
};

export default DayCard;
