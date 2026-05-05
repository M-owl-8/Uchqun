import Card from '../Card';
import { useTranslation } from 'react-i18next';

export default function PaymentsTab({ payments, loadingPayments }) {
  const { t } = useTranslation();
  return (
    <>
      <div className="text-center">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
          {t('superAdmin.paymentsTitle', { defaultValue: "To'lovlar" })}
        </h2>
        <p className="text-gray-600 font-medium">{t('superAdmin.paymentsSubtitle', { defaultValue: "Barcha to'lovlar ro'yxati" })}</p>
      </div>

      <Card className="p-6 space-y-4">
        {loadingPayments ? (
          <div className="flex items-center justify-center min-h-[120px]"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : payments.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-8">{t('superAdmin.noPayments', { defaultValue: "To'lovlar topilmadi" })}</p>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <div key={payment.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">{payment.parent?.firstName} {payment.parent?.lastName}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        payment.status === 'completed' ? 'bg-green-100 text-green-700' :
                        payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {payment.status === 'completed' ? t('superAdmin.paymentCompleted', { defaultValue: "To'langan" }) :
                         payment.status === 'pending' ? t('superAdmin.paymentPending', { defaultValue: 'Kutilmoqda' }) :
                         t('superAdmin.paymentFailed', { defaultValue: 'Xatolik' })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{t('superAdmin.amount', { defaultValue: 'Summa' })}: {payment.amount?.toLocaleString('uz-UZ')} {t('superAdmin.currency', { defaultValue: "so'm" })}</p>
                    <p className="text-xs text-gray-500">{new Date(payment.createdAt).toLocaleString('uz-UZ')}</p>
                    {payment.description && <p className="text-sm text-gray-600 mt-2">{payment.description}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
