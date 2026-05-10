import { useState } from 'react';
import { Crown, Mail, Lock, Plus, User, Eye, EyeOff, X } from 'lucide-react';
import Card from '../Card';
import { useTranslation } from 'react-i18next';

const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function AdminsTab({
  admins, loadingAdmins,
  loading,
  onSubmit,
  editingAdmin, editFirstName, editLastName, editEmail, editPhone, editPassword, editSaving,
  setEditFirstName, setEditLastName, setEditEmail, setEditPhone, setEditPassword,
  onStartEdit, onUpdateAdmin, onDeleteAdmin, onCloseEdit,
  showPasswords, setShowPasswords,
}) {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [strengthError, setStrengthError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!PASSWORD_RE.test(password)) {
      setStrengthError(t('government.validation.passwordStrength', { defaultValue: 'Password must be at least 8 chars with uppercase, lowercase, and number' }));
      return;
    }
    if (password !== confirm) {
      setStrengthError(t('government.validation.passwordMismatch', { defaultValue: 'Passwords do not match' }));
      return;
    }
    setStrengthError('');
    onSubmit({ firstName, lastName, email, password }, () => {
      setFirstName(''); setLastName(''); setEmail(''); setPassword(''); setConfirm('');
    });
  };

  return (
    <>
      <div className="text-center">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
          {t('government.createTitle')}
        </h2>
        <p className="text-gray-600 font-medium">{t('government.createSubtitle')}</p>
      </div>

      <Card className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                {t('government.form.firstName')}
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t('government.form.firstName')}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                {t('government.form.lastName')}
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t('government.form.lastName')}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              {t('government.form.email')}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4 text-gray-400" />
              {t('government.form.password')}
            </label>
            <div className="relative">
              <input
                type={showCreate ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => { setPassword(e.target.value); setStrengthError(''); }}
                placeholder={t('government.form.password')}
                className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={loading}
              />
              <button type="button" onClick={() => setShowCreate(!showCreate)} className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                {showCreate ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {t('government.validation.passwordStrengthHint', { defaultValue: 'Min 8 chars, uppercase, lowercase, number' })}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4 text-gray-400" />
              {t('government.form.confirmPassword', { defaultValue: 'Confirm Password' })}
            </label>
            <input
              type={showCreate ? 'text' : 'password'}
              required
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setStrengthError(''); }}
              placeholder={t('government.form.confirmPassword', { defaultValue: 'Confirm Password' })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={loading}
            />
            {strengthError && <p className="mt-1 text-xs text-red-600">{strengthError}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Plus className="w-5 h-5" />
                <span>{t('government.form.create')}</span>
              </>
            )}
          </button>
        </form>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">{t('government.listTitle')}</h3>
          {loadingAdmins && <div className="text-sm text-gray-500">{t('government.status.loadingAdmins')}</div>}
        </div>
        {loadingAdmins ? (
          <div className="flex items-center justify-center min-h-[120px]">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : admins.length === 0 ? (
          <p className="text-sm text-gray-600">{t('government.noAdmins', { defaultValue: 'Adminlar topilmadi' })}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {admins.map((adm) => (
              <div key={adm.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center">
                    {adm.firstName?.charAt(0)}{adm.lastName?.charAt(0)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-semibold text-gray-900">{adm.firstName} {adm.lastName}</p>
                    <p className="text-sm text-gray-600">{adm.email}</p>
                    <p className="text-xs text-gray-500">{adm.createdAt ? new Date(adm.createdAt).toLocaleDateString() : '—'}</p>
                    {adm.phone && <p className="text-xs text-gray-500">{adm.phone}</p>}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => onStartEdit(adm)} className="px-3 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors">
                    {t('government.form.update')}
                  </button>
                  <button onClick={() => onDeleteAdmin(adm.id)} className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                    {t('government.delete', { defaultValue: "O'chirish" })}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{t('government.editTitle')}</h3>
                <p className="text-sm text-gray-500">{editingAdmin.email}</p>
              </div>
              <button onClick={onCloseEdit} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={onUpdateAdmin} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('government.form.firstName')}</label>
                  <input type="text" required value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('government.form.lastName')}</label>
                  <input type="text" required value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('government.form.email')}</label>
                <input type="email" required value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('government.form.phone')}</label>
                <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('government.form.password')}</label>
                <div className="relative">
                  <input
                    type={showPasswords.edit ? 'text' : 'password'}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder={t('government.form.passwordChange', { defaultValue: "Parolni o'zgartirish uchun kiriting" })}
                    className="w-full px-4 py-2.5 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <button type="button" onClick={() => setShowPasswords({ ...showPasswords, edit: !showPasswords.edit })} className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                    {showPasswords.edit ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onCloseEdit} disabled={editSaving} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">
                  {t('government.form.cancel')}
                </button>
                <button type="submit" disabled={editSaving} className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50">
                  {editSaving ? t('government.status.loadingAdmins') : t('government.form.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
