'use client';

import styles from "../styles/panels.module.css";

export function LoadingScreen({ label = "Preparing your Quadrant journey..." }: { label?: string }) {
  return (
    <section className={styles.card} aria-live="polite">
      <p className={styles.cardBody}>{label}</p>
    </section>
  );
}
