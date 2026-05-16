import { Mail, ChevronDown } from 'lucide-react';

export default function ParentStep({ data, onChange }) {
  const field = (key) => ({
    value: data[key] || '',
    onChange: (e) => onChange({ ...data, [key]: e.target.value }),
  });

  return (
    <div className="p-6">
      <h3 className="h2-tab text-[16px] font-semibold text-slate-900 mb-5">
        Ota-ona ma'lumotlari
      </h3>
      <div className="grid md:grid-cols-2 gap-x-6 gap-y-5">
        {/* Ism */}
        <div>
          <label className="block text-[13px] font-medium text-slate-800 mb-1.5">
            Ism <span className="text-error-500">*</span>
          </label>
          <input
            type="text"
            {...field('firstName')}
            required
            className="input-ring w-full h-10 px-3 rounded-md border border-slate-300 bg-surface text-[14px] text-slate-900 focus:outline-none"
          />
        </div>

        {/* Familiya */}
        <div>
          <label className="block text-[13px] font-medium text-slate-800 mb-1.5">
            Familiya <span className="text-error-500">*</span>
          </label>
          <input
            type="text"
            {...field('lastName')}
            required
            className="input-ring w-full h-10 px-3 rounded-md border border-slate-300 bg-surface text-[14px] text-slate-900 focus:outline-none"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-[13px] font-medium text-slate-800 mb-1.5">
            Email <span className="text-error-500">*</span>
          </label>
          <div className="relative">
            <Mail
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              style={{ width: 18, height: 18 }}
              strokeWidth={2}
            />
            <input
              type="email"
              {...field('email')}
              required
              placeholder="ota-ona@maktab.uz"
              className="input-ring w-full h-10 pl-10 pr-3 rounded-md border border-slate-300 bg-surface text-[14px] text-slate-900 focus:outline-none"
            />
          </div>
          <p className="text-[12px] text-slate-500 mt-1.5">Tasdiqlash xati yuboriladi.</p>
        </div>

        {/* Telefon */}
        <div>
          <label className="block text-[13px] font-medium text-slate-800 mb-1.5">
            Telefon <span className="text-error-500">*</span>
          </label>
          <div className="flex">
            <span className="inline-flex items-center px-3 h-10 rounded-l-md border border-r-0 border-slate-300 bg-slate-50 text-slate-600 text-[13.5px] font-mono">
              +998
            </span>
            <input
              type="tel"
              {...field('phone')}
              required
              className="input-ring flex-1 h-10 px-3 rounded-r-md border border-slate-300 bg-surface text-[14px] num text-slate-900 focus:outline-none"
            />
          </div>
          <p className="text-[12px] text-slate-500 mt-1.5">9 raqamli telefon raqami.</p>
        </div>

        {/* Manzil */}
        <div className="md:col-span-2">
          <label className="block text-[13px] font-medium text-slate-800 mb-1.5">Manzil</label>
          <textarea
            rows={2}
            {...field('address')}
            className="input-ring w-full px-3 py-2 rounded-md border border-slate-300 bg-surface text-[14px] text-slate-900 focus:outline-none resize-none"
            placeholder="Toshkent shahri, Yunusobod tumani…"
          />
        </div>

        {/* Pasport */}
        <div>
          <label className="block text-[13px] font-medium text-slate-800 mb-1.5">
            Pasport seriya va raqami{' '}
            <span className="text-slate-400 text-[11px] font-normal">· ixtiyoriy</span>
          </label>
          <input
            type="text"
            {...field('passport')}
            placeholder="AB 1234567"
            className="input-ring w-full h-10 px-3 rounded-md border border-slate-300 bg-surface text-[14px] num text-slate-900 focus:outline-none"
          />
        </div>

        {/* Ona tili */}
        <div>
          <label className="block text-[13px] font-medium text-slate-800 mb-1.5">Ona tili</label>
          <div className="relative">
            <select
              value={data.nativeLanguage || ''}
              onChange={(e) => onChange({ ...data, nativeLanguage: e.target.value })}
              className="input-ring w-full h-10 px-3 pr-10 rounded-md border border-slate-300 bg-surface text-[14px] text-slate-900 appearance-none focus:outline-none"
            >
              <option value="">Tanlang</option>
              <option value="uzbek">O'zbek</option>
              <option value="russian">Rus</option>
              <option value="tajik">Tojik</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none w-4 h-4" strokeWidth={2} />
          </div>
        </div>

        {/* Password for new account */}
        <div>
          <label className="block text-[13px] font-medium text-slate-800 mb-1.5">
            Parol <span className="text-error-500">*</span>
          </label>
          <input
            type="password"
            {...field('password')}
            required
            autoComplete="new-password"
            className="input-ring w-full h-10 px-3 rounded-md border border-slate-300 bg-surface text-[14px] text-slate-900 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
