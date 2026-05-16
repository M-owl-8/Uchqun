import { Check, X, Mail, Phone, MessageSquare, FileText } from 'lucide-react';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import Modal from '@shared/components/Modal';
import Textarea from '@shared/components/Textarea';
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
          {t('government.registrationsTitle', { defaultValue: "Admin Ro'yxatdan O'tish So'rovlari" })}
        </h2>
        <p className="text-gray-600 font-medium">{t('government.registrationsSubtitle', { defaultValue: "Yangi admin so'rovlarini ko'rib chiqing va tasdiqlang" })}</p>
      </div>

      <Card className="p-6 space-y-4">
        {loadingRegistrations ? (
          <div className="flex items-center justify-center min-h-[120px]"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : registrationRequests.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-8">{t('government.noRegistrations', { defaultValue: "Hozircha so'rovlar yo'q" })}</p>
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
                      {/* TODO(phase-1): external document link color — text-blue-600 used as conventional hyperlink color; confirm keep as semantic link color or switch to primary-* */}
                      {request.certificateFile && <a href={request.certificateFile} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"><FileText className="w-4 h-4" />Guvohnoma</a>}
                      {request.passportFile && <a href={request.passportFile} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"><FileText className="w-4 h-4" />Passport/ID</a>}
                    </div>
                    <p className="text-xs text-gray-500">{"So'rov yuborilgan:"} {new Date(request.createdAt).toLocaleString('uz-UZ')}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button variant="primary" size="sm" onClick={() => onApprove(request.id)} disabled={approvingRequest} loading={approvingRequest}>
                      <Check className="w-4 h-4 mr-1" />{t('government.approve', { defaultValue: 'Tasdiqlash' })}
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => onSelectRequest(request)} disabled={rejectingRequest}>
                      <X className="w-4 h-4 mr-1" />{t('government.reject', { defaultValue: 'Rad etish' })}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        isOpen={!!selectedRequest}
        onClose={onCloseRequest}
        title={t('government.rejectRequest', { defaultValue: "So'rovni rad etish" })}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={onCloseRequest} disabled={rejectingRequest}>
              {t('government.cancel', { defaultValue: 'Bekor qilish' })}
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={() => onReject(selectedRequest?.id)}
              disabled={rejectingRequest}
              loading={rejectingRequest}
            >
              <X className="w-4 h-4 mr-1" />
              {t('government.reject', { defaultValue: 'Rad etish' })}
            </Button>
          </div>
        }
      >
        {selectedRequest && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{selectedRequest.firstName} {selectedRequest.lastName} {t('government.confirmReject', { defaultValue: "so'rovini rad etishni tasdiqlaysizmi?" })}</p>
            <Textarea
              label={t('government.rejectionReason', { defaultValue: 'Rad etish sababi (ixtiyoriy)' })}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              placeholder={t('government.rejectionReasonPlaceholder', { defaultValue: 'Rad etish sababini kiriting...' })}
            />
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!approvedCredentials}
        onClose={onCloseCredentials}
        title={t('government.credentialsTitle', { defaultValue: "Login Ma'lumotlari" })}
        footer={
          <Button variant="secondary" className="w-full" onClick={onCloseCredentials}>
            {t('government.close', { defaultValue: 'Yopish' })}
          </Button>
        }
      >
        {approvedCredentials && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-green-800 mb-3">
              {t('government.credentialsNote', { defaultValue: "Quyidagi ma'lumotlarni foydalanuvchiga yuboring:" })}
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('government.form.email')}</label>
                <div className="flex items-center gap-2">
                  <input type="text" readOnly value={approvedCredentials.email || ''} className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono" />
                  <Button variant="secondary" size="sm" onClick={() => { navigator.clipboard.writeText(approvedCredentials.email); success(t('government.copied', { defaultValue: 'Nusxalandi' })); }}>
                    {t('government.copy', { defaultValue: 'Nusxalash' })}
                  </Button>
                </div>
              </div>
              {approvedCredentials.setPasswordUrl ? (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t('government.setPasswordLink', { defaultValue: 'Set Password Link (expires in 24h)' })}
                  </label>
                  <div className="flex items-center gap-2">
                    <input type="text" readOnly value={approvedCredentials.setPasswordUrl} className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono" />
                    <Button variant="secondary" size="sm" onClick={() => { navigator.clipboard.writeText(approvedCredentials.setPasswordUrl); success(t('government.copied', { defaultValue: 'Nusxalandi' })); }}>
                      {t('government.copy', { defaultValue: 'Nusxalash' })}
                    </Button>
                  </div>
                  <p className="mt-1 text-xs text-amber-600">
                    {t('government.setPasswordNote', { defaultValue: 'Share this link with the admin. It expires in 24 hours.' })}
                  </p>
                </div>
              ) : approvedCredentials.password ? (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('government.form.password')}</label>
                  <div className="flex items-center gap-2">
                    <input type="text" readOnly value={approvedCredentials.password} className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono" />
                    <Button variant="secondary" size="sm" onClick={() => { navigator.clipboard.writeText(approvedCredentials.password); success(t('government.copied', { defaultValue: 'Nusxalandi' })); }}>
                      {t('government.copy', { defaultValue: 'Nusxalash' })}
                    </Button>
                  </div>
                </div>
              ) : null}
              {approvedCredentials.telegramUsername && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Telegram Username</label>
                  <div className="flex items-center gap-2">
                    <input type="text" readOnly value={`@${approvedCredentials.telegramUsername}`} className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" />
                    {/* TODO(phase-1): Telegram link button color — bg-blue-100 used as external link style; confirm keep as Telegram brand color or switch to primary-* */}
                    <a href={`https://t.me/${approvedCredentials.telegramUsername}`} target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm transition-colors">
                      {t('government.openTelegram', { defaultValue: 'Telegram' })}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
