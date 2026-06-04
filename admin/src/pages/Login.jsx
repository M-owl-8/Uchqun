import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UEmblem } from '../components/identity/UEmblem';
import { LockIcon } from '../components/icons/LockIcon';
import { Field } from '../components/dnp/Field';
import { PrimaryButton } from '../components/dnp/PrimaryButton';
import { Checkbox } from '../components/dnp/Checkbox';
import { InlineLink } from '../components/dnp/InlineLink';
import { SecurePill } from '../components/dnp/SecurePill';
import { LanguageSwitcher } from '@shared/components/LanguageSwitcher';

const STRINGS = {
  uz: {
    wordmark:   'Uchqun',
    tagline:    'Muassasa boshqaruv tizimi',
    roleBadge:  'Direktor',
    eyebrow:    'DIREKTOR PANELI',
    panelTitle: "Muassasalarni yagona boshqaruv markazi",
    panelSub:   "Tizim sozlamalari, foydalanuvchilar va nazorat — bitta xavfsiz hududda.",
    formBadge:  'Direktor',
    heading:    'Direktor',
    formSub:    'Uchqun tizim administratsiyasi',
    email:      'Email manzil',
    emailPh:    'direktor@muassasa.uz',
    password:   'Parol',
    passwordPh: 'Parolingiz',
    forgot:     'Parolni unutdingizmi?',
    forgotHelp: 'Parolni tiklash uchun tizim administratoriga murojaat qiling.',
    remember:   'Bu qurilmani eslab qolish',
    submit:     'Kirish',
    submitting: 'Tekshirilmoqda…',
    security:   'Chegaralangan hudud',
    footer:     "Direktor kirishi · IHMA · O‘zbekiston Respublikasi",
    invalidEmail: "To‘g‘ri elektron pochta manzilini kiriting",
    emptyPass:    'Parolni kiriting',
    rateLimited:  "Juda ko‘p urinish. Iltimos, bir oz kuting.",
    suspended:    "Hisobingiz to‘xtatilgan. Administrator bilan bog‘laning.",
    notApproved:  "Hujjatlaringiz tasdiqlanmagan.",
    loginError:   "Email yoki parol noto‘g‘ri.",
  },
  ru: {
    wordmark:   'Uchqun',
    tagline:    'Система управления учреждением',
    roleBadge:  'Директор',
    eyebrow:    'ПАНЕЛЬ ДИРЕКТОРА',
    panelTitle: 'Единый центр управления учреждениями',
    panelSub:   'Настройки системы, пользователи и контроль — в едином защищённом пространстве.',
    formBadge:  'Директор',
    heading:    'Директор',
    formSub:    'Администрирование системы Uchqun',
    email:      'Электронная почта',
    emailPh:    'direktor@uchqun.uz',
    password:   'Пароль',
    passwordPh: 'Ваш пароль',
    forgot:     'Забыли пароль?',
    forgotHelp: 'Для восстановления пароля обратитесь к администратору системы.',
    remember:   'Запомнить это устройство',
    submit:     'Войти',
    submitting: 'Проверка…',
    security:   'Ограниченная зона',
    footer:     'Вход директора · ИХМА · Республика Узбекистан',
    invalidEmail: 'Введите корректный адрес электронной почты',
    emptyPass:    'Введите пароль',
    rateLimited:  'Слишком много попыток. Пожалуйста, подождите.',
    suspended:    'Ваш аккаунт заблокирован. Обратитесь к администратору.',
    notApproved:  'Ваши документы не подтверждены.',
    loginError:   'Неверный email или пароль.',
  },
  en: {
    wordmark:   'Uchqun',
    tagline:    'Institution management system',
    roleBadge:  'Director',
    eyebrow:    'DIRECTOR PANEL',
    panelTitle: 'Unified institution management center',
    panelSub:   'System settings, users, and oversight — in one secure space.',
    formBadge:  'Director',
    heading:    'Director',
    formSub:    'Uchqun System Administration',
    email:      'Email address',
    emailPh:    'director@institution.uz',
    password:   'Password',
    passwordPh: 'Your password',
    forgot:     'Forgot password?',
    forgotHelp: 'To reset your password, contact the system administrator.',
    remember:   'Remember this device',
    submit:     'Sign in',
    submitting: 'Verifying…',
    security:   'Restricted area',
    footer:     'Director login · IHMA · Republic of Uzbekistan',
    invalidEmail: 'Enter a valid email address',
    emptyPass:    'Enter your password',
    rateLimited:  'Too many attempts. Please wait a moment.',
    suspended:    'Your account has been suspended. Contact the administrator.',
    notApproved:  'Your documents have not been approved.',
    loginError:   'Incorrect email or password.',
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

  const clearEmailErr = () => errors.email && setErrors((p) => ({ ...p, email: null }));
  const clearPassErr  = () => errors.pass  && setErrors((p) => ({ ...p, pass:  null }));

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
      setTimeout(() => navigate(result.mustChangePassword ? '/admin/change-password' : '/admin'), 500);
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
          'py-9 px-7 gap-10',
          'min-[880px]:p-14 min-[880px]:gap-0',
        ].join(' ')}
      >
        {/* Top: Wordmark */}
        <div className="relative flex items-center gap-3">
          <UEmblem size={48} />
          <div>
            <p className="text-[16px] font-bold leading-snug text-panel-ink tracking-tight">
              {t.wordmark}
            </p>
            <p className="text-[13px] leading-snug text-panel-dim mt-0.5">
              {t.tagline}
            </p>
          </div>
        </div>

        {/* Middle: badge + eyebrow + title + subtitle */}
        <div className="relative">
          <span className="inline-flex items-center px-[10px] py-[4px] rounded-full bg-brand-600/20 border border-brand-600/30 text-[11.5px] font-semibold text-brand-300 mb-3 tracking-wide">
            {t.roleBadge}
          </span>
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-panel-dim mb-3">
            {t.eyebrow}
          </p>
          <h1
            className={[
              'font-extrabold leading-[1.05] tracking-[-0.025em] max-w-[14ch]',
              'text-balance text-panel-ink',
              'text-[30px] min-[880px]:text-[clamp(34px,4.2vw,52px)]',
            ].join(' ')}
          >
            {t.panelTitle}
          </h1>
          <p className="mt-3 text-[13.5px] text-panel-dim leading-relaxed max-w-[30ch]">
            {t.panelSub}
          </p>
        </div>

        {/* Bottom: TLS pill + footer */}
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

          {/* Heading area */}
          <header className="mb-7">
            <span className="inline-flex items-center px-[10px] py-[4px] rounded-full bg-brand-50 border border-brand-200 text-[11.5px] font-semibold text-brand-700 mb-3 tracking-wide">
              {t.formBadge}
            </span>
            <h2 className="text-[26px] font-extrabold tracking-[-0.02em] text-ink mb-2">
              {t.heading}
            </h2>
            <p className="text-[14.5px] text-muted leading-relaxed">
              {t.formSub}
            </p>
          </header>

          {/* Form-level error banner */}
          {formError && (
            <div className="mb-5 px-4 py-3 rounded-[9px] bg-red-50 border border-danger/20 text-[13.5px] text-danger leading-relaxed">
              {formError}
            </div>
          )}

          {/* Email */}
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

          {/* Password — custom label row so forgot-link sits right-aligned */}
          <div className="mb-[18px]">
            <div className="flex items-center justify-between mb-[7px]">
              <label htmlFor="password" className="text-[13px] font-semibold text-ink tracking-[0.005em]">
                {t.password}
              </label>
              <InlineLink onClick={() => setHelpOpen((o) => !o)}>
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
              <div className="mt-[9px] px-3 py-2.5 rounded-[9px] bg-brand-50/60 border border-brand-200/60 text-[13.5px] text-ink/80 leading-relaxed">
                {t.forgotHelp}
              </div>
            )}
          </div>

          {/* Remember me */}
          <div className="mb-5">
            <Checkbox id="remember" checked={remember} onChange={(e) => setRemember(e.target.checked)}>
              {t.remember}
            </Checkbox>
          </div>

          {/* Submit */}
          <PrimaryButton onClick={submit} loading={loading} done={done} loadingLabel={t.submitting}>
            {t.submit}
          </PrimaryButton>

          {/* Security notice */}
          <div className="mt-4 flex items-center justify-center gap-1.5 text-[12.5px] text-faint">
            <LockIcon size={13} />
            <span>{t.security}</span>
          </div>

          {/* Footer: copyright + language dropdown */}
          <footer className="mt-5 pt-5 border-t border-border flex items-center justify-between flex-wrap gap-3">
            <span className="text-[12px] text-faint">{t.footer}</span>
            <LanguageSwitcher variant="auth" onChange={setLang} />
          </footer>

        </div>
      </main>
    </div>
  );
};

export default Login;
