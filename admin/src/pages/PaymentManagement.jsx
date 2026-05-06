import { useEffect, useState } from 'react';
import api from '../services/api';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import {
  DollarSign,
  Plus,
  CreditCard,
  Calendar,
  User,
  Building2,
  Baby,
  Save,
  X,
  Search,
  TrendingUp,
  CheckCircle,
  Clock,
  XCircle,
  BarChart3,
} from 'lucide-react';

/**
 * Payment Management Page for Admin
 * 
 * Business Logic:
 * - Admin can create payments for parents
 * - Admin can view all payments from parents created by their receptions
 */
const PaymentManagement = () => {
  const [payments, setPayments] = useState([]);
  const [parents, setParents] = useState([]);
  const [children, setChildren] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingParents, setLoadingParents] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    parentId: '',
    childId: '',
    schoolId: '',
    amount: '',
    currency: 'UZS',
    paymentType: 'tuition',
    paymentMethod: 'card',
    paymentProvider: '',
    description: '',
  });
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [saving, setSaving] = useState(false);
  const { success, error: showError } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [paymentsRes, parentsRes] = await Promise.all([
        api.get('/payments?limit=50'),
        api.get('/admin/parents'),
      ]);

      // Ensure payments is always an array
      const paymentsData = paymentsRes.data?.data?.payments;
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);
      setParents(parentsRes.data.data || []);
    } catch (error) {
      showError(t('payment.loadError', { defaultValue: 'To\'lovlarni yuklashda xatolik' }));
    } finally {
      setLoading(false);
    }
  };

  const loadChildren = async (parentId) => {
    if (!parentId) {
      setChildren([]);
      return;
    }

    try {
      setLoadingParents(true);
      const response = await api.get(`/admin/parents/${parentId}`);
      const parentData = response.data.data;
      setChildren(parentData.children || []);
    } catch (error) {
      setChildren([]);
    } finally {
      setLoadingParents(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      parentId: '',
      childId: '',
      schoolId: '',
      amount: '',
      currency: 'UZS',
      paymentType: 'tuition',
      paymentMethod: 'card',
      paymentProvider: '',
      description: '',
    });
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
    setCardName('');
    setShowModal(true);
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiry = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const handleSave = async () => {
    if (!formData.parentId || !formData.amount) {
      showError(t('payment.validation.required', { defaultValue: 'Barcha majburiy maydonlar to\'ldirilishi kerak' }));
      return;
    }

    if (!cardNumber || !cardExpiry || !cardCvv || !cardName) {
      showError(t('payment.card.validation.allFieldsRequired', { defaultValue: 'Iltimos, barcha karta ma\'lumotlarini kiriting' }));
      return;
    }

    // Validate card number
    const cleanCardNumber = cardNumber.replace(/\s/g, '');
    if (cleanCardNumber.length < 16) {
      showError(t('payment.card.validation.cardNumberInvalid', { defaultValue: 'Karta raqami noto\'g\'ri. Iltimos, 16 raqam kiriting' }));
      return;
    }

    // Validate expiry date
    const [month, year] = cardExpiry.split('/');
    if (!month || !year || month.length !== 2 || year.length !== 2) {
      showError(t('payment.card.validation.expiryInvalid', { defaultValue: 'Muddati noto\'g\'ri. Format: MM/YY' }));
      return;
    }

    // Validate CVV
    if (cardCvv.length < 3) {
      showError(t('payment.card.validation.cvvInvalid', { defaultValue: 'CVV noto\'g\'ri. Iltimos, 3 raqam kiriting' }));
      return;
    }

    try {
      setSaving(true);
      await api.post('/payments', {
        ...formData,
        parentId: formData.parentId,
        amount: parseFloat(formData.amount),
        paymentMethod: 'card',
        paymentProvider: 'card',
        metadata: {
          cardLast4: cleanCardNumber.slice(-4),
          cardName: cardName,
        },
      });
      success(t('payment.createSuccess', { defaultValue: 'To\'lov muvaffaqiyatli amalga oshirildi' }));
      setShowModal(false);
      setCardNumber('');
      setCardExpiry('');
      setCardCvv('');
      setCardName('');
      loadData();
    } catch (error) {
      showError(error.response?.data?.error || t('payment.saveError', { defaultValue: 'Saqlashda xatolik' }));
    } finally {
      setSaving(false);
    }
  };

  const filteredPayments = Array.isArray(payments) ? payments.filter((payment) => {
    const query = searchQuery.toLowerCase();
    return (
      payment.parent?.firstName?.toLowerCase().includes(query) ||
      payment.parent?.lastName?.toLowerCase().includes(query) ||
      payment.parent?.email?.toLowerCase().includes(query) ||
      payment.description?.toLowerCase().includes(query)
    );
  }) : [];

  // Calculate statistics from payments
  const calculateStats = () => {
    if (!Array.isArray(payments) || payments.length === 0) {
      return {
        totalRevenue: 0,
        totalPayments: 0,
        completedPayments: 0,
        pendingPayments: 0,
        failedPayments: 0,
        averagePayment: 0,
        byType: {},
        byStatus: {
          completed: { count: 0, amount: 0 },
          pending: { count: 0, amount: 0 },
          failed: { count: 0, amount: 0 },
        },
        byMonth: {},
      };
    }

    let totalRevenue = 0;
    let completedRevenue = 0;
    const byType = {};
    const byStatus = {
      completed: { count: 0, amount: 0 },
      pending: { count: 0, amount: 0 },
      failed: { count: 0, amount: 0 },
    };
    const byMonth = {};

    payments.forEach((payment) => {
      const amount = parseFloat(payment.amount || 0);
      totalRevenue += amount;

      // By status
      const status = payment.status || 'pending';
      if (byStatus[status]) {
        byStatus[status].count++;
        byStatus[status].amount += amount;
      }

      if (status === 'completed') {
        completedRevenue += amount;
      }

      // By type
      const type = payment.paymentType || 'other';
      if (!byType[type]) {
        byType[type] = { count: 0, amount: 0 };
      }
      byType[type].count++;
      byType[type].amount += amount;

      // By month
      if (payment.paidAt || payment.createdAt) {
        const date = new Date(payment.paidAt || payment.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!byMonth[monthKey]) {
          byMonth[monthKey] = { count: 0, amount: 0 };
        }
        byMonth[monthKey].count++;
        byMonth[monthKey].amount += amount;
      }
    });

    const completedPayments = byStatus.completed.count;
    const averagePayment = completedPayments > 0 ? completedRevenue / completedPayments : 0;

    return {
      totalRevenue: completedRevenue,
      totalPayments: payments.length,
      completedPayments: byStatus.completed.count,
      pendingPayments: byStatus.pending.count,
      failedPayments: byStatus.failed.count,
      averagePayment,
      byType,
      byStatus,
      byMonth,
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            {t('payment.management', { defaultValue: 'To\'lov Boshqaruvi' })}
          </h1>
          <p className="text-gray-600 mt-2">
            {t('payment.managementDesc', { defaultValue: 'Ota-onalar uchun to\'lovlar yarating va boshqaring' })}
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          {t('payment.create', { defaultValue: 'Yangi To\'lov' })}
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="w-8 h-8" />
            <TrendingUp className="w-6 h-6" />
          </div>
          <p className="text-3xl font-bold mb-1">
            {stats.totalRevenue.toLocaleString()} UZS
          </p>
          <p className="text-green-100 text-sm">{t('payment.stats.totalRevenue', { defaultValue: 'Jami Daromad' })}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <CreditCard className="w-8 h-8 text-primary-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.totalPayments}</p>
          <p className="text-gray-600 text-sm">{t('payment.stats.totalPayments', { defaultValue: 'Jami To\'lovlar' })}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.completedPayments}</p>
          <p className="text-gray-600 text-sm">{t('payment.stats.completed', { defaultValue: 'Yakunlangan' })}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <BarChart3 className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">
            {stats.averagePayment.toLocaleString()} UZS
          </p>
          <p className="text-gray-600 text-sm">{t('payment.stats.averagePayment', { defaultValue: 'O\'rtacha To\'lov' })}</p>
        </Card>
      </div>

      {/* Status Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('payment.stats.completed', { defaultValue: 'Yakunlangan' })}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completedPayments}</p>
            </div>
          </div>
          <p className="text-lg font-semibold text-green-600">
            {stats.byStatus.completed.amount.toLocaleString()} UZS
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('payment.stats.pending', { defaultValue: 'Kutilmoqda' })}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingPayments}</p>
            </div>
          </div>
          <p className="text-lg font-semibold text-yellow-600">
            {stats.byStatus.pending.amount.toLocaleString()} UZS
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('payment.stats.failed', { defaultValue: 'Bekor qilingan' })}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.failedPayments}</p>
            </div>
          </div>
          <p className="text-lg font-semibold text-red-600">
            {(stats.byStatus.failed?.amount || 0).toLocaleString()} UZS
          </p>
        </Card>
      </div>

      {/* Payment Type Statistics */}
      {Object.keys(stats.byType).length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-600" />
            {t('payment.stats.byType', { defaultValue: 'To\'lov Turi Bo\'yicha' })}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(stats.byType).map(([type, data]) => (
              <div key={type} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900 capitalize">
                    {type === 'tuition' ? 'Ta\'lim' :
                     type === 'therapy' ? 'Terapiya' :
                     type === 'meal' ? 'Ovqat' :
                     type === 'activity' ? 'Faoliyat' : 'Boshqa'}
                  </span>
                  <span className="text-lg font-bold text-primary-600">
                    {data.amount.toLocaleString()} UZS
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{data.count} {t('payment.stats.taTolov', { defaultValue: 'ta to\'lov' })}</span>
                  <span>{t('payment.stats.ortacha', { defaultValue: 'O\'rtacha' })}: {(data.amount / data.count).toLocaleString()} UZS</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Monthly Statistics */}
      {Object.keys(stats.byMonth).length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" />
            {t('payment.stats.byMonth', { defaultValue: 'Oylik Daromad' })}
          </h2>
          <div className="space-y-3">
            {Object.entries(stats.byMonth)
              .sort(([a], [b]) => b.localeCompare(a))
              .slice(0, 6)
              .map(([month, data]) => {
                const [year, monthNum] = month.split('-');
                const monthNames = {
                  uz: ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'],
                  ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
                  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
                };
                const currentLang = i18n.language || 'uz';
                return (
                  <div key={month} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900">
                        {monthNames[currentLang]?.[parseInt(monthNum) - 1] || monthNames.uz[parseInt(monthNum) - 1]} {year}
                      </span>
                      <span className="text-lg font-bold text-primary-600">
                        {data.amount.toLocaleString()} UZS
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>{data.count} {t('payment.stats.taTolov', { defaultValue: 'ta to\'lov' })}</span>
                      <span>{t('payment.stats.ortacha', { defaultValue: 'O\'rtacha' })}: {(data.amount / data.count).toLocaleString()} UZS</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      )}

      {/* Search */}
      <Card className="p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={t('payment.search', { defaultValue: 'Qidirish...' })}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </Card>

      {/* Payments List */}
      <div className="space-y-4">
        {filteredPayments.length === 0 ? (
          <Card className="p-12 text-center">
            <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t('payment.noPayments', { defaultValue: 'To\'lovlar topilmadi' })}
            </h3>
            <p className="text-gray-600">
              {t('payment.noPaymentsDesc', { defaultValue: 'Hozircha to\'lovlar yo\'q' })}
            </p>
          </Card>
        ) : (
          filteredPayments.map((payment) => (
            <Card key={payment.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${
                      payment.status === 'completed' ? 'bg-green-100 text-green-600' :
                      payment.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                      payment.status === 'failed' ? 'bg-red-100 text-red-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">
                        {payment.parent?.firstName} {payment.parent?.lastName}
                      </p>
                      <p className="text-sm text-gray-600">{payment.parent?.email}</p>
                    </div>
                  </div>
                  {payment.child && (
                    <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                      <Baby className="w-4 h-4" />
                      {payment.child.firstName} {payment.child.lastName}
                    </p>
                  )}
                  {payment.school && (
                    <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      {payment.school.name}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                    <span className="flex items-center gap-1">
                      <CreditCard className="w-4 h-4" />
                      {payment.paymentType} - {payment.paymentMethod}
                    </span>
                    {payment.paidAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(payment.paidAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {payment.description && (
                    <p className="text-sm text-gray-600 mt-2">{payment.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900 mb-1">
                    {parseFloat(payment.amount || 0).toLocaleString()} {payment.currency}
                  </p>
                  <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                    payment.status === 'completed' ? 'bg-green-100 text-green-700' :
                    payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    payment.status === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {payment.status}
                  </span>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-lg font-bold text-gray-900">
                {t('payment.create', { defaultValue: 'Yangi To\'lov' })}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setCardNumber('');
                  setCardExpiry('');
                  setCardCvv('');
                  setCardName('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('payment.parent', { defaultValue: 'Ota-ona' })} *
                </label>
                <select
                  value={formData.parentId}
                  onChange={(e) => {
                    setFormData({ ...formData, parentId: e.target.value, childId: '' });
                    loadChildren(e.target.value);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                >
                  <option value="">{t('payment.selectParent', { defaultValue: 'Ota-onani tanlang' })}</option>
                  {parents.map((parent) => (
                    <option key={parent.id} value={parent.id}>
                      {parent.firstName} {parent.lastName} ({parent.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('payment.child', { defaultValue: 'Bola' })}
                </label>
                <select
                  value={formData.childId}
                  onChange={(e) => setFormData({ ...formData, childId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  disabled={!formData.parentId || loadingParents}
                >
                  <option value="">{t('payment.selectChild', { defaultValue: 'Bolani tanlang (ixtiyoriy)' })}</option>
                  {children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.firstName} {child.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('payment.amount', { defaultValue: 'To\'lov Summasi (UZS)' })} *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg font-semibold"
                  placeholder="0"
                  required
                />
              </div>

              {/* Card Preview */}
              <div className="bg-gradient-to-br from-primary-600 to-primary-500 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <CreditCard className="w-8 h-8" />
                  <div className="text-sm opacity-90">VISA</div>
                </div>
                <div className="mb-4">
                  <p className="text-sm opacity-90 mb-1">{t('payment.card.cardNumber', { defaultValue: 'Karta raqami' })}</p>
                  <p className="text-xl font-mono tracking-wider">
                    {cardNumber || '**** **** **** ****'}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90 mb-1">{t('payment.card.cardName', { defaultValue: 'Karta egasi' })}</p>
                    <p className="font-semibold">
                      {cardName || t('payment.card.cardNamePlaceholder', { defaultValue: 'KARTA EGASI' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm opacity-90 mb-1">{t('payment.card.cardExpiry', { defaultValue: 'Muddati' })}</p>
                    <p className="font-semibold">
                      {cardExpiry || t('payment.card.expiryPlaceholder', { defaultValue: 'MM/YY' })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Form */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('payment.card.cardName', { defaultValue: 'Karta Egasi' })}
                </label>
                <input
                  type="text"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder={t('payment.card.cardNamePlaceholder', { defaultValue: 'JOHN DOE' })}
                  maxLength={50}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('payment.card.cardNumber', { defaultValue: 'Karta Raqami' })}
                </label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
                  placeholder={t('payment.card.cardNumberPlaceholder', { defaultValue: '1234 5678 9012 3456' })}
                  maxLength={19}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('payment.card.cardExpiry', { defaultValue: 'Muddati' })}
                  </label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => {
                      const formatted = formatExpiry(e.target.value);
                      if (formatted.length <= 5) {
                        setCardExpiry(formatted);
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
                    placeholder={t('payment.card.expiryPlaceholder', { defaultValue: 'MM/YY' })}
                    maxLength={5}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('payment.card.cvv', { defaultValue: 'CVV' })}
                  </label>
                  <input
                    type="text"
                    value={cardCvv}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '');
                      if (v.length <= 3) {
                        setCardCvv(v);
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
                    placeholder={t('payment.card.cvvPlaceholder', { defaultValue: '123' })}
                    maxLength={3}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('payment.description', { defaultValue: 'Tavsif' })}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder={t('payment.descriptionPlaceholder', { defaultValue: 'To\'lov tavsifi...' })}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>{t('payment.card.security', { defaultValue: 'Xavfsizlik' })}:</strong> {t('payment.card.security', { defaultValue: 'Barcha ma\'lumotlar xavfsiz tarzda qayta ishlanadi. Karta ma\'lumotlari saqlanmaydi.' })}
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setCardNumber('');
                    setCardExpiry('');
                    setCardCvv('');
                    setCardName('');
                  }}
                  className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors"
                  disabled={saving}
                >
                  {t('payment.cancel', { defaultValue: 'Bekor qilish' })}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{t('payment.saving', { defaultValue: 'Saqlanmoqda...' })}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>{t('payment.save', { defaultValue: 'Saqlash' })}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentManagement;
