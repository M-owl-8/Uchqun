import { NotificationProvider } from './context/NotificationContext';
import { ChildProvider } from './context/ChildContext';
import Layout from './components/Layout';

const ParentApp = () => {
  return (
    <NotificationProvider>
      <ChildProvider>
        <Layout />
      </ChildProvider>
    </NotificationProvider>
  );
};

export default ParentApp;
