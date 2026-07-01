import { useState, useRef, useCallback, KeyboardEvent, ChangeEvent } from 'react';
import { useT, MessageKeys } from '../i18n';
import { uploadAttachment } from '../api';
import type { AttachmentMeta } from '../types';
import styles from './ChatInput.module.css';

interface Props {
  onSend: (text: string, attachments?: AttachmentMeta[]) => void;
  onStop: () => void;
  onClear: () => void;
  disabled: boolean;
}

const PRESET_KEYS: MessageKeys[] = ['preset.1', 'preset.2'];

export default function ChatInput({ onSend, onStop, onClear, disabled }: Props) {
  const { t } = useT();
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([]);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if ((!trimmed && attachments.length === 0) || disabled || uploading) return;
    onSend(trimmed || t('chat.attachmentOnly'), attachments);
    setValue('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [attachments, disabled, onSend, t, uploading, value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  };

  const handlePreset = (text: string) => {
    if (disabled) return;
    onSend(text);
  };

  const handlePickFiles = () => {
    if (disabled || uploading) return;
    fileInputRef.current?.click();
  };

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).slice(0, 5);
    event.target.value = '';
    if (files.length === 0) return;
    setUploading(true);

    const uploaded: AttachmentMeta[] = [];
    for (const file of files) {
      try {
        const base64 = await fileToDataUrl(file);
        const type: 'image' | 'file' = file.type.startsWith('image/') ? 'image' : 'file';
        const meta = await uploadAttachment({
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          type,
          base64,
        });
        uploaded.push({
          ...meta,
          dataUrl: type === 'image' ? base64 : undefined,
        });
      } catch (error) {
        const type: 'image' | 'file' = file.type.startsWith('image/') ? 'image' : 'file';
        uploaded.push({
          id: crypto.randomUUID(),
          type,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          error: error instanceof Error ? error.message : String(error),
          summary: t('chat.uploadFallback'),
        });
      }
    }

    setAttachments(prev => [...prev, ...uploaded].slice(0, 5));
    setUploading(false);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className={styles.bar}>
      <div className={styles.presets}>
        {PRESET_KEYS.map(key => (
          <button
            key={key}
            className={styles.presetChip}
            onClick={() => handlePreset(t(key))}
            disabled={disabled}
          >
            {t(key)}
          </button>
        ))}
      </div>

      {attachments.length > 0 && (
        <div className={styles.attachments} aria-label={t('chat.attachments')}>
          {attachments.map(item => (
            <div key={item.id} className={`${styles.attachment} ${item.error ? styles.attachmentError : ''}`}>
              <span className={styles.attachmentIcon}>{item.type === 'image' ? 'IMG' : 'DOC'}</span>
              <span className={styles.attachmentText}>
                <strong>{item.fileName}</strong>
                <small>{item.error || item.summary || `${Math.round(item.size / 1024)} KB`}</small>
              </span>
              <button
                type="button"
                className={styles.removeAttachment}
                onClick={() => removeAttachment(item.id)}
                aria-label={t('aria.removeAttachment')}
                disabled={disabled}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={`${styles.inputWrap} ${disabled ? styles.inputDisabled : ''}`}>
        <input
          ref={fileInputRef}
          className={styles.fileInput}
          type="file"
          accept=".png,.jpg,.jpeg,.pdf,.txt,.docx,image/png,image/jpeg,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          multiple
          onChange={handleFiles}
          disabled={disabled || uploading}
        />
        <button
          className={styles.attachBtn}
          onClick={handlePickFiles}
          disabled={disabled || uploading || attachments.length >= 5}
          aria-label={t('aria.attachFile')}
          title={t('aria.attachFile')}
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="none" width="17" height="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 1 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.82-2.83l8.48-8.48" />
          </svg>
        </button>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          placeholder={uploading ? t('chat.uploading') : t("chat.placeholder")}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          rows={1}
          disabled={disabled}
        />
        <button
          className={`${styles.sendBtn} ${((!value.trim() && attachments.length === 0) || disabled || uploading) ? styles.sendDisabled : ''}`}
          onClick={handleSend}
          disabled={(!value.trim() && attachments.length === 0) || disabled || uploading}
          aria-label={t("aria.send")}
        >
          <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
            <path d="M3 10L17 3l-4 7 4 7L3 10z" fill="currentColor"/>
          </svg>
        </button>
        <button
          className={styles.clearBtn}
          onClick={onClear}
          disabled={disabled}
          aria-label={t("aria.clearHistory")}
          title={t("aria.clearHistory")}
        >
          <svg viewBox="0 0 24 24" fill="none" width="16" height="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6"/>
            <path d="M14 11v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
        {disabled && (
          <button
            className={styles.stopBtn}
            onClick={onStop}
            aria-label={t("aria.stopGeneration")}
            title={t("aria.stopGeneration")}
          >
            <svg viewBox="0 0 20 20" fill="none" width="14" height="14">
              <rect x="4" y="4" width="12" height="12" rx="2" fill="currentColor"/>
            </svg>
          </button>
        )}
      </div>
      <p className={styles.hint}>{t("chat.hint")}</p>
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
