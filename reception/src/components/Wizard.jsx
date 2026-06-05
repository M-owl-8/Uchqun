import { CheckCircle2, ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Wizard({
  steps = [],
  currentStep = 0,
  onBack,
  onNext,
  onSaveDraft,
  onComplete,
  isFirst = false,
  isLast = false,
  loading = false,
  title,
  children,
}) {
  const { t } = useTranslation();
  const total = steps.length;

  return (
    <article className="bg-surface border border-slate-200 rounded-lg shadow-xs overflow-hidden">
      {/* Progress strip */}
      <div className="px-6 pt-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[12px] font-mono uppercase tracking-wider text-brand-700">
            {t('wizard.stepOf', { current: currentStep + 1, total })}
          </div>
          {title && <div className="text-[12px] text-slate-500">{title}</div>}
        </div>

        {/* Segment bars */}
        <div className="flex items-center gap-2">
          {Array.from({ length: total }).map((_, idx) => {
            const done = idx < currentStep;
            const current = idx === currentStep;
            return (
              <div
                key={idx}
                className={`flex-1 h-1.5 rounded-full relative ${
                  done || current ? 'bg-brand-600' : 'bg-slate-200'
                }`}
              >
                {current && (
                  <span className="absolute -top-1 -bottom-1 right-0 w-2 rounded-full bg-brand-600 halo" />
                )}
              </div>
            );
          })}
        </div>

        {/* Step labels */}
        <div
          className="mt-3 text-[12.5px]"
          style={{ display: 'grid', gridTemplateColumns: `repeat(${total}, 1fr)` }}
        >
          {steps.map((label, idx) => {
            const done = idx < currentStep;
            const current = idx === currentStep;
            return (
              <div key={idx} className={`flex items-center gap-2 ${done ? 'text-slate-700' : current ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
                {done ? (
                  <CheckCircle2
                    className="w-4 h-4 text-success-600 shrink-0"
                    style={{ fill: '#DFE4BE', stroke: '#5C7329' }}
                    strokeWidth={2.4}
                  />
                ) : (
                  <span
                    className={`w-4 h-4 rounded-full inline-flex items-center justify-center text-[10px] num shrink-0 ${
                      current
                        ? 'bg-brand-600 text-white font-semibold'
                        : 'border border-slate-300'
                    }`}
                  >
                    {idx + 1}
                  </span>
                )}
                <span className="truncate">{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="border-t border-slate-100 mt-6">
        {children}
      </div>

      {/* Footer */}
      <footer className="px-6 py-4 bg-paper border-t border-slate-100 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={isFirst}
          className="h-9 px-3 rounded-md hover:bg-slate-100 text-slate-700 text-[13px] font-medium inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2} />
          {t('wizard.back')}
        </button>

        <div className="flex items-center gap-2">
          {onSaveDraft && (
            <button
              type="button"
              onClick={onSaveDraft}
              className="h-9 px-3 rounded-md hover:bg-slate-100 text-slate-700 text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors"
            >
              <Save className="w-4 h-4" strokeWidth={2} />
              {t('wizard.saveDraft')}
            </button>
          )}

          {isLast ? (
            <button
              type="button"
              onClick={onComplete}
              disabled={loading}
              className="h-10 px-5 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-[14px] font-medium inline-flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
              {loading ? t('wizard.saving') : t('wizard.complete')}
            </button>
          ) : (
            <button
              type="button"
              onClick={onNext}
              disabled={loading}
              className="h-10 px-5 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-[14px] font-medium inline-flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
              {t('wizard.next')}
              <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </button>
          )}
        </div>
      </footer>
    </article>
  );
}
