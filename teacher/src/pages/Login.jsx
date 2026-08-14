import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../shared/context/AuthContext';
import LoadingSpinner from '../shared/components/LoadingSpinner';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, GraduationCap, Users, Shield } from 'lucide-react';
import { LanguageSwitcher } from '../../../shared/components/LanguageSwitcher';

const Login = () => {
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [showPassword, setShowPassword]     = useState(false);
  const [forgotHelpOpen, setForgotHelpOpen] = useState(false); // PL-025 (Q15)
  const [rememberDevice, setRememberDevice] = useState(false);
  const [activeRole, setActiveRole]         = useState('teacher'); // visual-only — does not gate auth
  const [error, setError]                   = useState('');
  const [loading, setLoading]               = useState(false);

  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const { t }     = useTranslation();

  // Auth logic reused verbatim — backend role determines redirect, not the toggle.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      const user = result.user || JSON.parse(localStorage.getItem('user') || '{}');

      // D-55: return the user to the route they originally requested. This app
      // serves BOTH personas, so a stored deep link is only honoured when it
      // belongs to the persona that actually logged in — otherwise a parent
      // following a teacher link would be bounced straight back to /login by
      // ProtectedRoute, and vice versa.
      const from = location.state?.from?.pathname;
      const isTeacherPath = (pth) => typeof pth === 'string' && pth.startsWith('/teacher');
      const isParentPath = (pth) =>
        typeof pth === 'string' && pth.startsWith('/') && !pth.startsWith('/teacher') && !pth.startsWith('/login');

      if (user.role === 'teacher') {
        navigate(isTeacherPath(from) ? from : '/teacher');
      } else if (user.role === 'parent') {
        navigate(isParentPath(from) ? from : '/');
      } else {
        localStorage.removeItem('user');
        setError(t('login.invalidRole'));
      }
    } else {
      if (result.status === 429) setError(t('login.accountLocked'));
      else if (result.status === 403 && result.error === 'ACCOUNT_NOT_ACTIVE') setError(t('login.accountSuspended'));
      else if (result.status === 403) setError(t('login.notApproved'));
      else setError(t('login.invalid'));
    }

    setLoading(false);
  };

  const isTeacher = activeRole === 'teacher';

  return (
    <div className="min-h-screen flex">

      {/* ── LEFT PANEL (hidden below lg) ── */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col relative overflow-hidden"
        style={{ background: '#2A2530' }}
      >
        {/* Logo row */}
        <div className="relative z-10 px-10 pt-10 flex items-center gap-3">
          <span
            className="inline-flex items-center justify-center w-10 h-10 text-[17px] font-bold shrink-0"
            style={{ background: '#7A6FA8', color: '#F4F0F5', borderRadius: '22%' }}
          >
            U
          </span>
          <div>
            <div className="text-[16px] font-bold leading-none" style={{ color: '#F4F0F5' }}>
              Uchqun
            </div>
            <div className="text-[12px] leading-none mt-1" style={{ color: '#928A9C' }}>
              {isTeacher ? t('login.teacherPortalLabel') : t('login.parentPortalLabel')}
            </div>
          </div>
        </div>

        {/* Hero block — swaps with role toggle */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-10">
          {/* Badge pill */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5 w-fit"
            style={{ background: 'rgba(122,111,168,0.18)', border: '1px solid rgba(122,111,168,0.32)' }}
          >
            {isTeacher
              ? <GraduationCap className="w-3.5 h-3.5 shrink-0" style={{ color: '#BFB2D3' }} strokeWidth={2} />
              : <Users         className="w-3.5 h-3.5 shrink-0" style={{ color: '#BFB2D3' }} strokeWidth={2} />
            }
            <span className="text-[12px] font-medium" style={{ color: '#BFB2D3' }}>
              {isTeacher ? t('login.teacherBadge') : t('login.parentBadge')}
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-[28px] font-bold leading-[1.25] mb-4" style={{ color: '#F4F0F5' }}>
            {isTeacher ? t('login.teacherHeadline') : t('login.parentHeadline')}
          </h1>

          {/* Subtitle */}
          <p className="text-[14px] leading-relaxed" style={{ color: '#928A9C' }}>
            {isTeacher ? t('login.teacherHeroSubtitle') : t('login.parentHeroSubtitle')}
          </p>
        </div>

        {/* Bottom row */}
        <div className="relative z-10 px-10 pb-10 flex items-center gap-3">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.07)' }}
          >
            <Shield className="w-3 h-3 shrink-0" style={{ color: '#928A9C' }} strokeWidth={2} />
            <span className="text-[11px]" style={{ color: '#928A9C' }}>
              {t('login.tlsBadge')}
            </span>
          </div>
          <div className="h-3 w-px shrink-0" style={{ background: '#48404F' }} />
          <span className="text-[11px]" style={{ color: '#928A9C' }}>
            {t('login.copyright')}
          </span>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-paper">
        <div className="w-full max-w-md">

          {/* Welcome heading + subtitle (swaps) */}
          <h2 className="text-[28px] font-bold text-slate-900 mb-1 tracking-tight">
            {t('login.welcome')}
          </h2>
          <p className="text-[14px] text-slate-500 mb-6">
            {isTeacher ? t('login.teacherSubtitle') : t('login.parentSubtitle')}
          </p>

          {/* Role toggle — VISUAL ONLY, does not affect API call or redirect */}
          <div className="mb-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-2">
              {t('login.roleLabel')}
            </p>
            <div className="flex rounded-lg bg-slate-100 p-1 gap-1">
              <button
                type="button"
                onClick={() => setActiveRole('teacher')}
                className={`flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-md text-[13px] font-medium transition-all ${
                  isTeacher
                    ? 'bg-white text-brand-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <GraduationCap className="w-4 h-4 shrink-0" strokeWidth={2} />
                {t('login.teacherTab')}
              </button>
              <button
                type="button"
                onClick={() => setActiveRole('parent')}
                className={`flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-md text-[13px] font-medium transition-all ${
                  !isTeacher
                    ? 'bg-white text-brand-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" strokeWidth={2} />
                {t('login.parentTab')}
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-md bg-error-50 border border-error-200 text-[12.5px] text-error-700">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-[13px] font-medium text-slate-800 mb-1.5">
                {t('login.emailLabel')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder={isTeacher ? t('login.teacherEmailPlaceholder') : t('login.parentEmailPlaceholder')}
                className="w-full h-10 px-3 rounded-md border border-slate-300 bg-surface text-[14px] text-slate-900 focus:outline-none focus:border-brand-600 transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-[13px] font-medium text-slate-800">
                  {t('login.passwordLabel')}
                </label>
                {/* PL-025 (Q15): contact-admin help toggle replaces the dead href="#" link */}
                <button
                  type="button"
                  onClick={() => setForgotHelpOpen((o) => !o)}
                  className="text-[12px] text-brand-700 hover:text-brand-800 font-medium"
                >
                  {t('login.forgotPassword')}
                </button>
              </div>
              {forgotHelpOpen && (
                <p
                  data-testid="forgot-password-help"
                  className="mb-2 px-3 py-2 rounded-md bg-brand-50 border border-brand-200 text-[12.5px] text-slate-700 leading-relaxed"
                >
                  {t('login.forgotPasswordHelp')}
                </p>
              )}
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full h-10 pl-3 pr-10 rounded-md border border-slate-300 bg-surface text-[14px] text-slate-900 focus:outline-none focus:border-brand-600 transition-colors"
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

          {/* Footer: IHMA left · LanguageSwitcher right */}
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
