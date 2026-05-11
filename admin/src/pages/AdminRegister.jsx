import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { Crown, Upload, FileText, Mail, Phone, X, CheckCircle, MessageSquare } from 'lucide-react';
const AdminRegister = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    telegramUsername: '',
  });
  const [certificateFile, setCertificateFile] = useState(null);
  const [passportFile, setPassportFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setError(t('adminRegister.errorFileType'));
        return;
      }
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setError(t('adminRegister.errorFileSize'));
        return;
      }
      if (type === 'certificate') {
        setCertificateFile(file);
      } else {
        setPassportFile(file);
      }
      setError('');
    }
  };

  const removeFile = (type) => {
    if (type === 'certificate') {
      setCertificateFile(null);
    } else {
      setPassportFile(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.telegramUsername) {
      setError(t('adminRegister.errorRequired'));
      setLoading(false);
      return;
    }

    if (!certificateFile && !passportFile) {
      setError(t('adminRegister.errorDoc'));
      setLoading(false);
      return;
    }

    try {
      const formDataToSend = new FormData();
      
      // Add form fields (always append, even if empty, to ensure they're sent)
      formDataToSend.append('firstName', formData.firstName || '');
      formDataToSend.append('lastName', formData.lastName || '');
      formDataToSend.append('email', formData.email || '');
      formDataToSend.append('phone', formData.phone || '');
      formDataToSend.append('telegramUsername', formData.telegramUsername || '');

      // Add files
      if (certificateFile) {
        formDataToSend.append('certificateFile', certificateFile);
      }
      if (passportFile) {
        formDataToSend.append('passportFile', passportFile);
      }

      const response = await api.post('/auth/admin-register', formDataToSend, {
        // Remove Content-Type header to let axios set it automatically with boundary
        headers: {
          'Content-Type': undefined,
        },
      });

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || t('adminRegister.errorDefault');
      let fullErrorMessage = errorMessage;
      if (err.response?.data?.details) {
        fullErrorMessage += `\n\n${t('adminRegister.errorDetails')}${JSON.stringify(err.response.data.details, null, 2)}`;
      }
      setError(fullErrorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('adminRegister.successTitle')}</h1>
          <p className="text-gray-600 mb-4">{t('adminRegister.successBody')}</p>
          <p className="text-sm text-gray-500">{t('adminRegister.successRedirect')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4 py-12">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
            <Crown className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('adminRegister.title')}</h1>
          <p className="text-gray-600">{t('adminRegister.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                {t('adminRegister.labelFirstName')} <span className="text-red-500">*</span>
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder={t('adminRegister.placeholderFirstName')}
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                {t('adminRegister.labelLastName')} <span className="text-red-500">*</span>
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder={t('adminRegister.placeholderLastName')}
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              {t('adminRegister.labelEmail')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="email@example.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              {t('adminRegister.labelPhone')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="+998901234567"
              />
            </div>
          </div>

          <div>
            <label htmlFor="telegramUsername" className="block text-sm font-medium text-gray-700 mb-2">
              {t('adminRegister.labelTelegram')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="telegramUsername"
                name="telegramUsername"
                type="text"
                value={formData.telegramUsername}
                onChange={(e) => {
                  // Remove @ if user types it
                  const value = e.target.value.replace('@', '');
                  setFormData({ ...formData, telegramUsername: value });
                }}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder={t('adminRegister.placeholderTelegram')}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {t('adminRegister.telegramNote')}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('adminRegister.labelCertificate')} <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-primary-500 transition-colors">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => handleFileChange(e, 'certificate')}
                  className="hidden"
                  id="certificateFile"
                />
                <label
                  htmlFor="certificateFile"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="w-8 h-8 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {certificateFile ? certificateFile.name : t('adminRegister.uploadCertificate')}
                  </span>
                  <span className="text-xs text-gray-500">{t('adminRegister.uploadHint')}</span>
                </label>
              </div>
              {certificateFile && (
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded">
                  <FileText className="w-4 h-4" />
                  <span className="flex-1">{certificateFile.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile('certificate')}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('adminRegister.labelPassport')} <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-primary-500 transition-colors">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => handleFileChange(e, 'passport')}
                  className="hidden"
                  id="passportFile"
                />
                <label
                  htmlFor="passportFile"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="w-8 h-8 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {passportFile ? passportFile.name : t('adminRegister.uploadPassport')}
                  </span>
                  <span className="text-xs text-gray-500">{t('adminRegister.uploadHint')}</span>
                </label>
              </div>
              {passportFile && (
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded">
                  <FileText className="w-4 h-4" />
                  <span className="flex-1">{passportFile.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile('passport')}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-semibold mb-1">{t('adminRegister.noticeTitle')}</p>
            <p>{t('adminRegister.noticeBody')}</p>
            {formData.telegramUsername && (
              <p className="mt-2">{t('adminRegister.noticeTelegram', { username: formData.telegramUsername })}</p>
            )}
          </div>

          <div className="flex gap-4">
            <Link
              to="/login"
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-center"
            >
              {t('adminRegister.cancel')}
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  {t('adminRegister.submitting')}
                </>
              ) : (
                t('adminRegister.submit')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminRegister;
