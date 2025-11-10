'use client';

import styles from "../styles/panels.module.css";

interface ErrorCardProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorCard({ title = "Something went wrong", message, onRetry }: ErrorCardProps) {
  return (
    <section className={styles.card} data-variant="error">
      <h2 className={styles.cardTitle}>{title}</h2>
      <p className={styles.cardBody}>{message}</p>
      {onRetry ? (
        <button className={styles.primaryButton} onClick={onRetry} type="button">
          Retry request
        </button>
      ) : null}
    </section>
  );
}
