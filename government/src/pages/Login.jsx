import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import ihmaLogo from '@shared/assets/ihma-logo.png';
import LoadingSpinner from '@shared/components/LoadingSpinner';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      navigate('/government');
    } else {
      if (result.status === 429) setError(t('login.accountLocked'));
      else if (result.status === 403) setError(t('login.notApproved'));
      else setError(t('login.error'));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* 4px brand-green top rule */}
      <div className="h-1 bg-brand-600 w-full flex-shrink-0" />

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px]">
          {/* Card */}
          <div className="bg-paper-card border border-gray-200 rounded-lg p-8">
            {/* Logo + heading */}
            <div className="text-center mb-8">
              <img
                src={ihmaLogo}
                alt="IHMA"
                className="h-14 w-14 mx-auto mb-4"
              />
              <h1 className="text-xl font-semibold text-inkGreen-900 mb-1">
                {t('login.title', { defaultValue: 'Davlat Nazorat Paneli' })}
              </h1>
              <p className="text-sm text-gray-500">
                {t('login.subtitle', { defaultValue: 'IHMA · Uchqun platformasi' })}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('login.email', { defaultValue: 'Email' })}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
                  placeholder="email@example.com"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('login.password', { defaultValue: 'Parol' })}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Parolni yashirish' : "Parolni ko'rsatish"}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-600 text-white py-2.5 rounded-md text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <LoadingSpinner size="sm" className="text-white" />
                ) : (
                  t('login.button', { defaultValue: 'Kirish' })
                )}
              </button>

              {/* Audit microcopy */}
              <p className="text-center text-xs text-gray-400">
                {t('login.auditTrail', { defaultValue: 'Tizimga kirish urinishlari qayd etiladi' })}
              </p>
            </form>
          </div>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              © 2026 IHMA · O'zbekiston Respublikasi
            </p>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
