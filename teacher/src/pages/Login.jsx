import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../shared/context/AuthContext';
import LoadingSpinner from '../shared/components/LoadingSpinner';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';

const LANG_OPTIONS = ['UZ', 'RU', 'EN'];

const Login = () => {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [activeLang, setActiveLang]     = useState('UZ');

  const { login } = useAuth();
  const navigate  = useNavigate();
  const { t, i18n } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      const user = result.user || JSON.parse(localStorage.getItem('user') || '{}');

      if (user.role === 'teacher') {
        navigate('/teacher');
      } else if (user.role === 'parent') {
        navigate('/');
      } else {
        localStorage.removeItem('user');
        setError(
          t('login.invalidRole', {
            defaultValue: "Faqat o'qituvchi va ota-ona kirishi mumkin.",
          })
        );
      }
    } else {
      if (result.status === 429) setError(t('login.accountLocked'));
      else if (result.status === 403) setError(t('login.notApproved'));
      else setError(t('login.invalid'));
    }

    setLoading(false);
  };

  const handleLangChange = (lang) => {
    setActiveLang(lang);
    i18n.changeLanguage(lang.toLowerCase());
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 relative"
      style={{
        background:
          'radial-gradient(700px 500px at 88% 0%, rgba(122,111,168,.12), transparent 60%),' +
          'radial-gradient(500px 400px at 0% 100%, rgba(122,111,168,.06), transparent 60%),' +
          '#FAFAF8',
      }}
    >
      {/* Login card */}
      <div
        className="w-full rounded-lg bg-surface border border-slate-200 shadow-md p-8"
        style={{ maxWidth: 440 }}
      >
        {/* Wordmark */}
        <div className="flex flex-col items-center text-center">
          <span
            className="inline-grid place-items-center w-12 h-12 rounded-lg font-semibold text-[20px]"
            style={{ background: '#2A2530', color: '#D8CFE5' }}
          >
            U
          </span>
          <div className="mt-3 text-[20px] font-semibold text-slate-900 leading-none">
            Uchqun
          </div>
          <div className="mt-1 text-[12px] text-slate-500">O'qituvchi portali</div>
        </div>

        {/* Heading */}
        <div className="mt-7 text-center">
          <h1 className="text-[28px] font-semibold leading-tight text-slate-900">Xush kelibsiz</h1>
          <p className="mt-1.5 text-[14px] text-slate-600">
            Bugungi kun bilan tanishishni boshlang.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-md text-[13px]">
              {error}
            </div>
          )}

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-[12px] font-medium text-slate-700 mb-1.5"
            >
              Elektron pochta
            </label>
            <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-surface px-3 h-[44px] focus-within:border-brand-600 transition-colors">
              <Mail className="w-[18px] h-[18px] text-slate-400 shrink-0" strokeWidth={1.75} />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="ism@maktab.uz"
                className="flex-1 outline-none text-[15px] placeholder:text-slate-400 bg-transparent"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="block text-[12px] font-medium text-slate-700"
              >
                Parol
              </label>
              <a
                href="#"
                className="text-[12px] text-brand-700 hover:text-brand-800 font-medium"
              >
                Parolni unutdingizmi?
              </a>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-surface px-3 h-[44px] focus-within:border-brand-600 transition-colors">
              <Lock className="w-[18px] h-[18px] text-slate-400 shrink-0" strokeWidth={1.75} />
              {/* Fix B: empty at rest — no value="••••••••••" */}
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="flex-1 outline-none text-[15px] bg-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                className="w-7 h-7 grid place-items-center rounded-md hover:bg-slate-50"
              >
                {showPassword
                  ? <EyeOff className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
                  : <Eye    className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
                }
              </button>
            </div>
          </div>

          {/* Submit — 44px, full width */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-md bg-brand-600 hover:bg-brand-700 text-surface text-[15px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" />
                Kirilmoqda...
              </>
            ) : (
              'Kirish'
            )}
          </button>
          {/* Fix C: ToS consent line intentionally omitted */}
        </form>
      </div>

      {/* Footer — Fix A: plain "IHMA" text, no Cloudflare email protection */}
      <div className="mt-8 flex flex-col items-center gap-3">
        <span className="font-mono text-[11px] tracking-[.18em] text-slate-400">IHMA</span>

        {/* Language pill */}
        <div
          className="flex items-center gap-1 p-0.5 rounded-full"
          style={{ background: '#EDEFF2' }}
        >
          {LANG_OPTIONS.map((lang) => (
            <button
              key={lang}
              onClick={() => handleLangChange(lang)}
              aria-current={activeLang === lang ? 'true' : undefined}
              className="px-3 py-1 text-[11px] font-medium rounded-full transition-colors"
              style={
                activeLang === lang
                  ? { background: '#FFFFFE', color: '#2A2530', boxShadow: '0 1px 2px rgba(30,32,38,.06)' }
                  : { color: '#525868' }
              }
            >
              {lang}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Login;
