import { Check, X, Mail, Phone, MessageSquare, FileText, Link } from 'lucide-react';
import Card from '../Card';
import { useTranslation } from 'react-i18next';

export default function RegistrationsTab({
  registrationRequests, loadingRegistrations,
  approvingRequest, rejectingRequest,
  selectedRequest, rejectionReason,
  approvedCredentials,
  onApprove, onSelectRequest, onReject, onCloseRequest, onCloseCredentials,
  setRejectionReason,
  success,
}) {
  const { t } = useTranslation();
  return (
    <>
      <div className="text-center">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
          {t('superAdmin.registrationsTitle', { defaultValue: "Admin Ro'yxatdan O'tish So'rovlari" })}
        </h2>
        <p className="text-gray-600 font-medium">{t('superAdmin.registrationsSubtitle', { defaultValue: "Yangi admin so'rovlarini ko'rib chiqing va tasdiqlang" })}</p>
      </div>

      <Card className="p-6 space-y-4">
        {loadingRegistrations ? (
          <div className="flex items-center justify-center min-h-[120px]"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : registrationRequests.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-8">{t('superAdmin.noRegistrations', { defaultValue: "Hozircha so'rovlar yo'q" })}</p>
        ) : (
          <div className="space-y-4">
            {registrationRequests.map((request) => (
              <div key={request.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{request.firstName} {request.lastName}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <span className="flex items-center gap-1"><Mail className="w-4 h-4" />{request.email}</span>
                        {request.phone && <span className="flex items-center gap-1"><Phone className="w-4 h-4" />{request.phone}</span>}
                        <span className="flex items-center gap-1"><MessageSquare className="w-4 h-4" />{request.telegramUsername ? `@${request.telegramUsername}` : 'Telegram username kiritilmagan'}</span>
                      </div>
                    </div>
                    {(request.passportNumber || request.location) && (
                      <div className="text-sm text-gray-600 space-y-1">
                        {request.passportNumber && <p>Passport: {request.passportNumber} {request.passportSeries && `(${request.passportSeries})`}</p>}
                        {request.location && <p>Manzil: {request.location}</p>}
                        {request.region && <p>Viloyat: {request.region}</p>}
                        {request.city && <p>Shahar: {request.city}</p>}
                      </div>
                    )}
                    <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
                      {request.certificateFile && <a href={request.certificateFile} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"><FileText className="w-4 h-4" />Guvohnoma</a>}
                      {request.passportFile && <a href={request.passportFile} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"><FileText className="w-4 h-4" />Passport/ID</a>}
                    </div>
                    <p className="text-xs text-gray-500">{"So'rov yuborilgan:"} {new Date(request.createdAt).toLocaleString('uz-UZ')}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => onApprove(request.id)} disabled={approvingRequest} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                      <Check className="w-4 h-4" />{t('superAdmin.approve', { defaultValue: 'Tasdiqlash' })}
                    </button>
                    <button onClick={() => onSelectRequest(request)} disabled={rejectingRequest} className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                      <X className="w-4 h-4" />{t('superAdmin.reject', { defaultValue: 'Rad etish' })}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">{t('superAdmin.rejectRequest', { defaultValue: "So'rovni rad etish" })}</h3>
              <button onClick={onCloseRequest} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">{selectedRequest.firstName} {selectedRequest.lastName} {t('superAdmin.confirmReject', { defaultValue: "so'rovini rad etishni tasdiqlaysizmi?" })}</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('superAdmin.rejectionReason', { defaultValue: 'Rad etish sababi (ixtiyoriy)' })}</label>
                <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={4} placeholder={t('superAdmin.rejectionReasonPlaceholder', { defaultValue: 'Rad etish sababini kiriting...' })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
              <div className="flex gap-3">
                <button onClick={onCloseRequest} disabled={rejectingRequest} className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors">{t('superAdmin.cancel', { defaultValue: 'Bekor qilish' })}</button>
                <button onClick={() => onReject(selectedRequest.id)} disabled={rejectingRequest} className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {rejectingRequest ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><X className="w-4 h-4" /><span>{t('superAdmin.reject', { defaultValue: 'Rad etish' })}</span></>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {approvedCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">{t('superAdmin.credentialsTitle', { defaultValue: "Login Ma'lumotlari" })}</h3>
              <button onClick={onCloseCredentials} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-green-800 mb-3">
                  {t('superAdmin.credentialsNote', { defaultValue: "Quyidagi ma'lumotlarni foydalanuvchiga yuboring:" })}
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t('superAdmin.form.email')}</label>
                    <div className="flex items-center gap-2">
                      <input type="text" readOnly value={approvedCredentials.email || ''} className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono" />
                      <button onClick={() => { navigator.clipboard.writeText(approvedCredentials.email); success(t('superAdmin.copied', { defaultValue: 'Nusxalandi' })); }} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors">
                        {t('superAdmin.copy', { defaultValue: 'Nusxalash' })}
                      </button>
                    </div>
                  </div>
                  {approvedCredentials.setPasswordUrl ? (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {t('superAdmin.setPasswordLink', { defaultValue: 'Set Password Link (expires in 24h)' })}
                      </label>
                      <div className="flex items-center gap-2">
                        <input type="text" readOnly value={approvedCredentials.setPasswordUrl} className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono" />
                        <button onClick={() => { navigator.clipboard.writeText(approvedCredentials.setPasswordUrl); success(t('superAdmin.copied', { defaultValue: 'Nusxalandi' })); }} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors">
                          {t('superAdmin.copy', { defaultValue: 'Nusxalash' })}
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-amber-600">
                        {t('superAdmin.setPasswordNote', { defaultValue: 'Share this link with the admin. It expires in 24 hours.' })}
                      </p>
                    </div>
                  ) : approvedCredentials.password ? (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{t('superAdmin.form.password')}</label>
                      <div className="flex items-center gap-2">
                        <input type="text" readOnly value={approvedCredentials.password} className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono" />
                        <button onClick={() => { navigator.clipboard.writeText(approvedCredentials.password); success(t('superAdmin.copied', { defaultValue: 'Nusxalandi' })); }} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors">
                          {t('superAdmin.copy', { defaultValue: 'Nusxalash' })}
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {approvedCredentials.telegramUsername && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Telegram Username</label>
                      <div className="flex items-center gap-2">
                        <input type="text" readOnly value={`@${approvedCredentials.telegramUsername}`} className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" />
                        <a href={`https://t.me/${approvedCredentials.telegramUsername}`} target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm transition-colors">
                          {t('superAdmin.openTelegram', { defaultValue: 'Telegram' })}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <button onClick={onCloseCredentials} className="w-full px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors">
                {t('superAdmin.close', { defaultValue: 'Yopish' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
