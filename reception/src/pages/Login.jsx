import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { Eye, EyeOff, Mail, Lock, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Login = () => {
  const [email, setEmail] = useState('');
  // Fix E: password starts empty — never pre-filled
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      navigate('/reception');
    } else {
      if (result.status === 429) setError(t('login.accountLocked'));
      else if (result.status === 403) setError(t('login.notApproved'));
      else setError(t('login.invalid'));
    }

    setLoading(false);
  };

  const langs = ['UZ', 'RU', 'EN'];
  const currentLang = (i18n.language || 'uz').toUpperCase().slice(0, 2);
  const handleLang = (lang) => {
    i18n.changeLanguage(lang.toLowerCase());
    localStorage.setItem('lang', lang.toLowerCase());
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: [
          'radial-gradient(900px 600px at 88% 10%, #FBF3DE 0%, transparent 60%)',
          'radial-gradient(700px 500px at 6% 92%, rgba(90,138,135,0.16) 0%, transparent 65%)',
          '#FBFAF6',
        ].join(', '),
      }}
    >
      {/* Rhombus motif backdrop */}
      <div
        className="fixed inset-0 motif-rhombus motif-rhombus-lg text-brand-700 pointer-events-none"
        aria-hidden="true"
        style={{ opacity: 0.03 }}
      />

      <div className="relative w-full max-w-[440px]">
        {/* Card — Fix D: rounded-lg shadow-md */}
        <div className="relative bg-surface border border-slate-200 rounded-lg shadow-md overflow-hidden">
          {/* Folder-tab signature */}
          <span className="absolute top-0 left-6 h-[3px] w-12 rounded-b-[2px] bg-brand-600" />

          <div className="px-8 pt-8 pb-7">
            {/* Wordmark */}
            <div className="flex items-center gap-2.5 mb-7">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-teak text-brand-200 text-[16px] font-semibold tracking-wider">
                U
              </span>
              <div>
                <div className="text-[16px] font-semibold text-slate-900 leading-none">Uchqun</div>
                <div className="text-[12px] text-slate-500 mt-1 leading-none">Qabulxona portali</div>
              </div>
            </div>

            <h1 className="text-[26px] font-semibold text-slate-900 tracking-tight">
              {t('login.welcome', { defaultValue: 'Xush kelibsiz' })}
            </h1>
            <p className="text-[13.5px] text-slate-500 mt-1.5">
              {t('login.subtitle', { defaultValue: 'Iltimos, hisobingizga kiring.' })}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              {error && (
                <div className="flex items-start gap-3 p-3 rounded-md bg-error-50 border border-error-100 text-[12.5px] text-error-700">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2} />
                  <span>{error}</span>
                </div>
              )}

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-[13px] font-medium text-slate-800 mb-1.5">
                  {t('login.email', { defaultValue: 'Email' })}
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    style={{ width: 18, height: 18 }}
                    strokeWidth={2}
                  />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="siz@maktab.uz"
                    className="input-ring w-full h-10 pl-10 pr-3 rounded-md border border-slate-300 bg-surface text-[14px] text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <label htmlFor="password" className="block text-[13px] font-medium text-slate-800">
                    {t('login.password', { defaultValue: 'Parol' })}
                  </label>
                  <button
                    type="button"
                    className="text-[12.5px] text-brand-700 hover:text-brand-800"
                    tabIndex={-1}
                  >
                    {t('login.forgotPassword', { defaultValue: 'Parolni unutdingizmi?' })}
                  </button>
                </div>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    style={{ width: 18, height: 18 }}
                    strokeWidth={2}
                  />
                  {/* Fix E: empty password input — value controlled by state, starts as '' */}
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="input-ring w-full h-10 pl-10 pr-10 rounded-md border border-slate-300 bg-surface text-[14px] text-slate-900 focus:outline-none"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t('login.hidePassword', { defaultValue: 'Parolni yashirish' }) : t('login.showPassword', { defaultValue: 'Parolni ko\'rsatish' })}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white text-[14.5px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    {t('login.loading', { defaultValue: 'Kirish…' })}
                  </>
                ) : (
                  t('login.submit', { defaultValue: 'Kirish' })
                )}
              </button>
            </form>
          </div>

          {/* Documents-not-approved notice */}
          <div className="px-8 pb-7">
            <div className="flex items-start gap-3 p-3 rounded-md bg-warning-50 border border-warning-100 text-[12.5px] text-warning-700">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2} />
              <div className="leading-[1.5]">
                {t('login.documentsNotice', { defaultValue: "Hujjatlaringiz hali tasdiqlanmagan bo'lsa, kirish mumkin emas. Maktab rahbari bilan bog'laning." })}
              </div>
            </div>
          </div>
        </div>

        {/* Below card — Fix B: bare IHMA text, no expansion subtitle */}
        <div className="mt-6 flex items-center justify-between gap-4 text-[12px] text-slate-500">
          <div className="flex items-center gap-2">
            {/* Fix B: just bare "IHMA" badge, no "Innovation in Health, Medicine & Aging" */}
            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-slate-200 text-slate-700 text-[10px] font-semibold">
              IHMA
            </span>
          </div>
          {/* Language pill */}
          <div className="inline-flex items-center p-0.5 rounded-full border border-slate-200 bg-surface text-[12px]">
            {langs.map((lang) => (
              <button
                key={lang}
                onClick={() => handleLang(lang)}
                className={`px-2.5 h-6 rounded-full font-medium transition-colors ${
                  currentLang === lang
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
