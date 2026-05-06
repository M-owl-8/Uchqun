import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChild } from '../context/ChildContext';
import api from '../services/api';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTranslation } from 'react-i18next';
import {
  DollarSign,
  CreditCard,
  CheckCircle,
  Clock,
  Calendar,
  AlertCircle,
} from 'lucide-react';

const Payments = () => {
  const { user } = useAuth();
  const { selectedChild } = useChild();
  const { t } = useTranslation();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [nextPaymentDate, setNextPaymentDate] = useState(null);
  const [monthlyAmount, setMonthlyAmount] = useState(0);

  useEffect(() => {
    loadPayments();
    calculateNextPayment();
    
    // Real-time countdown
    const interval = setInterval(() => {
      calculateNextPayment();
    }, 1000 * 60); // Update every minute

    return () => clearInterval(interval);
  }, [payments]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const params = {
        status: 'completed',
      };
      if (selectedChild?.id) {
        params.childId = selectedChild.id;
      }
      const response = await api.get('/payments', { params });
      const paymentsData = response.data?.data?.payments;
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);
      
      // Calculate monthly amount from last payment
      if (paymentsData && paymentsData.length > 0) {
        const lastPayment = paymentsData[0];
        setMonthlyAmount(parseFloat(lastPayment.amount || 0));
      }
    } catch (error) {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateNextPayment = () => {
    if (!payments || payments.length === 0) {
      // If no payments, set next payment to end of current month
      const now = new Date();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setNextPaymentDate(lastDay);
      const diffTime = lastDay - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysRemaining(diffDays);
      return;
    }

    // Get last completed payment
    const lastPayment = payments.find(p => p.status === 'completed' && p.paidAt);
    if (!lastPayment || !lastPayment.paidAt) {
      const now = new Date();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setNextPaymentDate(lastDay);
      const diffTime = lastDay - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysRemaining(diffDays);
      return;
    }

    // Calculate next payment date (1 month after last payment)
    const lastPaidDate = new Date(lastPayment.paidAt);
    const nextDate = new Date(lastPaidDate);
    nextDate.setMonth(nextDate.getMonth() + 1);
    
    setNextPaymentDate(nextDate);

    // Calculate days remaining
    const now = new Date();
    const diffTime = nextDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    setDaysRemaining(diffDays);
  };


  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t('payments.title', { defaultValue: 'To\'lovlar' })}
        </h1>
        <p className="text-gray-600">
          {t('payments.subtitle', { defaultValue: 'Oylik to\'lovlar va to\'lov tarixi' })}
        </p>
      </div>

      {/* Monthly Payment Card */}
      <Card className="p-6 bg-gradient-to-br from-primary-500 to-primary-600 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold mb-2">{t('payments.monthlyPayment', { defaultValue: 'Oylik To\'lov' })}</h2>
            <p className="text-primary-100 text-sm">
              {t('payments.nextPayment', { defaultValue: 'Keyingi to\'lov' })}: {nextPaymentDate ? formatDate(nextPaymentDate) : '-'}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 mb-2">
              {daysRemaining > 0 ? (
                <>
                  <Clock className="w-5 h-5" />
                  <span className="text-2xl font-bold">
                    {t('payments.daysRemaining', { count: daysRemaining, defaultValue: '{{count}} kun qoldi' })}
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-2xl font-bold text-yellow-300">
                    {t('payments.daysOverdue', { count: Math.abs(daysRemaining), defaultValue: '{{count}} kun kechikdi' })}
                  </span>
                </>
              )}
            </div>
            <p className="text-primary-100 text-sm">
              {monthlyAmount > 0 ? `${monthlyAmount.toLocaleString()} UZS` : t('payments.amountNotSet', { defaultValue: 'Summa belgilanmagan' })}
            </p>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <p className="text-sm text-blue-800">
            <strong>{t('payments.note', { defaultValue: 'Eslatma' })}:</strong> {t('payments.noteText', { defaultValue: 'To\'lov qilish uchun admin bilan bog\'laning yoki admin panel orqali to\'lov qiling.' })}
          </p>
        </div>
      </Card>

      {/* Payment History */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          {t('payments.history', { defaultValue: 'To\'lov Tarixi' })}
        </h2>
        <div className="space-y-3">
          {payments && payments.length > 0 ? (
            payments.map((payment) => (
              <Card key={payment.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {formatDate(payment.paidAt || payment.createdAt)}
                      </p>
                             <p className="text-sm text-gray-600">
                               {payment.paymentProvider ?
                                 (payment.paymentProvider === 'payme' ? t('payments.paymentProvider.payme', { defaultValue: 'Payme' }) :
                                  payment.paymentProvider === 'click' ? t('payments.paymentProvider.click', { defaultValue: 'Click' }) :
                                  payment.paymentProvider === 'card' ? t('payments.paymentProvider.card', { defaultValue: 'Karta' }) :
                                  payment.paymentProvider) :
                                 t('payments.paymentProvider.other', { defaultValue: 'To\'lov' })}
                             </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">
                      {parseFloat(payment.amount || 0).toLocaleString()} {payment.currency}
                    </p>
                           <p className="text-xs text-gray-500">
                             {payment.description || t('payments.monthlyPaymentLabel', { defaultValue: 'Oylik to\'lov' })}
                           </p>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-12 text-center">
              <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {t('payments.noPayments', { defaultValue: 'To\'lovlar yo\'q' })}
                    </h3>
                    <p className="text-gray-600">
                      {t('payments.noPaymentsDesc', { defaultValue: 'Hozircha to\'lovlar mavjud emas' })}
                    </p>
            </Card>
          )}
        </div>
      </div>

    </div>
  );
};

export default Payments;
