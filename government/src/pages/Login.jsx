import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AGENCY_CONFIG } from '../config/agency.js';
import { Emblem } from '../components/identity/Emblem';
import { GuillochePattern } from '../components/identity/GuillochePattern';
import { LockIcon } from '../components/icons/LockIcon';
import { Field } from '../components/dnp/Field';
import { PrimaryButton } from '../components/dnp/PrimaryButton';
import { Checkbox } from '../components/dnp/Checkbox';
import { InlineLink } from '../components/dnp/InlineLink';
import { SecurePill } from '../components/dnp/SecurePill';
import { LangToggle } from '../components/dnp/LangToggle';

const STRINGS = {
  uz: {
    nation:      AGENCY_CONFIG.nation_uz,
    org:         AGENCY_CONFIG.name_uz,
    title:       AGENCY_CONFIG.portalTitle_uz,
    panelTag:    AGENCY_CONFIG.panelTag_uz,
    heading:     'Tizimga kirish',
    sub:         'Davom etish uchun hisobingizga kiring',
    email:       'Elektron pochta',
    emailPh:     'ism@idora.uz',
    password:    'Parol',
    passwordPh:  'Parolingiz',
    forgot:      "Parolni unutdingizmi?",
    forgotHelp:  "Parolni tiklash uchun tizim administratoriga murojaat qiling.",
    remember:    'Bu qurilmani eslab qolish',
    submit:      'Kirish',
    submitting:  'Tekshirilmoqda…',
    security:    'Tizimga kirish urinishlari qayd etiladi',
    invalidEmail: "Toʻgʻri elektron pochta manzilini kiriting",
    emptyPass:   'Parolni kiriting',
    rateLimited:  "Juda koʻp urinish. Iltimos, bir oz kuting.",
    suspended:    "Hisobingiz toʻxtatilgan. Administrator bilan bogʻlaning.",
    notApproved:  "Hujjatlaringiz tasdiqlanmagan.",
    loginError:   "Email yoki parol notoʻgʻri.",
    footer:      AGENCY_CONFIG.footer_uz,
  },
  ru: {
    nation:      AGENCY_CONFIG.nation_ru,
    org:         AGENCY_CONFIG.name_ru,
    title:       AGENCY_CONFIG.portalTitle_ru,
    panelTag:    AGENCY_CONFIG.panelTag_ru,
    heading:     'Вход в систему',
    sub:         'Войдите в учётную запись, чтобы продолжить',
    email:       'Электронная почта',
    emailPh:     'imya@vedomstvo.uz',
    password:    'Пароль',
    passwordPh:  'Ваш пароль',
    forgot:      'Забыли пароль?',
    forgotHelp:  'Для восстановления пароля обратитесь к администратору системы.',
    remember:    'Запомнить это устройство',
    submit:      'Войти',
    submitting:  'Проверка…',
    security:    'Попытки входа в систему регистрируются',
    invalidEmail: 'Введите корректный адрес электронной почты',
    emptyPass:   'Введите пароль',
    rateLimited:  'Слишком много попыток. Пожалуйста, подождите.',
    suspended:    'Ваш аккаунт заблокирован. Обратитесь к администратору.',
    notApproved:  'Ваши документы не подтверждены.',
    loginError:   'Неверный email или пароль.',
    footer:      AGENCY_CONFIG.footer_ru,
  },
  en: {
    nation:      'Republic of Uzbekistan',
    org:         'National Agency for Social Protection',
    title:       'State Control Panel',
    panelTag:    'Unified Information System',
    heading:     'Sign in',
    sub:         'Sign in to your account to continue',
    email:       'Email address',
    emailPh:     'name@agency.uz',
    password:    'Password',
    passwordPh:  'Your password',
    forgot:      'Forgot password?',
    forgotHelp:  'To reset your password, please contact the system administrator.',
    remember:    'Remember this device',
    submit:      'Sign in',
    submitting:  'Verifying…',
    security:    'Login attempts are logged',
    invalidEmail: 'Enter a valid email address',
    emptyPass:   'Enter your password',
    rateLimited:  'Too many attempts. Please wait a moment.',
    suspended:    'Your account has been suspended. Contact the administrator.',
    notApproved:  'Your documents have not been approved.',
    loginError:   'Incorrect email or password.',
    footer:      `© 2026 ${AGENCY_CONFIG.acronym} · Republic of Uzbekistan`,
  },
};

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem('dnp:lang');
    return saved === 'ru' || saved === 'en' ? saved : 'uz';
  });
  const t = STRINGS[lang];

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [remember, setRemember]   = useState(true);
  const [errors, setErrors]       = useState({});
  const [formError, setFormError] = useState('');
  const [helpOpen, setHelpOpen]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);

  const clearEmailErr = () => errors.email && setErrors(p => ({ ...p, email: null }));
  const clearPassErr  = () => errors.pass  && setErrors(p => ({ ...p, pass:  null }));

  const submit = async () => {
    if (loading || done) return;
    setFormError('');
    const e = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = t.invalidEmail;
    if (!password) e.pass = t.emptyPass;
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      setDone(true);
      setTimeout(() => navigate('/government'), 500);
    } else {
      const errorCode = typeof result.error === 'object' ? result.error?.code : result.error;
      if (result.status === 429) setFormError(t.rateLimited);
      else if (errorCode === 'ACCOUNT_NOT_ACTIVE') setFormError(t.suspended);
      else if (result.status === 403) setFormError(t.notApproved);
      else setFormError(t.loginError);
    }
  };

  return (
    <div className="min-h-screen min-[880px]:grid min-[880px]:grid-cols-[minmax(420px,1.05fr)_minmax(440px,1fr)]">

      {/* ── Identity panel ─────────────────────────────────────────────── */}
      <aside
        className={[
          'relative overflow-hidden flex flex-col justify-between',
          'bg-gradient-to-b from-panel-top to-panel-bottom text-panel-ink',
          /* mobile: auto-height, relaxed padding, visible gaps */
          'py-9 px-7 gap-10',
          /* desktop: full-height, generous padding, space-between handles gap */
          'min-[880px]:p-14 min-[880px]:gap-0',
        ].join(' ')}
      >
        {/* Guilloché backdrop — barely visible */}
        <div className="absolute inset-0 text-white/[.06] pointer-events-none select-none">
          <GuillochePattern />
        </div>

        {/* Large emblem watermark — desktop only, bottom-right */}
        <div
          className="hidden min-[880px]:block absolute -bottom-24 -right-24 pointer-events-none select-none"
          style={{ color: 'rgba(255,255,255,0.045)' }}
        >
          <Emblem size={520} stroke={0.6} />
        </div>

        {/* Top: glass crest tile + agency identity */}
        <div className="relative flex items-center gap-4">
          <div className="flex-shrink-0 w-[68px] h-[68px] rounded-2xl flex items-center justify-center bg-white/[.08] border border-white/[.14]">
            <Emblem size={52} />
          </div>
          <div>
            <div className="text-[15px] font-medium leading-snug text-panel-ink">
              {t.nation}
            </div>
            <div className="text-[13px] leading-snug text-panel-dim mt-0.5">
              {t.org}
            </div>
          </div>
        </div>

        {/* Middle: eyebrow + portal title */}
        <div className="relative">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-panel-dim mb-3">
            {t.panelTag}
          </p>
          <h1
            className={[
              'font-extrabold leading-[1.05] tracking-[-0.025em] max-w-[14ch]',
              'text-balance text-panel-ink',
              /* mobile: fixed 30px; desktop: fluid clamp */
              'text-[30px] min-[880px]:text-[clamp(34px,4.2vw,52px)]',
            ].join(' ')}
          >
            {t.title}
          </h1>
        </div>

        {/* Bottom: TLS pill + copyright */}
        <div className="relative flex flex-wrap items-center gap-3 text-[12.5px] text-panel-dim">
          <SecurePill />
          <span className="w-px h-3 bg-white/25 flex-shrink-0" aria-hidden="true" />
          <span>{t.footer}</span>
        </div>
      </aside>

      {/* ── Form panel ─────────────────────────────────────────────────── */}
      <main
        className={[
          'flex items-center justify-center bg-bg',
          'px-[22px] pt-8 pb-12',
          'min-[880px]:px-12 min-[880px]:py-0',
        ].join(' ')}
      >
        <div className="w-full max-w-[392px] min-[880px]:py-12">

          {/* Heading */}
          <header className="mb-7">
            <h2 className="text-[26px] font-extrabold tracking-[-0.02em] text-ink mb-2">
              {t.heading}
            </h2>
            <p className="text-[14.5px] text-muted leading-relaxed">
              {t.sub}
            </p>
          </header>

          {/* Form-level error banner */}
          {formError && (
            <div className="mb-5 px-4 py-3 rounded-[9px] bg-red-50 border border-danger/20 text-[13.5px] text-danger leading-relaxed">
              {formError}
            </div>
          )}

          {/* Email field */}
          <div className="mb-[18px]">
            <Field
              id="email"
              label={t.email}
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearEmailErr(); }}
              placeholder={t.emailPh}
              error={errors.email}
              autoFocus
              autoComplete="username"
              onKeyDown={(e) => e.key === 'Enter' && document.getElementById('password')?.focus()}
            />
          </div>

          {/* Password field — custom label row so forgot-link sits right-aligned */}
          <div className="mb-[18px]">
            <div className="flex items-center justify-between mb-[7px]">
              <label
                htmlFor="password"
                className="text-[13px] font-semibold text-ink tracking-[0.005em]"
              >
                {t.password}
              </label>
              <InlineLink onClick={() => setHelpOpen(o => !o)}>
                {t.forgot}
              </InlineLink>
            </div>

            <Field
              id="password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearPassErr(); }}
              placeholder={t.passwordPh}
              error={errors.pass}
              autoComplete="current-password"
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />

            {helpOpen && (
              <div className="mt-[9px] px-3 py-2.5 rounded-[9px] bg-green/[.06] border border-green/[.16] text-[13.5px] text-ink/80 leading-relaxed">
                {t.forgotHelp}
              </div>
            )}
          </div>

          {/* Remember me */}
          <div className="mb-5">
            <Checkbox
              id="remember"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            >
              {t.remember}
            </Checkbox>
          </div>

          {/* Submit */}
          <PrimaryButton
            onClick={submit}
            loading={loading}
            done={done}
            loadingLabel={t.submitting}
          >
            {t.submit}
          </PrimaryButton>

          {/* Security notice */}
          <div className="mt-4 flex items-center justify-center gap-1.5 text-[12.5px] text-faint">
            <LockIcon size={13} />
            <span>{t.security}</span>
          </div>

          {/* Footer: copyright + language toggle */}
          <footer className="mt-5 pt-5 border-t border-border flex items-center justify-between flex-wrap gap-3">
            <span className="text-[12px] text-faint">{t.footer}</span>
            <LangToggle lang={lang} setLang={setLang} />
          </footer>

        </div>
      </main>
    </div>
  );
};

export default Login;
