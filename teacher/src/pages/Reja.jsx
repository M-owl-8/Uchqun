// TP-IA-REDESIGN — Reja tab.
// TP-MONITORING-SEPARATION — added "Kuzatuv" sub-tab linking to the
// dedicated monitoring hub at /teacher/monitoring.
//
// Three sub-tabs:
//   - Individual reja  → existing Activities.jsx (the curriculum plan)
//   - Terapiya         → existing TherapyManagement.jsx (therapy library + sessions)
//   - Kuzatuv          → MonitoringJournal (emotional + daily + weekly tabs)

import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ClipboardList, Stethoscope, Activity } from 'lucide-react';
import Activities from './Activities';
import TherapyManagement from './TherapyManagement';
import MonitoringJournal from './MonitoringJournal';

const SUB_TABS = [
  { key: 'activities', labelKey: 'reja.tabActivities', icon: ClipboardList, Component: Activities },
  { key: 'therapy',    labelKey: 'reja.tabTherapy',    icon: Stethoscope,   Component: TherapyManagement },
  { key: 'monitoring', labelKey: 'reja.tabMonitoring', icon: Activity,      Component: MonitoringJournal },
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
