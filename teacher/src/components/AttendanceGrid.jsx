import { Check, X, Home, Thermometer, Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ChildAvatar } from './ChildAvatar';

// Care-institution presence cycle: unset → present → home_leave → sick → hospitalized → absent → unset
const STATES = ['unset', 'present', 'home_leave', 'sick', 'hospitalized', 'absent'];

const STATE_STYLE = {
  unset:        { border: '2px dashed #DDE0E6', bg: '#FFFFFE', labelColor: '#959BA8', icon: null,       iconBg: null },
  present:      { border: '2px solid #7AB89A',  bg: '#FFFFFE', labelColor: '#4F8C72', icon: Check,      iconBg: '#7AB89A' },
  home_leave:   { border: '2px solid #C58A1F',  bg: '#FFFBF0', labelColor: '#8E6314', icon: Home,       iconBg: '#C58A1F' },
  sick:         { border: '2px solid #4D6584',  bg: '#F5F8FC', labelColor: '#37495F', icon: Thermometer, iconBg: '#4D6584' },
  hospitalized: { border: '2px solid #7C5CBF',  bg: '#F8F5FF', labelColor: '#5B3D9A', icon: Building2,  iconBg: '#7C5CBF' },
  absent:       { border: '2px solid #E55A4E',  bg: '#FFF0EF', labelColor: '#B83025', icon: X,          iconBg: '#E55A4E' },
};

const STATE_LABEL_KEY = {
  unset:        'attendance.statusUnset',
  present:      'attendance.statusPresent',
  home_leave:   'attendance.statusHomeLeave',
  sick:         'attendance.statusSick',
  hospitalized: 'attendance.statusHospitalized',
  absent:       'attendance.statusAbsent',
};

function ChildCard({ child, state, onStateChange }) {
  const { t } = useTranslation();
  const style = STATE_STYLE[state] || STATE_STYLE.unset;
  const { icon: Icon } = style;
  const label = t(STATE_LABEL_KEY[state] || STATE_LABEL_KEY.unset);

  const handleTap = () => {
    const nextIdx = (STATES.indexOf(state) + 1) % STATES.length;
    onStateChange(child.id, STATES[nextIdx]);
  };

  return (
    <button
      type="button"
      onClick={handleTap}
      className="rounded-xl p-3 text-center transition-all duration-150 active:scale-95"
      style={{ border: style.border, background: style.bg }}
      aria-label={`${child.firstName} ${child.lastName}: ${label}`}
    >
      <div className="mx-auto">
        <ChildAvatar child={child} size="md" />
      </div>
      <div className="mt-2 text-[13px] font-medium text-slate-900 truncate">
        {child.firstName} {child.lastName?.charAt(0)}.
      </div>
      <div className="mt-1 flex items-center justify-center gap-1 text-[11px] font-medium" style={{ color: style.labelColor }}>
        {Icon && (
          <span
            className="w-3.5 h-3.5 rounded-full grid place-items-center"
            style={{ background: style.iconBg }}
          >
            <Icon className="w-2.5 h-2.5 text-surface" strokeWidth={2.5} />
          </span>
        )}
        {label}
      </div>
    </button>
  );
}

/**
 * AttendanceGrid — 2-column grid of child cards.
 * states: { [childId]: 'unset' | 'present' | 'home_leave' | 'sick' | 'hospitalized' | 'absent' }
 * onStateChange(childId, newState)
 */
export function AttendanceGrid({ childList, states, onStateChange }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {childList.map((child) => (
        <ChildCard
          key={child.id}
          child={child}
          state={states[child.id] || 'unset'}
          onStateChange={onStateChange}
        />
      ))}
    </div>
  );
}
