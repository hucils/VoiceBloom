import { House } from 'lucide-react';

import { ButtonLink } from '../components/Button';
import { Card } from '../components/Card';
import { useI18n } from '../i18n/I18nContext';

export function NotFoundPage() {
  const { t } = useI18n();
  return (
    <Card className="mx-auto max-w-md text-center">
      <h1 className="text-2xl text-ink">{t('common.notFoundTitle')}</h1>
      <p className="mt-2 text-ink-muted">{t('common.notFoundBody')}</p>
      <ButtonLink to="/" icon={House} className="mt-5">
        {t('common.goHome')}
      </ButtonLink>
    </Card>
  );
}
