import { useTranslation } from 'react-i18next';
import { ChevronDown, Calendar } from 'lucide-react';

function calcAge(dob) {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  if (months < 0) { years--; months += 12; }
  return { years, months };
}

function GenderPill({ value, onChange }) {
  const { t } = useTranslation();
  return (
    <div className="inline-flex items-center p-0.5 rounded-md border border-slate-200 bg-paper text-[13.5px]">
      <button
        type="button"
        onClick={() => onChange('Male')}
        className={`px-3 h-9 rounded-md font-medium transition-colors ${
          value === 'Male' ? 'bg-brand-600 text-white' : 'text-slate-700 hover:text-slate-900'
        }`}
      >
        {t('gender.male')}
      </button>
      <button
        type="button"
        onClick={() => onChange('Female')}
        className={`px-3 h-9 rounded-md font-medium transition-colors ${
          value === 'Female' ? 'bg-brand-600 text-white' : 'text-slate-700 hover:text-slate-900'
        }`}
      >
        {t('gender.female')}
      </button>
    </div>
  );
}

export default function ChildStep({ data, onChange }) {
  const { t } = useTranslation();

  const field = (key) => ({
    value: data[key] || '',
    onChange: (e) => onChange({ ...data, [key]: e.target.value }),
  });

  const age = calcAge(data.dateOfBirth);

  return (
    <div className="p-6">
      <h3 className="h2-tab text-[16px] font-semibold text-slate-900 mb-5">
        {t('childStep.title')}
      </h3>
      <div className="grid md:grid-cols-2 gap-x-6 gap-y-5">
        {/* First name */}
        <div>
          <label className="block text-[13px] font-medium text-slate-800 mb-1.5">
            {t('childStep.firstName')} <span className="text-error-500">*</span>
          </label>
          <input
            type="text"
            {...field('firstName')}
            required
            className="input-ring w-full h-10 px-3 rounded-md border border-slate-300 bg-surface text-[14px] text-slate-900 focus:outline-none"
          />
        </div>

        {/* Last name */}
        <div>
          <label className="block text-[13px] font-medium text-slate-800 mb-1.5">
            {t('childStep.lastName')} <span className="text-error-500">*</span>
          </label>
          <input
            type="text"
            {...field('lastName')}
            required
            className="input-ring w-full h-10 px-3 rounded-md border border-slate-300 bg-surface text-[14px] text-slate-900 focus:outline-none"
          />
        </div>

        {/* Date of birth */}
        <div>
          <label className="block text-[13px] font-medium text-slate-800 mb-1.5">
            {t('childStep.dateOfBirth')} <span className="text-error-500">*</span>
          </label>
          <div className="relative">
            <input
              type="date"
              {...field('dateOfBirth')}
              required
              className="input-ring w-full h-10 pl-3 pr-10 rounded-md border border-slate-300 bg-surface text-[14px] num text-slate-900 focus:outline-none"
            />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" strokeWidth={2} />
          </div>
          {age && (
            <p className="text-[12px] text-slate-500 mt-1.5">
              {t('childStep.ageLabel')}{' '}
              <span className="num text-slate-700">
                {t('childStep.years', { count: age.years })}, {t('childStep.months', { count: age.months })}
              </span>
            </p>
          )}
        </div>

        {/* Gender — 2-segment pill toggle */}
        <div>
          <div className="text-[13px] font-medium text-slate-800 mb-1.5">
            {t('childStep.gender')} <span className="text-error-500">*</span>
          </div>
          <GenderPill
            value={data.gender || 'Male'}
            onChange={(val) => onChange({ ...data, gender: val })}
          />
        </div>

        {/* Disability / diagnosis type */}
        <div>
          <label className="block text-[13px] font-medium text-slate-800 mb-1.5">
            {t('childStep.disabilityType')} <span className="text-error-500">*</span>
          </label>
          <div className="relative">
            <select
              value={data.disabilityType || ''}
              onChange={(e) => onChange({ ...data, disabilityType: e.target.value })}
              required
              className="input-ring w-full h-10 px-3 pr-10 rounded-md border border-slate-300 bg-surface text-[14px] text-slate-900 appearance-none focus:outline-none"
            >
              <option value="">{t('childStep.select')}</option>
              <option value="autism">{t('disabilityType.autism')}</option>
              <option value="hearing">{t('disabilityType.hearing')}</option>
              <option value="vision">{t('disabilityType.vision')}</option>
              <option value="speech">{t('disabilityType.speech')}</option>
              <option value="mixed">{t('disabilityType.mixed')}</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none w-4 h-4" strokeWidth={2} />
          </div>
        </div>

        {/* Diagnosis level */}
        <div>
          <label className="block text-[13px] font-medium text-slate-800 mb-1.5">
            {t('childStep.diagnosisLevel')}
          </label>
          <div className="relative">
            <select
              value={data.diagnosisLevel || ''}
              onChange={(e) => onChange({ ...data, diagnosisLevel: e.target.value })}
              className="input-ring w-full h-10 px-3 pr-10 rounded-md border border-slate-300 bg-surface text-[14px] text-slate-900 appearance-none focus:outline-none"
            >
              <option value="">{t('childStep.select')}</option>
              <option value="light">{t('diagnosisLevel.light')}</option>
              <option value="medium">{t('diagnosisLevel.medium')}</option>
              <option value="heavy">{t('diagnosisLevel.heavy')}</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none w-4 h-4" strokeWidth={2} />
          </div>
        </div>

        {/* Special needs */}
        <div className="md:col-span-2">
          <label className="block text-[13px] font-medium text-slate-800 mb-1.5">
            {t('childStep.specialNeeds')}
          </label>
          <textarea
            rows={3}
            {...field('specialNeeds')}
            className="input-ring w-full px-3 py-2 rounded-md border border-slate-300 bg-surface text-[14px] text-slate-900 focus:outline-none resize-none"
            placeholder={t('childStep.specialNeedsPlaceholder')}
          />
        </div>
      </div>
    </div>
  );
}
