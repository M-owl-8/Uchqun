import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Copy, Check, AlertTriangle } from 'lucide-react';

function CopyField({ label, value, copyLabel }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-slate-500 mb-0.5">{label}</p>
        <p className="text-[13px] font-mono font-semibold text-slate-900 break-all">{value}</p>
      </div>
      <button
        onClick={handleCopy}
        className="shrink-0 p-1.5 rounded text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
        title={copyLabel}
      >
        {copied ? <Check className="w-4 h-4 text-success-600" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function WizardCompletePage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { t } = useTranslation();
  const email = state?.email;
  const password = state?.password;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-20 h-20 rounded-full bg-success-50 flex items-center justify-center mb-6">
        <CheckCircle2
          className="w-10 h-10 text-success-600"
          style={{ fill: '#DFE4BE', stroke: '#5C7329' }}
          strokeWidth={2.4}
        />
      </div>

      <h1 className="text-[28px] font-semibold text-slate-900 mb-2">
        {t('wizard.completePage.title', { defaultValue: 'Tayyor!' })}
      </h1>
      <p className="text-[14px] text-slate-500 max-w-[40ch] mx-auto mb-6">
        {t('wizard.completePage.description', { defaultValue: "Ota-ona, bola va guruh muvaffaqiyatli ro'yxatdan o'tkazildi." })}
      </p>

      {email && password && (
        <div className="w-full max-w-sm mb-8 text-left rounded-xl border border-warning-100 bg-warning-50 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-warning-600 mt-0.5 shrink-0" strokeWidth={2} />
            <p className="text-[12.5px] text-warning-700 font-medium leading-snug">
              {t('wizard.completePage.credentialsWarning', { defaultValue: "Yangi ota-ona uchun ma'lumotlar — bu sahifani yopgandan keyin parol qaytadan ko'rsatilmaydi." })}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-warning-100 p-3 space-y-3">
            <CopyField label="Email" value={email} copyLabel={t('wizard.completePage.copy', { defaultValue: 'Nusxa olish' })} />
            <div className="border-t border-warning-100" />
            <CopyField
              label={t('wizard.completePage.passwordLabel', { defaultValue: 'Parol' })}
              value={password}
              copyLabel={t('wizard.completePage.copy', { defaultValue: 'Nusxa olish' })}
            />
          </div>
          <p className="text-[11.5px] text-warning-700">
            {t('wizard.completePage.credentialsNote', { defaultValue: "Bu parolni ota-onaga yetkazing. Birinchi kirishda o'zgartirishni tavsiya eting." })}
          </p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/reception/parents/new')}
          className="h-10 px-5 rounded-md border border-slate-300 bg-surface hover:bg-slate-50 text-slate-800 text-[13.5px] font-medium transition-colors"
        >
          {t('wizard.completePage.addAnother', { defaultValue: "Yana qo'shish" })}
        </button>
        <button
          onClick={() => navigate('/reception')}
          className="h-10 px-5 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-[13.5px] font-medium transition-colors"
        >
          {t('wizard.completePage.backToDashboard', { defaultValue: 'Boshqaruv paneliga' })}
        </button>
      </div>
    </div>
  );
}
