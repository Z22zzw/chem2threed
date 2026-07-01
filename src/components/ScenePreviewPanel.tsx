import type { DeployDonePayload, GenerationStatus, PreviewReadyPayload, SceneErrorPayload, SceneSpec } from '../types';
import { useT } from '../i18n';
import styles from './ScenePreviewPanel.module.css';

interface Props {
  status?: GenerationStatus;
  preview?: PreviewReadyPayload;
  deploy?: DeployDonePayload;
  sceneSpec?: SceneSpec;
  error?: SceneErrorPayload;
  deploying: boolean;
  onShowDebug: () => void;
  onRegenerate: () => void;
}

export default function ScenePreviewPanel({
  status,
  preview,
  deploy,
  sceneSpec,
  error,
  deploying,
  onShowDebug,
  onRegenerate,
}: Props) {
  const { t } = useT();
  const progress = Math.round((status?.progress ?? (preview ? 0.8 : 0)) * 100);

  const handleCopy = async () => {
    if (!deploy?.url) return;
    await navigator.clipboard?.writeText(deploy.url).catch(() => undefined);
  };

  const handleDownload = () => {
    if (!preview?.htmlContent) return;
    const blob = new Blob([preview.htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${preview.sceneId || 'chemscene'}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>{t('preview.kicker')}</p>
          <h2>{preview?.title || t('preview.title')}</h2>
        </div>
        <button type="button" className={styles.debugBtn} onClick={onShowDebug}>
          {t('preview.debug')}
        </button>
      </header>

      <section className={styles.statusStrip}>
        <div className={styles.progressTrack}>
          <span style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
        <div className={styles.statusText}>
          <strong>{status?.label || t('preview.idle')}</strong>
          <span>{status?.detail || sceneSpec?.templateId || t('preview.idleHint')}</span>
        </div>
      </section>

      <main className={styles.body}>
        {error ? (
          <div className={styles.errorBox}>
            <p className={styles.errorTitle}>{t('preview.error')}</p>
            <p>{error.message}</p>
            {error.suggestion && <small>{error.suggestion}</small>}
          </div>
        ) : preview?.htmlContent ? (
          <iframe
            title={preview.title}
            className={styles.iframe}
            srcDoc={preview.htmlContent}
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        ) : (
          <div className={styles.empty}>
            <div className={styles.gridIcon}>
              <span />
              <span />
              <span />
              <span />
            </div>
            <p className={styles.emptyTitle}>{t('preview.emptyTitle')}</p>
            <p className={styles.emptyHint}>{t('preview.emptyHint')}</p>
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <div className={styles.meta}>
          <span>{sceneSpec?.templateId || 'template pending'}</span>
          <span>{preview?.sceneId || 'scene pending'}</span>
        </div>
        <div className={styles.actions}>
          <button type="button" onClick={onRegenerate} disabled={!preview || deploying}>
            {t('preview.regenerate')}
          </button>
          <button type="button" onClick={handleDownload} disabled={!preview}>
            {t('preview.download')}
          </button>
          <button type="button" onClick={handleCopy} disabled={!deploy?.url}>
            {deploy?.url ? t('preview.copyLink') : t('preview.waitDeploy')}
          </button>
        </div>
        {deploy?.url && (
          <a className={styles.link} href={deploy.url} target="_blank" rel="noreferrer">
            {deploy.url}
          </a>
        )}
      </footer>
    </div>
  );
}
