// TP-IA-REDESIGN — Reja tab.
//
// Two sub-tabs:
//   - Individual reja  → existing Activities.jsx (the curriculum plan)
//   - Terapiya         → existing TherapyManagement.jsx (therapy library + sessions)
//
// Sub-tab state lives in ?tab=activities|therapy so it's deep-linkable and
// the DesktopTopNav can land on a specific sub-tab from elsewhere.

import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ClipboardList, Stethoscope } from 'lucide-react';
import Activities from './Activities';
import TherapyManagement from './TherapyManagement';

const SUB_TABS = [
  { key: 'activities', labelKey: 'reja.tabActivities', icon: ClipboardList, Component: Activities },
  { key: 'therapy',    labelKey: 'reja.tabTherapy',    icon: Stethoscope,   Component: TherapyManagement },
];

const Reja = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeKey = searchParams.get('tab') || 'activities';
  const active = SUB_TABS.find(t => t.key === activeKey) || SUB_TABS[0];
  const ActiveComponent = active.Component;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 border-b border-slate-200 -mb-px overflow-x-auto">
        {SUB_TABS.map((tab) => {
          const isActive = tab.key === activeKey;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSearchParams({ tab: tab.key })}
              className={`flex items-center gap-2 px-4 py-3 text-[14px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>
      <div>
        <ActiveComponent />
      </div>
    </div>
  );
};

export default Reja;
