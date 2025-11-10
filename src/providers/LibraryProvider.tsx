import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type LibraryContextValue = {
  ownedBookIds: string[];
  progressBookIds: string[];
  addBookToLibrary: (bookId: string) => boolean;
  isBookOwned: (bookId: string) => boolean;
  isBookInProgress: (bookId: string) => boolean;
  getCompletedChapterIndex: (bookId: string) => number;
  completeChapter: (
    bookId: string,
    chapterIndex: number,
    chapterCount: number
  ) => {
    updated: boolean;
    completedAll: boolean;
  };
  setBookChapterTotal: (bookId: string, totalChapters: number) => void;
  getBookProgress: (
    bookId: string,
    totalChapters: number
  ) => {
    completedChapters: number;
    totalChapters: number;
    progress: number;
  };
};

const LibraryContext = createContext<LibraryContextValue | undefined>(undefined);

type LibraryProviderProps = {
  children: React.ReactNode;
};

export const LibraryProvider = ({ children }: LibraryProviderProps) => {
  const [ownedBookIds, setOwnedBookIds] = useState<string[]>([]);
  const [progressBookIds, setProgressBookIds] = useState<string[]>([]);
  const [bookChapterProgress, setBookChapterProgress] = useState<Record<string, number>>({});
  const [bookChapterTotals, setBookChapterTotals] = useState<Record<string, number>>({});

  const isBookOwned = useCallback(
    (bookId: string) => {
      const normalized = bookId.trim();
      return normalized.length > 0 && ownedBookIds.includes(normalized);
    },
    [ownedBookIds]
  );

  const isBookInProgress = useCallback(
    (bookId: string) => {
      const normalized = bookId.trim();
      return normalized.length > 0 && progressBookIds.includes(normalized);
    },
    [progressBookIds]
  );

  const addBookToLibrary = useCallback(
    (bookId: string) => {
      const normalized = bookId.trim();
      if (normalized.length === 0) {
        return false;
      }
      let added = false;

      setOwnedBookIds((prev) => {
        if (prev.includes(normalized)) {
          return prev;
        }
        added = true;
        return [...prev, normalized];
      });

      setProgressBookIds((prev) => (prev.includes(normalized) ? prev : [...prev, normalized]));
      setBookChapterProgress((prev) => {
        if (Object.prototype.hasOwnProperty.call(prev, normalized)) {
          return prev;
        }
        return {
          ...prev,
          [normalized]: -1
        };
      });
      setBookChapterTotals((prev) => {
        if (Object.prototype.hasOwnProperty.call(prev, normalized)) {
          return prev;
        }
        return {
          ...prev,
          [normalized]: 0
        };
      });

      return added;
    },
    []
  );

  const getCompletedChapterIndex = useCallback(
    (bookId: string) => {
      const normalized = bookId.trim();
      if (normalized.length === 0) {
        return -1;
      }
      const stored = bookChapterProgress[normalized];
      return typeof stored === "number" ? stored : -1;
    },
    [bookChapterProgress]
  );

  const completeChapter = useCallback(
    (bookId: string, chapterIndex: number, chapterCount: number) => {
      const normalized = bookId.trim();
      if (normalized.length === 0 || chapterCount <= 0 || chapterIndex < 0) {
        return { updated: false, completedAll: false };
      }

      let result = { updated: false, completedAll: false };

      setBookChapterProgress((prev) => {
        const previousCompleted =
          typeof prev[normalized] === "number" ? prev[normalized] : -1;
        const maxUnlocked = Math.min(previousCompleted + 1, chapterCount - 1);

        if (chapterIndex > maxUnlocked || chapterIndex <= previousCompleted) {
          return prev;
        }

        const nextCompleted = Math.min(chapterIndex, chapterCount - 1);
        result = {
          updated: true,
          completedAll: nextCompleted >= chapterCount - 1
        };

        return {
          ...prev,
          [normalized]: nextCompleted
        };
      });

      setBookChapterTotals((prev) => {
        const current = typeof prev[normalized] === "number" ? prev[normalized] : 0;
        if (chapterCount <= 0 || current === chapterCount) {
          return prev;
        }
        return {
          ...prev,
          [normalized]: Math.max(current, chapterCount)
        };
      });

      return result;
    },
    []
  );

  const setBookChapterTotal = useCallback((bookId: string, totalChapters: number) => {
    const normalized = bookId.trim();
    if (!normalized || totalChapters <= 0) {
      return;
    }
    setBookChapterTotals((prev) => {
      const current = typeof prev[normalized] === "number" ? prev[normalized] : 0;
      if (current === totalChapters) {
        return prev;
      }
      return {
        ...prev,
        [normalized]: Math.max(current, totalChapters)
      };
    });
  }, []);

  const getBookProgress = useCallback(
    (bookId: string, totalChapters: number) => {
      const normalized = bookId.trim();
      const recordedTotal = bookChapterTotals[normalized];
      const effectiveTotal = Math.max(
        0,
        Number.isFinite(recordedTotal) && recordedTotal ? recordedTotal : totalChapters
      );
      if (!normalized || effectiveTotal <= 0) {
        return { completedChapters: 0, totalChapters: Math.max(effectiveTotal, 0), progress: 0 };
      }
      const completedIndex = getCompletedChapterIndex(normalized);
      const completedChapters = Math.max(0, Math.min(completedIndex + 1, effectiveTotal));
      const progress =
        effectiveTotal > 0 ? Math.min(1, completedChapters / effectiveTotal) : 0;
      return { completedChapters, totalChapters: effectiveTotal, progress };
    },
    [bookChapterTotals, getCompletedChapterIndex]
  );

  const value = useMemo(
    () => ({
      ownedBookIds,
      progressBookIds,
      addBookToLibrary,
      isBookOwned,
      isBookInProgress,
      getCompletedChapterIndex,
      completeChapter,
      setBookChapterTotal,
      getBookProgress
    }),
    [
      ownedBookIds,
      progressBookIds,
      addBookToLibrary,
      isBookOwned,
      isBookInProgress,
      getCompletedChapterIndex,
      completeChapter,
      setBookChapterTotal,
      getBookProgress
    ]
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
};

export const useLibraryContext = () => {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error("useLibraryContext must be used within a LibraryProvider");
  }
  return context;
};
