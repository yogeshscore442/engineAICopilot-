import { useApp } from '../AppContext';

export default function Disclaimer() {
  const { t } = useApp();

  return (
    <div className="bg-warning-bg border-t border-warning-border px-4 py-3 mt-6">
      <div className="max-w-2xl mx-auto">
        <p className="text-sm text-warning-text leading-relaxed">
          <span className="font-semibold">Disclaimer:</span> {t('common.disclaimer')}
        </p>
        <p className="text-xs text-warning-text/80 mt-1">
          {t('common.aiGenerated')}
        </p>
      </div>
    </div>
  );
}