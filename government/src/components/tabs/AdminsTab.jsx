import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import Input from '@shared/components/Input';
import Modal from '@shared/components/Modal';
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
            <Input
              label={t('government.form.firstName')}
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={t('government.form.firstName')}
              disabled={loading}
            />
            <Input
              label={t('government.form.lastName')}
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={t('government.form.lastName')}
              disabled={loading}
            />
          </div>

          <Input
            label={t('government.form.email')}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            disabled={loading}
          />

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
                className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent"
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
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              disabled={loading}
            />
            {strengthError && <p className="mt-1 text-xs text-red-600">{strengthError}</p>}
          </div>

          <Button type="submit" variant="primary" loading={loading} className="w-full">
            {t('government.form.create')}
          </Button>
        </form>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">{t('government.listTitle')}</h3>
          {loadingAdmins && <div className="text-sm text-gray-500">{t('government.status.loadingAdmins')}</div>}
        </div>
        {loadingAdmins ? (
          <div className="flex items-center justify-center min-h-[120px]">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : admins.length === 0 ? (
          <p className="text-sm text-gray-600">{t('government.noAdmins', { defaultValue: 'Adminlar topilmadi' })}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {admins.map((adm) => (
              <div key={adm.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center">
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
                  <Button variant="secondary" size="sm" onClick={() => onStartEdit(adm)}>
                    {t('government.form.update')}
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => onDeleteAdmin(adm.id)}>
                    {t('government.delete', { defaultValue: "O'chirish" })}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        isOpen={!!editingAdmin}
        onClose={onCloseEdit}
        title={editingAdmin ? `${t('government.editTitle')} — ${editingAdmin.email}` : ''}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={onCloseEdit} disabled={editSaving}>
              {t('government.form.cancel')}
            </Button>
            <Button type="submit" form="edit-admin-form" variant="primary" className="flex-1" loading={editSaving}>
              {t('government.form.save')}
            </Button>
          </div>
        }
      >
        <form id="edit-admin-form" onSubmit={onUpdateAdmin} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('government.form.firstName')}
              required
              value={editFirstName}
              onChange={(e) => setEditFirstName(e.target.value)}
            />
            <Input
              label={t('government.form.lastName')}
              required
              value={editLastName}
              onChange={(e) => setEditLastName(e.target.value)}
            />
          </div>
          <Input
            label={t('government.form.email')}
            type="email"
            required
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
          />
          <Input
            label={t('government.form.phone')}
            type="tel"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('government.form.password')}</label>
            <div className="relative">
              <input
                type={showPasswords.edit ? 'text' : 'password'}
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder={t('government.form.passwordChange', { defaultValue: "Parolni o'zgartirish uchun kiriting" })}
                className="w-full px-4 py-2.5 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <button type="button" onClick={() => setShowPasswords({ ...showPasswords, edit: !showPasswords.edit })} className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                {showPasswords.edit ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}
