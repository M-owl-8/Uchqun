import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import { Eye, EyeOff, AlertTriangle, DoorOpen, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@shared/components/LanguageSwitcher';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      navigate('/reception');
    } else {
      if (result.status === 429) setError(t('login.accountLocked'));
      else if (result.status === 403 && result.error === 'ACCOUNT_NOT_ACTIVE') setError(t('login.accountSuspended', { defaultValue: "Hisobingiz to'xtatilgan. Maktab administratori bilan bog'laning." }));
      else if (result.status === 403) setError(t('login.notApproved'));
      else setError(t('login.invalid'));
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* ── LEFT PANEL (hidden below lg) ── */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col"
        style={{ background: 'linear-gradient(160deg, #1B2B2D 0%, #2A3B3D 55%, #324A4C 100%)' }}
      >
        {/* Logo row */}
        <div className="px-10 pt-10 flex items-center gap-3">
          <span
            className="inline-flex items-center justify-center w-10 h-10 bg-brand-600 text-white text-[17px] font-bold shrink-0"
            style={{ borderRadius: '22%' }}
          >
            U
          </span>
          <div>
            <div className="text-[16px] font-bold text-white leading-none">Uchqun</div>
            <div className="text-[12px] leading-none mt-1" style={{ color: '#8FA2A4' }}>
              {t('sidebar.subtitle')}
            </div>
          </div>
        </div>

        {/* Hero block */}
        <div className="flex-1 flex flex-col justify-center px-10">
          {/* Pill badge */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5 w-fit"
            style={{ background: 'rgba(200,144,48,0.14)', border: '1px solid rgba(200,144,48,0.28)' }}
          >
            <DoorOpen className="w-3.5 h-3.5 shrink-0" style={{ color: '#DCAD3F' }} strokeWidth={2} />
            <span className="text-[12px] font-medium" style={{ color: '#DCAD3F' }}>
              {t('login.portalBadge')}
            </span>
          </div>

          {/* Eyebrow */}
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.13em] mb-3" style={{ color: '#8FA2A4' }}>
            {t('login.eyebrow')}
          </p>

          {/* Headline */}
          <h1 className="text-[28px] font-bold text-white leading-[1.25] mb-4">
            {t('login.headline')}
          </h1>

          {/* Subtitle */}
          <p className="text-[14px] leading-relaxed" style={{ color: '#8FA2A4' }}>
            {t('login.heroSubtitle')}
          </p>
        </div>

        {/* Bottom row */}
        <div className="px-10 pb-10 flex items-center gap-3">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.07)' }}
          >
            <Shield className="w-3 h-3 shrink-0" style={{ color: '#8FA2A4' }} strokeWidth={2} />
            <span className="text-[11px]" style={{ color: '#8FA2A4' }}>
              {t('login.tlsBadge')}
            </span>
          </div>
          <div className="h-3 w-px shrink-0" style={{ background: '#445759' }} />
          <span className="text-[11px]" style={{ color: '#8FA2A4' }}>
            {t('login.copyright')}
          </span>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-paper">
        <div className="w-full max-w-md">
          {/* Pill badge */}
          <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-100">
            <DoorOpen className="w-3.5 h-3.5 text-brand-700 shrink-0" strokeWidth={2} />
            <span className="text-[12px] font-medium text-brand-700">
              {t('login.portalBadge')}
            </span>
          </div>

          <h2 className="text-[28px] font-bold text-slate-900 mb-1 tracking-tight">
            {t('login.welcome')}
          </h2>
          <p className="text-[14px] text-slate-500 mb-8">
            {t('login.subtitle')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-start gap-3 p-3 rounded-md bg-error-50 border border-error-100 text-[12.5px] text-error-700">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2} />
                <span>{error}</span>
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-[13px] font-medium text-slate-800 mb-1.5">
                {t('login.email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="siz@maktab.uz"
                className="input-ring w-full h-10 px-3 rounded-md border border-slate-300 bg-surface text-[14px] text-slate-900 focus:outline-none"
              />
            </div>

            {/* Password */}
            <div>
              <div className="mb-1.5">
                <label htmlFor="password" className="block text-[13px] font-medium text-slate-800">
                  {t('login.password')}
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input-ring w-full h-10 pl-3 pr-10 rounded-md border border-slate-300 bg-surface text-[14px] text-slate-900 focus:outline-none"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember device */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 accent-brand-600 cursor-pointer"
              />
              <span className="text-[13px] text-slate-700">{t('login.rememberDevice')}</span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white text-[14.5px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  {t('login.loading')}
                </>
              ) : (
                t('login.submit')
              )}
            </button>
          </form>

          {/* Warning notice */}
          <div className="mt-5 flex items-start gap-3 p-3 rounded-md bg-warning-50 border border-warning-100 text-[12.5px] text-warning-700">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2} />
            <div className="leading-[1.5]">{t('login.documentsNotice')}</div>
          </div>

          {/* Divider + footer */}
          <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between gap-4">
            <span className="text-[11.5px] text-slate-400">{t('login.footerLeft')}</span>
            <LanguageSwitcher variant="auth" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
