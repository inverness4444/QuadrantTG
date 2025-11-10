import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import * as SecureStore from "expo-secure-store";

const STORAGE_KEY = "quadrant_level_progress_v1";
const LEVEL_STEP = 200;
const COURSE_XP_REWARD = 150;
const BOOK_XP_REWARD = 90;
const LEVEL_TITLES: string[] = ["novice", "pathfinder", "scholar", "strategist", "luminary"];

type LevelStorage = {
  xp: number;
  completedCourseIds: string[];
  completedBookIds: string[];
};

type LevelContextValue = {
  xp: number;
  level: number;
  currentLevelXp: number;
  levelXpTarget: number;
  xpToNextLevel: number;
  stageKey: string;
  progress: number;
  completedCourseIds: string[];
  completedBookIds: string[];
  courseXpReward: number;
  bookXpReward: number;
  markCourseComplete: (courseId: string) => boolean;
  markBookComplete: (bookId: string) => boolean;
  resetProgress: () => void;
};

const LevelContext = createContext<LevelContextValue | undefined>(undefined);

const getStageKeyForLevel = (level: number) =>
  LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];

const calculateLevelData = (xp: number) => {
  const level = Math.floor(xp / LEVEL_STEP) + 1;
  const currentLevelXp = xp % LEVEL_STEP;
  const levelXpTarget = LEVEL_STEP;
  const xpToNextLevel = Math.max(0, levelXpTarget - currentLevelXp);
  const stageKey = getStageKeyForLevel(level);
  const progress = Math.min(1, currentLevelXp / levelXpTarget);
  return { level, currentLevelXp, levelXpTarget, xpToNextLevel, stageKey, progress };
};

type LevelProviderProps = {
  children: React.ReactNode;
};

export const LevelProvider = ({ children }: LevelProviderProps) => {
  const [storage, setStorage] = useState<LevelStorage>({
    xp: 0,
    completedCourseIds: [],
    completedBookIds: []
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadProgress = async () => {
      try {
        const raw = await SecureStore.getItemAsync(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as LevelStorage;
          if (mounted) {
            setStorage(parsed);
          }
        }
      } catch (error) {
        console.warn("Failed to load level progress", error);
      } finally {
        if (mounted) {
          setIsLoaded(true);
        }
      }
    };
    loadProgress();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(storage)).catch((error) => {
      console.warn("Failed to persist level progress", error);
    });
  }, [storage, isLoaded]);

  const markCourseComplete = useCallback((courseId: string) => {
    if (!courseId) {
      return false;
    }
    const normalized = courseId.trim();
    if (!normalized) {
      return false;
    }
    let added = false;
    setStorage((prev) => {
      if (prev.completedCourseIds.includes(normalized)) {
        return prev;
      }
      added = true;
      return {
        xp: prev.xp + COURSE_XP_REWARD,
        completedCourseIds: [normalized, ...prev.completedCourseIds],
        completedBookIds: prev.completedBookIds
      };
    });
    return added;
  }, []);

  const markBookComplete = useCallback((bookId: string) => {
    if (!bookId) {
      return false;
    }
    const normalized = bookId.trim();
    if (!normalized) {
      return false;
    }
    let added = false;
    setStorage((prev) => {
      if (prev.completedBookIds.includes(normalized)) {
        return prev;
      }
      added = true;
      return {
        xp: prev.xp + BOOK_XP_REWARD,
        completedCourseIds: prev.completedCourseIds,
        completedBookIds: [normalized, ...prev.completedBookIds]
      };
    });
    return added;
  }, []);

  const resetProgress = useCallback(() => {
    setStorage({
      xp: 0,
      completedCourseIds: [],
      completedBookIds: []
    });
  }, []);

  const levelData = useMemo(() => calculateLevelData(storage.xp), [storage.xp]);

  const value = useMemo<LevelContextValue>(
    () => ({
      xp: storage.xp,
      level: levelData.level,
      currentLevelXp: levelData.currentLevelXp,
      levelXpTarget: levelData.levelXpTarget,
      xpToNextLevel: levelData.xpToNextLevel,
      stageKey: levelData.stageKey,
      progress: levelData.progress,
      completedCourseIds: storage.completedCourseIds,
      completedBookIds: storage.completedBookIds,
      courseXpReward: COURSE_XP_REWARD,
      bookXpReward: BOOK_XP_REWARD,
      markCourseComplete,
      markBookComplete,
      resetProgress
    }),
    [
      storage.xp,
      storage.completedCourseIds,
      storage.completedBookIds,
      levelData,
      markCourseComplete,
      markBookComplete,
      resetProgress
    ]
  );

  return <LevelContext.Provider value={value}>{children}</LevelContext.Provider>;
};

export const useLevelContext = () => {
  const ctx = useContext(LevelContext);
  if (!ctx) {
    throw new Error("useLevelContext must be used within a LevelProvider");
  }
  return ctx;
};
