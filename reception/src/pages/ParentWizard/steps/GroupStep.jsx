import { useEffect, useState } from 'react';
import api from '../../../services/api';
import * as cache from '../../../../../shared/utils/cache';

export default function GroupStep({ data, onChange, parentData, childData }) {
  const [groups, setGroups] = useState(() => cache.get('reception:groups') || []);
  const [loading, setLoading] = useState(!cache.get('reception:groups'));

  useEffect(() => {
    const cached = cache.get('reception:groups');
    if (cached) { setGroups(cached); setLoading(false); return; }
    api.get('/groups')
      .then((res) => {
        const g = Array.isArray(res.data.groups) ? res.data.groups : [];
        cache.set('reception:groups', g);
        setGroups(g);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selected = data.groupId;

  return (
    <div className="p-6">
      <h3 className="h2-tab text-[16px] font-semibold text-slate-900 mb-1">
        Guruh tayinlash
      </h3>
      {childData?.firstName && (
        <p className="text-[13px] text-slate-500 mb-5">
          {childData.firstName} uchun mos guruhni tanlang. Yosh oralig'iga e'tibor bering.
        </p>
      )}

      {loading ? (
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skel h-36 rounded-lg" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-8 text-[13px] text-slate-400">
          Guruhlar topilmadi
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {groups.map((group) => {
            const capacity = group.capacity || 12;
            const enrolled = group.enrolledCount || group.children?.length || 0;
            const pct = Math.min(100, Math.round((enrolled / capacity) * 100));
            const isSelected = selected === String(group.id);
            return (
              <label
                key={group.id}
                className={`block cursor-pointer rounded-lg border-2 p-4 transition-all ${
                  isSelected
                    ? 'border-brand-600 bg-brand-50/40 shadow-xs'
                    : 'border-slate-200 bg-surface hover:border-brand-300 hover:shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[15px] font-semibold text-slate-900">
                      {group.name ? `"${group.name}"` : `Guruh ${group.id}`}
                    </div>
                    <div className="text-[12px] text-slate-500 mt-0.5">
                      {group.ageRange || ''}{group.schedule ? ` · ${group.schedule}` : ''}
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="group"
                    checked={isSelected}
                    onChange={() => onChange({ ...data, groupId: String(group.id) })}
                    className="accent-brand-600 w-4 h-4 mt-0.5"
                  />
                </div>
                {group.teacher && (
                  <div className="mt-3 text-[12.5px] text-slate-700">
                    O'qituvchi · <span className="text-slate-900 font-medium">{group.teacher?.firstName} {group.teacher?.lastName}</span>
                  </div>
                )}
                <div className="mt-3">
                  <div className="flex items-baseline justify-between text-[11.5px] font-mono text-slate-500">
                    <span>To'liqlik</span>
                    <span className="num text-slate-900">{enrolled} / {capacity}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full bg-brand-600"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      )}

      {/* Confirmation summary */}
      {selected && (parentData?.firstName || childData?.firstName) && (
        <div className="mt-6 p-4 rounded-lg border border-slate-200 bg-paper text-[13.5px] text-slate-700 space-y-1">
          <div className="font-medium text-slate-900 mb-2">Xulosa</div>
          {parentData?.firstName && (
            <div className="flex justify-between">
              <span className="text-slate-500">Ota-ona</span>
              <span>{parentData.firstName} {parentData.lastName}</span>
            </div>
          )}
          {childData?.firstName && (
            <div className="flex justify-between">
              <span className="text-slate-500">Bola</span>
              <span>{childData.firstName} {childData.lastName}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500">Guruh</span>
            <span>{groups.find((g) => String(g.id) === selected)?.name || selected}</span>
          </div>
        </div>
      )}
    </div>
  );
}
