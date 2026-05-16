import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      navigate('/admin');
    } else {
      if (result.status === 429) setError(t('login.accountLocked'));
      else if (result.status === 403) setError(t('login.notApproved'));
      else setError(t('login.errorInvalid'));
    }

    setLoading(false);
  };

  const currentLang = i18n.language?.split('-')[0] || 'uz';

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4 py-12">
      <div
        className="absolute inset-x-0 top-0 h-32 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at top, rgba(168,92,64,0.06), transparent 60%)' }}
      />

      <div className="w-full max-w-[420px] relative">
        {/* 2px terracotta hairline */}
        <div className="absolute top-0 left-6 right-6 h-0.5 bg-brand-600 rounded-full" />

        <div className="bg-surface border border-warm-200 rounded-lg shadow-sm pt-8 px-8 pb-7">
          {/* Wordmark */}
          <div className="flex items-center gap-2.5 mb-1">
            <span
              className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-walnut text-walnut-text font-semibold text-lg"
              style={{ letterSpacing: '-0.06em' }}
            >
              U
            </span>
            <div>
              <p className="text-lg font-semibold tracking-tight text-warm-900" style={{ lineHeight: 1.1 }}>
                Uchqun
              </p>
              <p className="text-xs text-warm-500">{t('login.tagline', { defaultValue: 'Maktab boshqaruv tizimi' })}</p>
            </div>
          </div>

          <div className="h-px bg-warm-100 my-5" />

          <h3 className="text-xl font-semibold text-warm-900">{t('login.title', { defaultValue: 'Kirish' })}</h3>
          <p className="text-sm text-warm-500 mt-1">{t('login.subtitle', { defaultValue: 'Maktab rahbari sifatida tizimga kiring.' })}</p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {error && (
              <div className="bg-error-50 border border-error-100 text-error-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-warm-800 mb-1.5">
                {t('login.email', { defaultValue: 'Email manzil' })}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-10 px-3.5 text-sm bg-surface border border-warm-300 rounded-md text-warm-900 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600"
                placeholder={t('login.placeholderEmail', { defaultValue: 'rahbar@maktab.uz' })}
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-warm-800">
                  {t('login.password', { defaultValue: 'Parol' })}
                </label>
                <span className="text-xs text-brand-700 hover:underline cursor-pointer">
                  {t('login.forgotPassword', { defaultValue: 'Parolni unutdingizmi?' })}
                </span>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-10 pl-3.5 pr-10 text-sm bg-surface border border-warm-300 rounded-md text-warm-900 focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600"
                  placeholder={t('login.placeholderPassword', { defaultValue: '••••••••' })}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t('login.hidePassword', { defaultValue: 'Parolni yashirish' }) : t('login.showPassword', { defaultValue: 'Parolni ko\'rsatish' })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-warm-500 hover:text-warm-800 p-1.5"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.75} /> : <Eye className="w-4 h-4" strokeWidth={1.75} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center h-11 px-4 text-base font-medium bg-brand-600 hover:bg-brand-700 text-walnut-text rounded-md shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                t('login.button', { defaultValue: 'Kirish' })
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-warm-100 flex items-end justify-between gap-3">
            <div className="text-[11px] text-warm-500 leading-tight">
              <p>{t('login.blockTitle', { defaultValue: 'Davlat tomonidan vakolatlangan tizim' })}</p>
              <p className="mt-0.5">IHMA · O&apos;zbekiston Respublikasi</p>
            </div>
            <div className="grid grid-cols-3 gap-1 bg-warm-100 rounded-md p-0.5 text-xs">
              {['uz', 'ru', 'en'].map((lng) => (
                <button
                  key={lng}
                  onClick={() => i18n.changeLanguage(lng)}
                  className={`px-2 py-1 rounded-sm font-medium transition-colors ${
                    currentLang === lng ? 'bg-surface text-warm-900 shadow-xs' : 'text-warm-500 hover:text-warm-800'
                  }`}
                >
                  {lng === 'uz' ? 'UZ' : lng === 'ru' ? 'РУ' : 'EN'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-warm-500 mt-5 num">© 2026 Uchqun · v1.0 · admin-portal</p>
      </div>
    </div>
  );
};

export default Login;
