import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import * as SecureStore from "expo-secure-store";

const STORAGE_KEY = "quadrant_daily_streak_v1";
const CALENDAR_DAYS = 14;
const BOOK_PAGE_REQUIREMENT = 50;
const COURSE_MINUTE_REQUIREMENT = 30;

type DailyStreakStorage = {
  completedDates: string[];
  lastCompletionDate?: string;
  streakCount: number;
};

export type DailyStreakCalendarDay = {
  date: string;
  dayLabel: string;
  weekdayLabel: string;
  completed: boolean;
  isToday: boolean;
};

export type StreakFailureReason = "alreadyCompleted" | "insufficientPages" | "insufficientMinutes";

export type StreakCompletionResult = {
  awarded: boolean;
  reward: number;
  streak: number;
  reason?: StreakFailureReason;
};

type DailyStreakContextValue = {
  streakCount: number;
  todayCompleted: boolean;
  nextReward: number;
  calendarDays: DailyStreakCalendarDay[];
  requiredBookPages: number;
  requiredCourseMinutes: number;
  registerBookCompletion: (pagesRead: number) => StreakCompletionResult;
  registerCourseCompletion: (minutesSpent: number) => StreakCompletionResult;
};

const DailyStreakContext = createContext<DailyStreakContextValue | undefined>(undefined);

const getTodayKey = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString().split("T")[0]!;
};

const getDateKey = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString().split("T")[0]!;
};

const diffInDays = (later: string, earlier?: string) => {
  if (!earlier) {
    return undefined;
  }
  const laterDate = new Date(later);
  const earlierDate = new Date(earlier);
  const diffMs = laterDate.getTime() - earlierDate.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

const buildCalendarDays = (completedSet: Set<string>) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const formatter = new Intl.DateTimeFormat(undefined, { weekday: "short" });

  const days: DailyStreakCalendarDay[] = [];
  for (let i = CALENDAR_DAYS - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = getDateKey(date);
    const dayLabel = String(date.getDate());
    const weekdayLabel = formatter.format(date);
    days.push({
      date: key,
      dayLabel,
      weekdayLabel,
      completed: completedSet.has(key),
      isToday: key === getTodayKey()
    });
  }
  return days;
};

const initialStorage: DailyStreakStorage = {
  completedDates: [],
  lastCompletionDate: undefined,
  streakCount: 0
};

type DailyStreakProviderProps = {
  children: React.ReactNode;
};

export const DailyStreakProvider = ({ children }: DailyStreakProviderProps) => {
  const [storage, setStorage] = useState<DailyStreakStorage>(initialStorage);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadStorage = async () => {
      try {
        const raw = await SecureStore.getItemAsync(STORAGE_KEY);
        if (raw && mounted) {
          const parsed = JSON.parse(raw) as DailyStreakStorage;
          setStorage({
            streakCount: parsed.streakCount ?? 0,
            lastCompletionDate: parsed.lastCompletionDate,
            completedDates: Array.isArray(parsed.completedDates) ? parsed.completedDates : []
          });
        }
      } catch (error) {
        console.warn("Failed to load daily streak", error);
      } finally {
        if (mounted) {
          setIsLoaded(true);
        }
      }
    };
    loadStorage();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(storage)).catch((error) => {
      console.warn("Failed to persist daily streak", error);
    });
  }, [storage, isLoaded]);

  const registerCompletion = useCallback((): StreakCompletionResult => {
    const todayKey = getTodayKey();
    let result: StreakCompletionResult = {
      awarded: false,
      reward: 0,
      streak: storage.streakCount
    };

    setStorage((prev) => {
      if (prev.completedDates.includes(todayKey)) {
        result = {
          awarded: false,
          reward: 0,
          streak: prev.streakCount,
          reason: "alreadyCompleted"
        };
        return prev;
      }

      let newStreak = 1;
      const daysDiff = diffInDays(todayKey, prev.lastCompletionDate);
      if (daysDiff === 1) {
        newStreak = prev.streakCount + 1;
      } else if (daysDiff === 0) {
        result = {
          awarded: false,
          reward: 0,
          streak: prev.streakCount,
          reason: "alreadyCompleted"
        };
        return prev;
      }

      const updatedSet = new Set(prev.completedDates);
      updatedSet.add(todayKey);
      const sorted = Array.from(updatedSet).sort();

      result = {
        awarded: true,
        reward: newStreak,
        streak: newStreak
      };

      return {
        completedDates: sorted,
        lastCompletionDate: todayKey,
        streakCount: newStreak
      };
    });

    return result;
  }, [storage.streakCount]);

  const registerBookCompletion = useCallback(
    (pagesRead: number): StreakCompletionResult => {
      if (!Number.isFinite(pagesRead) || pagesRead < BOOK_PAGE_REQUIREMENT) {
        return {
          awarded: false,
          reward: 0,
          streak: storage.streakCount,
          reason: "insufficientPages"
        };
      }
      return registerCompletion();
    },
    [registerCompletion, storage.streakCount]
  );

  const registerCourseCompletion = useCallback(
    (minutesSpent: number): StreakCompletionResult => {
      if (!Number.isFinite(minutesSpent) || minutesSpent < COURSE_MINUTE_REQUIREMENT) {
        return {
          awarded: false,
          reward: 0,
          streak: storage.streakCount,
          reason: "insufficientMinutes"
        };
      }
      return registerCompletion();
    },
    [registerCompletion, storage.streakCount]
  );

  const completedSet = useMemo(() => new Set(storage.completedDates), [storage.completedDates]);
  const calendarDays = useMemo(() => buildCalendarDays(completedSet), [completedSet]);
  const todayKey = getTodayKey();

  const value = useMemo<DailyStreakContextValue>(
    () => ({
      streakCount: storage.streakCount,
      todayCompleted: completedSet.has(todayKey),
      nextReward: storage.streakCount + 1,
      calendarDays,
      requiredBookPages: BOOK_PAGE_REQUIREMENT,
      requiredCourseMinutes: COURSE_MINUTE_REQUIREMENT,
      registerBookCompletion,
      registerCourseCompletion
    }),
    [
      storage.streakCount,
      completedSet,
      todayKey,
      calendarDays,
      registerBookCompletion,
      registerCourseCompletion
    ]
  );

  return <DailyStreakContext.Provider value={value}>{children}</DailyStreakContext.Provider>;
};

export const useDailyStreakContext = () => {
  const ctx = useContext(DailyStreakContext);
  if (!ctx) {
    throw new Error("useDailyStreakContext must be used within a DailyStreakProvider");
  }
  return ctx;
};
