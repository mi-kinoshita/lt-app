// hooks/useProgressData.ts
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PROGRESS_DATA_KEY = 'progressData';
const START_DATE_KEY = 'chatStartDate';
const LAST_LOGIN_DATE_KEY = 'lastLoginDate';

interface ProgressData {
  points: number;
  streak: number;
  time: string;
  sent: number;
  startDate: number | null;
  lastLoginDate: number | null;
}

const defaultProgressData: ProgressData = {
  points: 0,
  streak: 0,
  time: '0 hours 0 minutes',
  sent: 0,
  startDate: null,
  lastLoginDate: null,
};

export const useProgressData = () => {
  const [progress, setProgress] = useState<ProgressData>(defaultProgressData);

  const loadProgress = useCallback(async () => {
    try {
      const storedData = await AsyncStorage.getItem(PROGRESS_DATA_KEY);
      const storedStartDate = await AsyncStorage.getItem(START_DATE_KEY);
      const storedLastLoginDate = await AsyncStorage.getItem(LAST_LOGIN_DATE_KEY);

      let initialData: ProgressData = defaultProgressData;
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData) as ProgressData;
          initialData = {
            points: Number(parsedData.points || 0),
            streak: Number(parsedData.streak || 0),
            time: parsedData.time || '0 hours 0 minutes',
            sent: Number(parsedData.sent || 0),
            startDate: parsedData.startDate ? Number(parsedData.startDate) : null,
            lastLoginDate: parsedData.lastLoginDate ? Number(parsedData.lastLoginDate) : null
          };
        } catch (parseError) {
          console.error('Failed to parse stored progress data', parseError);
        }
      }

      let startDate = initialData.startDate;
      if (!startDate && storedStartDate) {
        startDate = parseInt(storedStartDate, 10);
      } else if (!startDate) {
        startDate = Date.now();
        await AsyncStorage.setItem(START_DATE_KEY, startDate.toString());
      }

      let lastLoginDate = initialData.lastLoginDate;
      if (!lastLoginDate && storedLastLoginDate) {
        lastLoginDate = parseInt(storedLastLoginDate, 10);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = today.getTime();

      if (!lastLoginDate || todayTimestamp > lastLoginDate) {
        initialData.points += 10;
        await AsyncStorage.setItem(LAST_LOGIN_DATE_KEY, todayTimestamp.toString());
        lastLoginDate = todayTimestamp;
      }

      setProgress({ ...initialData, startDate, lastLoginDate });
      console.log('Loaded progress:', initialData);
    } catch (error) {
      console.error('Failed to load progress data', error);
    }
  }, []);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  useEffect(() => {
    const saveProgress = async () => {
      try {
        await AsyncStorage.setItem(
          PROGRESS_DATA_KEY,
          JSON.stringify(progress)
        );
        if (progress.startDate) {
          await AsyncStorage.setItem(START_DATE_KEY, progress.startDate.toString());
        }
        if (progress.lastLoginDate) {
          await AsyncStorage.setItem(LAST_LOGIN_DATE_KEY, progress.lastLoginDate.toString());
        }
        console.log('Saved progress:', progress);
      } catch (error) {
        console.error('Failed to save progress data', error);
      }
    };

    saveProgress();
  }, [progress]);

  const updateProgress = (newData: Partial<ProgressData>) => {
    setProgress((prev) => ({ ...prev, ...newData }));
  };

  const incrementSentCount = useCallback(async () => {
    setProgress((prev) => ({ ...prev, sent: prev.sent + 1 }));
  }, []);

  const calculateStreak = () => {
    if (progress.startDate) {
      const start = new Date(progress.startDate);
      const now = new Date();
      start.setHours(0, 0, 0, 0);
      now.setHours(0, 0, 0, 0);
      const diffTime = Math.abs(now.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setProgress((prev) => ({ ...prev, streak: diffDays }));
    }
  };

  const calculateTimeElapsed = () => {
    if (progress.startDate) {
      const start = new Date(progress.startDate);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - start.getTime());
      const totalMinutes = Math.floor(diffTime / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      setProgress((prev) => ({ ...prev, time: `${hours} hours ${minutes} minutes` }));
    }
  };

  useEffect(() => {
    calculateStreak();
    calculateTimeElapsed();

    const intervalId = setInterval(() => {
      calculateStreak();
      calculateTimeElapsed();
    }, 60000);

    return () => clearInterval(intervalId);
  }, [progress.startDate]);

  return { progress, updateProgress, incrementSentCount, loadProgress };
};