import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import { ToastProvider } from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext';
import { ChildProvider } from './context/ChildContext';
import { ToastContainer } from './components/Toast';
import Layout from './components/Layout';

const ParentApp = () => {
  return (
    <I18nextProvider i18n={i18n}>
      <ToastProvider>
        <NotificationProvider>
          <ChildProvider>
            <ToastContainer />
            <Layout />
          </ChildProvider>
        </NotificationProvider>
      </ToastProvider>
    </I18nextProvider>
  );
};

export default ParentApp;
