import { useTranslation } from 'react-i18next';
import { Mail, Phone, MessageCircle, BookOpen } from 'lucide-react';
import Card from '../components/Card';
import { Link } from 'react-router-dom';

const Help = () => {
  const { t } = useTranslation();

  const faqs = [
    { question: t('help.q1'), answer: t('help.a1') },
    { question: t('help.q2'), answer: t('help.a2') },
    { question: t('help.q3'), answer: t('help.a3') },
    { question: t('help.q4'), answer: t('help.a4') },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="bg-gradient-to-r from-brand-500 to-brand-400 rounded-2xl p-6 md:p-8 shadow-xl border-0">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{t('help.title')}</h1>
        <p className="text-white/90 text-sm md:text-base">{t('help.subtitle')}</p>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-brand-600" />
          {t('help.contactUs')}
        </h2>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-50 rounded-lg">
              <Mail className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">{t('help.email')}</p>
              <a href={`mailto:${t('help.emailValue')}`} className="font-medium text-slate-900 hover:text-brand-600">
                {t('help.emailValue')}
              </a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-50 rounded-lg">
              <Phone className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">{t('help.phone')}</p>
              <a href={`tel:${t('help.phoneValue').replace(/\s/g, '')}`} className="font-medium text-slate-900 hover:text-brand-600">
                {t('help.phoneValue')}
              </a>
            </div>
          </div>
        </div>
      </Card>

      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-brand-600" />
          {t('help.faq')}
        </h2>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <Card key={index} className="p-6">
              <h3 className="font-semibold text-slate-900 mb-2">{faq.question}</h3>
              <p className="text-slate-600 text-sm">{faq.answer}</p>
            </Card>
          ))}
        </div>
      </div>

      <Card className="p-6 bg-gradient-to-br from-brand-50 to-brand-100/50 border-brand-200 shadow-lg">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('help.quickLinks')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Link to="/activities" className="text-brand-600 hover:text-brand-700 font-medium text-sm">
            {t('help.linkActivities')}
          </Link>
          <Link to="/media" className="text-brand-600 hover:text-brand-700 font-medium text-sm">
            {t('help.linkMedia')}
          </Link>
          <Link to="/meals" className="text-brand-600 hover:text-brand-700 font-medium text-sm">
            {t('help.linkMeals')}
          </Link>
          <Link to="/settings" className="text-brand-600 hover:text-brand-700 font-medium text-sm">
            {t('help.linkSettings')}
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Help;
