import { useMemo, useState } from 'react';
import type { ClarifyCard as ClarifyCardType, ClarifyQuestion } from '../types';
import { useT } from '../i18n';
import styles from './ClarifyCard.module.css';

interface Props {
  card: ClarifyCardType;
  disabled?: boolean;
  onSubmit: (values: Record<string, string | string[] | boolean | number>) => void;
  onDirect: (values: Record<string, string | string[] | boolean | number>) => void;
}

type Value = string | string[] | boolean | number;

export default function ClarifyCard({ card, disabled = false, onSubmit, onDirect }: Props) {
  const { t } = useT();
  const initialValues = useMemo(
    () => ({ ...card.defaults }),
    [card.defaults],
  );
  const [values, setValues] = useState<Record<string, Value>>(initialValues);
  const [touched, setTouched] = useState<Set<string>>(() => new Set());

  const update = (id: string, value: Value) => {
    setValues(prev => ({ ...prev, [id]: value }));
    setTouched(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const selectedValues = () => {
    const next: Record<string, Value> = {};
    for (const id of touched) {
      if (id in values) next[id] = values[id];
    }
    return next;
  };

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <span className={styles.marker}>Spec</span>
        <div>
          <p className={styles.title}>{card.title}</p>
          <p className={styles.reason}>{card.reason}</p>
        </div>
      </div>

      <div className={styles.questions}>
        {card.questions.map(question => (
          <QuestionControl
            key={question.id}
            question={question}
            value={values[question.id] ?? question.defaultValue}
            onChange={value => update(question.id, value)}
            disabled={disabled}
          />
        ))}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          onClick={() => onSubmit(selectedValues())}
          disabled={disabled}
        >
          {card.actions.primary || t('clarify.generateWithOptions')}
        </button>
        <button
          type="button"
          className={styles.secondary}
          onClick={() => onDirect({})}
          disabled={disabled}
        >
          {card.actions.secondary || t('clarify.direct')}
        </button>
      </div>
    </div>
  );
}

function QuestionControl({
  question,
  value,
  onChange,
  disabled,
}: {
  question: ClarifyQuestion;
  value: Value;
  onChange: (value: Value) => void;
  disabled: boolean;
}) {
  if (question.type === 'multi_select') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className={styles.question}>
        <p className={styles.label}>{question.label}</p>
        <div className={styles.optionGrid}>
          {(question.options || []).map(option => {
            const active = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                className={`${styles.option} ${active ? styles.optionActive : ''}`}
                onClick={() => {
                  onChange(active
                    ? selected.filter(item => item !== option.value)
                    : [...selected, option.value]);
                }}
                disabled={disabled}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (question.type === 'single_select') {
    return (
      <div className={styles.question}>
        <p className={styles.label}>{question.label}</p>
        <div className={styles.optionGrid}>
          {(question.options || []).map(option => {
            const active = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className={`${styles.option} ${active ? styles.optionActive : ''}`}
                onClick={() => onChange(option.value)}
                disabled={disabled}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (question.type === 'toggle') {
    return (
      <label className={styles.toggle}>
        <span>{question.label}</span>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={event => onChange(event.target.checked)}
          disabled={disabled}
        />
      </label>
    );
  }

  return (
    <label className={styles.field}>
      <span>{question.label}</span>
      <input
        type={question.type === 'number' ? 'number' : 'text'}
        value={String(value ?? '')}
        onChange={event => onChange(question.type === 'number' ? Number(event.target.value) : event.target.value)}
        disabled={disabled}
      />
    </label>
  );
}
