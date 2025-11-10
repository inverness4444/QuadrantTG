'use client';

import type { ContentBundle, UserPublic } from "../types/api";
import styles from "../styles/panels.module.css";

interface DashboardProps {
  user: UserPublic;
  content: ContentBundle;
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) return "Self-paced";
  if (minutes < 90) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

export function Dashboard({ user, content }: DashboardProps) {
  const featuredCourses = content.courses.slice(0, 3);
  const featuredBooks = content.books.slice(0, 3);

  return (
    <div className={styles.container}>
      <section className={`${styles.card} ${styles.hero}`}>
        <div className={styles.statusBadge}>Session secured</div>
        <h1 className={styles.heroTitle}>
          Welcome back, <span className={styles.heroHighlight}>{user.first_name || "Explorer"}</span>
        </h1>
        <p className={styles.heroBody}>
          Your progress, rewards, and reading queue stay in sync with the Quadrant mobile app.
          Dive into a course or keep your reading streak alive right inside Telegram.
        </p>
        <div className={styles.heroMetrics}>
          <div className={styles.metric}>
            <span className={styles.metricValue}>{Math.floor(user.app_seconds_spent / 60)}</span>
            <span className={styles.metricLabel}>minutes learned</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricValue}>{content.courses.length}</span>
            <span className={styles.metricLabel}>courses unlocked</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricValue}>{content.books.length}</span>
            <span className={styles.metricLabel}>library picks</span>
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>Courses to continue</h2>
          <p className={styles.headerSubtitle}>Curated to match your streak and difficulty preference.</p>
        </div>
        <div className={styles.grid}>
          {featuredCourses.map((course) => (
            <article className={styles.tile} key={course.id}>
              <span className={styles.tileTag}>{course.difficulty.toUpperCase()}</span>
              <h3 className={styles.tileTitle}>{course.title}</h3>
              <p className={styles.tileMeta}>{formatDuration(course.duration_minutes)}</p>
              {course.summary ? <p className={styles.cardBody}>{course.summary}</p> : null}
            </article>
          ))}
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>Reading queue</h2>
          <p className={styles.headerSubtitle}>Stay on track with a focused set of wellness and productivity reads.</p>
        </div>
        <div className={styles.grid}>
          {featuredBooks.map((book) => (
            <article className={styles.tile} key={book.id}>
              <span className={styles.tileTag}>{book.category?.label ?? "Featured"}</span>
              <h3 className={styles.tileTitle}>{book.title}</h3>
              <p className={styles.tileMeta}>{book.author ?? "Unknown author"}</p>
              {book.synopsis ? <p className={styles.cardBody}>{book.synopsis}</p> : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
