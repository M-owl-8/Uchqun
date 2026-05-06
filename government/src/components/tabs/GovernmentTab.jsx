import { Mail, Lock, Plus, User, Eye, EyeOff, X } from 'lucide-react';
import Card from '../Card';
import { useTranslation } from 'react-i18next';

export default function GovernmentTab({
  governments, loadingGovernments, govLoading,
  govFirstName, govLastName, govEmail, govPassword,
  setGovFirstName, setGovLastName, setGovEmail, setGovPassword,
  onCreateGovernment,
  editingGovernment, editGovFirstName, editGovLastName, editGovEmail, editGovPassword, editGovSaving,
  setEditGovFirstName, setEditGovLastName, setEditGovEmail, setEditGovPassword,
  onStartEditGovernment, onUpdateGovernment, onDeleteGovernment, onCloseEditGov,
  showPasswords, setShowPasswords,
}) {
  const { t } = useTranslation();
  return (
    <>
      <div className="text-center">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
          {t('superAdmin.createGovernmentTitle', { defaultValue: 'Davlat Foydalanuvchisini Yaratish' })}
        </h2>
        <p className="text-gray-600 font-medium">{t('superAdmin.createGovernmentSubtitle', { defaultValue: 'Government panel uchun yangi foydalanuvchi yarating' })}</p>
      </div>

      <Card className="p-8">
        <form onSubmit={onCreateGovernment} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                {t('superAdmin.form.firstName')}
              </label>
              <input type="text" required value={govFirstName} onChange={(e) => setGovFirstName(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder={t('superAdmin.form.firstName')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                {t('superAdmin.form.lastName')}
              </label>
              <input type="text" required value={govLastName} onChange={(e) => setGovLastName(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder={t('superAdmin.form.lastName')} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              {t('superAdmin.form.email')}
            </label>
            <input type="email" required value={govEmail} onChange={(e) => setGovEmail(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="email@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4 text-gray-400" />
              {t('superAdmin.form.password')}
            </label>
            <input type="password" required value={govPassword} onChange={(e) => setGovPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="••••••••" minLength={8} />
            <p className="mt-1 text-xs text-gray-500">{t('superAdmin.form.passwordMinLength', { defaultValue: "Parol kamida 8 belgidan iborat bo'lishi kerak" })}</p>
          </div>
          <button type="submit" disabled={govLoading} className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {govLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Plus className="w-5 h-5" /><span>{t('superAdmin.createGovernment', { defaultValue: 'Government Foydalanuvchisini Yaratish' })}</span></>}
          </button>
        </form>
      </Card>

      <div className="mt-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          {t('superAdmin.governmentList', { defaultValue: "Qo'shilgan Government Foydalanuvchilar" })} ({governments.length})
        </h3>
        {loadingGovernments ? (
          <Card className="p-8"><div className="flex items-center justify-center min-h-[120px]"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div></Card>
        ) : governments.length === 0 ? (
          <Card className="p-8"><p className="text-sm text-gray-600 text-center py-8">{t('superAdmin.noGovernments', { defaultValue: "Hozircha government foydalanuvchilar yo'q" })}</p></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {governments.map((gov) => (
              <div key={gov.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center flex-shrink-0">
                    {gov.firstName?.charAt(0)}{gov.lastName?.charAt(0)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-semibold text-gray-900">{gov.firstName} {gov.lastName}</p>
                    <p className="text-sm text-gray-600">{gov.email}</p>
                    <p className="text-xs text-gray-500">{gov.createdAt ? new Date(gov.createdAt).toLocaleDateString() : '—'}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${gov.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {gov.isActive ? t('superAdmin.active', { defaultValue: 'Faol' }) : t('superAdmin.inactive', { defaultValue: 'Nofaol' })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => onStartEditGovernment(gov)} className="px-3 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors">{t('superAdmin.form.update')}</button>
                  <button onClick={() => onDeleteGovernment(gov.id)} className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">{t('superAdmin.delete', { defaultValue: "O'chirish" })}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingGovernment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{t('superAdmin.editTitle')}</h3>
                <p className="text-sm text-gray-500">{editingGovernment.email}</p>
              </div>
              <button onClick={onCloseEditGov} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={onUpdateGovernment} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('superAdmin.form.firstName')}</label>
                  <input type="text" required value={editGovFirstName} onChange={(e) => setEditGovFirstName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('superAdmin.form.lastName')}</label>
                  <input type="text" required value={editGovLastName} onChange={(e) => setEditGovLastName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('superAdmin.form.email')}</label>
                <input type="email" required value={editGovEmail} onChange={(e) => setEditGovEmail(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('superAdmin.form.newPassword', { defaultValue: 'Yangi parol (ixtiyoriy)' })}</label>
                <div className="relative">
                  <input type={showPasswords.edit ? 'text' : 'password'} value={editGovPassword} onChange={(e) => setEditGovPassword(e.target.value)} placeholder={t('superAdmin.form.passwordOptional', { defaultValue: "Parolni o'zgartirmasangiz bo'sh qoldiring" })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-10" />
                  <button type="button" onClick={() => setShowPasswords({ ...showPasswords, edit: !showPasswords.edit })} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                    {showPasswords.edit ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={onCloseEditGov} disabled={editGovSaving} className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors">{t('superAdmin.form.cancel')}</button>
                <button type="submit" disabled={editGovSaving} className="flex-1 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {editGovSaving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span>{t('superAdmin.form.save')}</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
