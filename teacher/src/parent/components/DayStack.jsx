import DayCard from './DayCard';

/**
 * DayStack — renders an ordered list of DayCards (newest first).
 * Falls back gracefully when days is empty.
 */
const DayStack = ({ days = [], onDayClick }) => {
  if (!days.length) {
    return (
      <div className="page-card rounded-xl p-8 text-center">
        <p className="font-serif text-[17px] text-p-sepia-500">
          Hali ma'lumot yo'q
        </p>
        <p className="mt-1 text-[13px] text-p-sepia-400">
          Tarbiyachi faoliyatni kiritgach, bu yerda ko'rinadi.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {days.map((day, i) => (
        <DayCard
          key={day.date || i}
          date={day.date}
          activities={day.activities}
          meals={day.meals}
          media={day.media}
          milestone={day.milestone}
          isToday={i === 0}
          onClick={onDayClick ? () => onDayClick(day) : undefined}
        />
      ))}
    </div>
  );
};

export default DayStack;
