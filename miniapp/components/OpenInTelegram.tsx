'use client';

import { getTelegramBotName } from "../lib/env";
import styles from "../styles/panels.module.css";

export function OpenInTelegramScreen() {
  const botName = getTelegramBotName();
  return (
    <section className={styles.card} data-variant="error">
      <h2 className={styles.cardTitle}>Open in Telegram</h2>
      <p className={styles.cardBody}>
        This companion experience runs inside the Telegram app for a secure sign-in. Launch it
        from the {botName ? `@${botName}` : "Quadrant"} bot to continue.
      </p>
    </section>
  );
}
