import { useEffect } from 'react';
import { useToast } from '../context/ToastContext';

const Toast = ({ id, message, type, duration = 5000 }) => {
  const { removeToast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, removeToast]);

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-sky-500',
  }[type] || 'bg-gray-500';

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  }[type] || '';

  return (
    <div
      role="alert"
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      className={`${bgColor} text-white px-6 py-4 rounded-lg shadow-lg mb-4 flex items-center justify-between min-w-[300px] max-w-md animate-slide-in`}
    >
      <div className="flex items-center">
        <span className="text-xl mr-3" aria-hidden="true">{icons}</span>
        <p className="font-medium">{message}</p>
      </div>
      <button
        onClick={() => removeToast(id)}
        className="ml-4 text-white hover:text-gray-200"
        aria-label="Dismiss notification"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </div>
  );
};

export const ToastContainer = () => {
  const { toasts } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end" aria-label="Notifications">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} />
      ))}
    </div>
  );
};

export default Toast;
