import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useToast } from '@shared/context/ToastContext';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '@shared/components/LoadingSpinner';

const ERROR_CODE_MAP = {
  IMPORT_ROW_FIRST_NAME_REQUIRED: "Ism majburiy",
  IMPORT_ROW_LAST_NAME_REQUIRED: "Familiya majburiy",
  IMPORT_ROW_PARENT_NOT_FOUND: "Ota-ona topilmadi",
  IMPORT_ROW_DUPLICATE: "Takroriy yozuv",
  IMPORT_ROW_PARENT_EMAIL_INVALID: "Ota-ona email manzili noto'g'ri",
};

const humanizeCode = (code) => ERROR_CODE_MAP[code] ?? code;

const StepIndicator = ({ step }) => {
  const steps = [1, 2, 3, 4, 5];
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
              s < step
                ? 'bg-brand-600 text-white'
                : s === step
                ? 'bg-brand-600 text-white ring-4 ring-brand-100'
                : 'bg-warm-100 text-warm-500'
            }`}
          >
            {s}
          </div>
          {i < steps.length - 1 && (
            <div className={`w-8 h-0.5 mx-1 ${s < step ? 'bg-brand-600' : 'bg-warm-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
};

const BulkImport = () => {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [validating, setValidating] = useState(false);
  const [jobResult, setJobResult] = useState(null);
  const [pollStatus, setPollStatus] = useState(null);
  const [showErrors, setShowErrors] = useState(false);
  const intervalRef = useRef(null);

  const { error: toastError, success: toastSuccess } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const resetAll = () => {
    setStep(1);
    setFile(null);
    setValidating(false);
    setJobResult(null);
    setPollStatus(null);
    setShowErrors(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const handleValidate = async () => {
    if (!file) return;
    try {
      setValidating(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/admin/import/children/validate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setJobResult(res.data.data ?? res.data);
      setStep(2);
    } catch (err) {
      toastError(err.response?.data?.error?.detail || t('import.uploadError', { defaultValue: 'Upload failed' }));
    } finally {
      setValidating(false);
    }
  };

  const handleStart = async () => {
    try {
      await api.post(`/admin/import/${jobResult.importJobId}/start`);
      setStep(4);
      setPollStatus({ status: 'importing' });

      intervalRef.current = setInterval(async () => {
        try {
          const res = await api.get(`/admin/import/${jobResult.importJobId}/status`);
          const status = res.data.data ?? res.data;
          setPollStatus(status);
          if (status.status === 'completed' || status.status === 'failed') {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            setStep(5);
          }
        } catch {
          // polling error — keep trying
        }
      }, 3000);
    } catch (err) {
      toastError(err.response?.data?.error?.detail || t('import.startError', { defaultValue: 'Could not start import' }));
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-700">
      <div>
        <h1 className="text-3xl font-bold text-warm-900 tracking-tight">
          {t('import.title', { defaultValue: 'Bulk Import' })}
        </h1>
        <p className="text-warm-500 mt-1">{t('import.subtitle', { defaultValue: 'Import children from a CSV file' })}</p>
      </div>

      <StepIndicator step={step} />

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="bg-surface border border-warm-200 rounded-lg p-6 space-y-5">
          <h2 className="text-lg font-semibold text-warm-900">
            {t('import.step1Title', { defaultValue: 'Upload CSV' })}
          </h2>
          <p className="text-sm text-warm-600">
            {t('import.requiredHeaders', { defaultValue: 'Required columns: firstName, lastName, dateOfBirth, gender, disabilityType, class, teacher, parentEmail' })}
          </p>
          <div className="space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-warm-700">
                {t('import.chooseFile', { defaultValue: 'Choose CSV file' })}
              </span>
              <input
                type="file"
                accept=".csv"
                data-testid="file-input"
                className="mt-1.5 block w-full text-sm text-warm-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {file ? (
              <p className="text-sm text-warm-600">{file.name}</p>
            ) : (
              <p className="text-sm text-warm-400">{t('import.noFile', { defaultValue: 'No file selected' })}</p>
            )}
          </div>
          <button
            onClick={handleValidate}
            disabled={!file || validating}
            data-testid="validate-btn"
            className="inline-flex items-center justify-center h-10 px-6 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-md transition-colors disabled:opacity-50"
          >
            {validating ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                {t('import.validating', { defaultValue: 'Validating…' })}
              </>
            ) : (
              t('import.validate', { defaultValue: 'Validate' })
            )}
          </button>
        </div>
      )}

      {/* Step 2: Validation Results */}
      {step === 2 && jobResult && (
        <div className="bg-surface border border-warm-200 rounded-lg p-6 space-y-5">
          <h2 className="text-lg font-semibold text-warm-900">
            {t('import.step2Title', { defaultValue: 'Validation Results' })}
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-warm-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-warm-900">{jobResult.totalRows}</p>
              <p className="text-sm text-warm-500">{t('import.totalRows', { count: jobResult.totalRows, defaultValue: 'Total rows: {{count}}' }).replace('{{count}}', jobResult.totalRows)}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{jobResult.validRows}</p>
              <p className="text-sm text-green-600">{t('import.validRows', { count: jobResult.validRows, defaultValue: 'Valid rows: {{count}}' }).replace('{{count}}', jobResult.validRows)}</p>
            </div>
            <div className={`${jobResult.invalidRows > 0 ? 'bg-red-50' : 'bg-warm-50'} rounded-lg p-4 text-center`}>
              <p className={`text-2xl font-bold ${jobResult.invalidRows > 0 ? 'text-red-700' : 'text-warm-900'}`}>{jobResult.invalidRows}</p>
              <p className={`text-sm ${jobResult.invalidRows > 0 ? 'text-red-600' : 'text-warm-500'}`}>{t('import.invalidRows', { count: jobResult.invalidRows, defaultValue: 'Invalid rows: {{count}}' }).replace('{{count}}', jobResult.invalidRows)}</p>
            </div>
          </div>

          {jobResult.invalidRows > 0 && jobResult.errors?.length > 0 && (
            <div>
              <button
                onClick={() => setShowErrors(v => !v)}
                className="text-sm text-brand-700 font-medium hover:underline"
              >
                {showErrors ? 'Hide errors' : `Show ${jobResult.errors.length} errors`}
              </button>
              {showErrors && (
                <div className="mt-3 border border-warm-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-warm-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-warm-600 font-medium">Row</th>
                        <th className="px-3 py-2 text-left text-warm-600 font-medium">Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-warm-100">
                      {jobResult.errors.map((e, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-warm-700">{e.row}</td>
                          <td className="px-3 py-2 text-warm-700">{humanizeCode(e.code)} {e.field ? `(${e.field})` : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={resetAll}
              className="inline-flex items-center justify-center h-10 px-4 text-sm font-medium border border-warm-300 text-warm-700 hover:bg-warm-50 rounded-md transition-colors"
            >
              {t('import.backBtn', { defaultValue: 'Back' })}
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={jobResult.validRows === 0}
              data-testid="continue-btn"
              className="inline-flex items-center justify-center h-10 px-6 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-md transition-colors disabled:opacity-50"
            >
              {t('import.continueBtn', { defaultValue: 'Continue with valid rows' })}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && jobResult && (
        <div className="bg-surface border border-warm-200 rounded-lg p-6 space-y-5">
          <h2 className="text-lg font-semibold text-warm-900">
            {t('import.step3Title', { defaultValue: 'Confirm Import' })}
          </h2>
          <p className="text-warm-700">
            {t('import.confirmTitle', { count: jobResult.validRows, defaultValue: 'Import {{count}} children?' }).replace('{{count}}', jobResult.validRows)}
          </p>
          {jobResult.invalidRows > 0 && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-4 py-3">
              {t('import.skipWarning', { count: jobResult.invalidRows, defaultValue: '{{count}} rows will be skipped due to validation errors.' }).replace('{{count}}', jobResult.invalidRows)}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={resetAll}
              className="inline-flex items-center justify-center h-10 px-4 text-sm font-medium border border-warm-300 text-warm-700 hover:bg-warm-50 rounded-md transition-colors"
            >
              {t('import.cancel', { defaultValue: 'Cancel' })}
            </button>
            <button
              onClick={handleStart}
              data-testid="start-btn"
              className="inline-flex items-center justify-center h-10 px-6 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-md transition-colors"
            >
              {t('import.startBtn', { defaultValue: 'Start Import' })}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Polling */}
      {step === 4 && (
        <div className="bg-surface border border-warm-200 rounded-lg p-10 text-center space-y-4">
          <LoadingSpinner size="lg" />
          <h2 className="text-lg font-semibold text-warm-900">
            {t('import.step4Title', { defaultValue: 'Importing…' })}
          </h2>
          <p className="text-sm text-warm-500" data-testid="polling-status">
            {t('import.polling', { defaultValue: 'Import in progress…' })}
          </p>
        </div>
      )}

      {/* Step 5: Result */}
      {step === 5 && pollStatus && (
        <div className="bg-surface border border-warm-200 rounded-lg p-10 text-center space-y-4">
          <h2 className="text-lg font-semibold text-warm-900">
            {pollStatus.status === 'completed'
              ? t('import.completed', { defaultValue: 'Import complete' })
              : t('import.failed', { defaultValue: 'Import failed' })}
          </h2>
          {pollStatus.status === 'completed' && (
            <p className="text-warm-700" data-testid="result-success">
              {t('import.resultSuccess', { count: pollStatus.validRows ?? jobResult?.validRows ?? 0, defaultValue: '{{count}} children imported successfully.' }).replace('{{count}}', pollStatus.validRows ?? jobResult?.validRows ?? 0)}
            </p>
          )}
          {pollStatus.status === 'failed' && (
            <p className="text-red-700">
              {t('import.failed', { defaultValue: 'Import failed' })}
            </p>
          )}
          <button
            onClick={resetAll}
            data-testid="new-import-btn"
            className="inline-flex items-center justify-center h-10 px-6 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-md transition-colors"
          >
            {t('import.newImport', { defaultValue: 'New Import' })}
          </button>
        </div>
      )}
    </div>
  );
};

export default BulkImport;
