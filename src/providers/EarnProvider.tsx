import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { earnTasks as defaultEarnTasks } from "../constants/data";
import { useLocalization } from "../hooks/useLocalization";

type EarnTaskEntry = {
  id: string;
  icon: string;
  title: string;
  reward: string;
  limits: string;
  verification: string;
  isActive: boolean;
};

type EarnTasksByLocale = Record<string, EarnTaskEntry[]>;

type EarnContextValue = {
  isReady: boolean;
  tasks: EarnTaskEntry[];
  saveTask: (task: EarnTaskEntry, originalId?: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
};

type EarnProviderProps = {
  children: React.ReactNode;
};

const STORAGE_KEY = "@quadrant/earn_tasks_v1";

const EarnContext = createContext<EarnContextValue | undefined>(undefined);

const sanitizeTask = (task: EarnTaskEntry): EarnTaskEntry => ({
  id: task.id.trim(),
  icon: task.icon.trim(),
  title: task.title.trim(),
  reward: task.reward.trim(),
  limits: task.limits.trim(),
  verification: task.verification.trim(),
  isActive: Boolean(task.isActive)
});

const buildDefaultTasks = (translate: (key: string) => string): EarnTaskEntry[] =>
  defaultEarnTasks.map((task) => ({
    id: task.id,
    icon: task.icon,
    title: translate(task.titleKey),
    reward: translate(task.rewardKey),
    limits: translate(task.limitsKey),
    verification: translate(task.verificationKey),
    isActive: true
  }));

export const EarnProvider = ({ children }: EarnProviderProps) => {
  const { language, t } = useLocalization();
  const [tasksByLocale, setTasksByLocale] = useState<EarnTasksByLocale>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value: string | null) => {
        if (!value) {
          return;
        }
        try {
          const parsed = JSON.parse(value) as EarnTasksByLocale;
          if (parsed && typeof parsed === "object") {
            setTasksByLocale(parsed);
          }
        } catch (error) {
          console.warn("Failed to parse stored Earn tasks", error);
        }
      })
      .catch((error: unknown) => {
        console.warn("Failed to load stored Earn tasks", error);
      })
      .finally(() => setIsLoaded(true));
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    setTasksByLocale((prev) => {
      if (prev[language]) {
        return prev;
      }
      return {
        ...prev,
        [language]: buildDefaultTasks(t)
      };
    });
  }, [isLoaded, language, t]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasksByLocale)).catch((error: unknown) => {
      console.warn("Failed to persist Earn tasks", error);
    });
  }, [tasksByLocale, isLoaded]);

  const tasks = useMemo(() => tasksByLocale[language] ?? [], [language, tasksByLocale]);
  const isReady = isLoaded && tasksByLocale[language] !== undefined;

  const saveTask = useCallback(
    async (task: EarnTaskEntry, originalId?: string) => {
      const normalized = sanitizeTask(task);
      if (normalized.id.length === 0) {
        throw new Error("earn_task_invalid_id");
      }
      const targetId = originalId ?? normalized.id;
      const duplicate = tasks.some(
        (item) => item.id === normalized.id && item.id !== targetId
      );
      if (duplicate) {
        throw new Error("earn_task_duplicate_id");
      }
      setTasksByLocale((prev) => {
        const current = prev[language] ?? [];
        const nextList = [...current];
        const existingIndex = current.findIndex((item) => item.id === targetId);
        if (existingIndex >= 0) {
          nextList[existingIndex] = normalized;
        } else {
          nextList.push(normalized);
        }
        return {
          ...prev,
          [language]: nextList
        };
      });
    },
    [language, tasks]
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      setTasksByLocale((prev) => {
        const current = prev[language] ?? [];
        const nextList = current.filter((item) => item.id !== taskId);
        return {
          ...prev,
          [language]: nextList
        };
      });
    },
    [language]
  );

  const value = useMemo<EarnContextValue>(
    () => ({
      isReady,
      tasks,
      saveTask,
      deleteTask
    }),
    [isReady, tasks, saveTask, deleteTask]
  );

  return <EarnContext.Provider value={value}>{children}</EarnContext.Provider>;
};

export const useEarnContext = () => {
  const context = useContext(EarnContext);
  if (!context) {
    throw new Error("useEarnContext must be used within an EarnProvider");
  }
  return context;
};

export type { EarnTaskEntry };
