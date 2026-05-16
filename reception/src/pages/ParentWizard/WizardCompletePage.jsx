import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

export default function WizardCompletePage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-20 h-20 rounded-full bg-success-50 flex items-center justify-center mb-6">
        <CheckCircle2
          className="w-10 h-10 text-success-600"
          style={{ fill: '#DFE4BE', stroke: '#5C7329' }}
          strokeWidth={2.4}
        />
      </div>

      <h1 className="text-[28px] font-semibold text-slate-900 mb-2">Tayyor!</h1>
      <p className="text-[14px] text-slate-500 max-w-[40ch] mx-auto mb-8">
        Ota-ona, bola va guruh muvaffaqiyatli ro'yxatdan o'tkazildi. Hujjatlarni yuklashni unutmang.
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/reception/parents/new')}
          className="h-10 px-5 rounded-md border border-slate-300 bg-surface hover:bg-slate-50 text-slate-800 text-[13.5px] font-medium transition-colors"
        >
          Yana qo'shish
        </button>
        <button
          onClick={() => navigate('/reception')}
          className="h-10 px-5 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-[13.5px] font-medium transition-colors"
        >
          Boshqaruv paneliga
        </button>
      </div>
    </div>
  );
}
