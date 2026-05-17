import { User, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const TherapyAssignModal = ({
  assignFormData,
  setAssignFormData,
  childList,
  loadingChildren,
  assigning,
  onAssignSave,
  onClose,
}) => {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl shadow-2xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">
            {t('therapy.assignToChild', { defaultValue: 'Bolaga Terapiya Tayinlash' })}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('therapy.selectChild', { defaultValue: 'Bolani tanlang' })} *
            </label>
            <select
              value={assignFormData.childId}
              onChange={(e) => setAssignFormData({ ...assignFormData, childId: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              disabled={loadingChildren}
            >
              <option value="">
                {loadingChildren
                  ? t('therapy.loading', { defaultValue: 'Yuklanmoqda...' })
                  : t('therapy.selectChild', { defaultValue: 'Bolani tanlang' })}
              </option>
              {childList.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.firstName} {child.lastName} ({child.parentName})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('therapy.notes', { defaultValue: 'Qo\'shimcha eslatmalar' })}
            </label>
            <textarea
              value={assignFormData.notes}
              onChange={(e) => setAssignFormData({ ...assignFormData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder={t('therapy.notesPlaceholder', { defaultValue: 'Qo\'shimcha eslatmalar...' })}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors"
              disabled={assigning}
            >
              {t('therapy.cancel', { defaultValue: 'Bekor qilish' })}
            </button>
            <button
              onClick={onAssignSave}
              disabled={assigning || !assignFormData.childId}
              className="flex-1 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {assigning ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{t('therapy.assigning', { defaultValue: 'Tayinlanmoqda...' })}</span>
                </>
              ) : (
                <>
                  <User className="w-5 h-5" />
                  <span>{t('therapy.assign', { defaultValue: 'Tayinlash' })}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TherapyAssignModal;
