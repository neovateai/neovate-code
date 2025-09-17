import { useEffect, useRef, useState } from 'react';
import { ANIMATION_CONFIG } from './constants';

function getAdaptiveSpeed(textLength: number, baseSpeed: number): number {
  if (textLength <= 5) return baseSpeed;
  if (textLength >= 50)
    return Math.max(baseSpeed * 0.5, ANIMATION_CONFIG.SPEED_LIMITS.MIN);

  const speedReduction = (textLength - 5) * 2;
  return Math.max(
    baseSpeed - speedReduction,
    ANIMATION_CONFIG.SPEED_LIMITS.MIN,
  );
}

export function useTextGradientAnimation(
  text: string,
  isActive: boolean,
  speed: number = ANIMATION_CONFIG.TEXT_GRADIENT_SPEED,
) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!isActive || !text.length) {
      setCurrentIndex(0);
      return;
    }

    const adaptiveSpeed = getAdaptiveSpeed(text.length, speed);

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % text.length);
    }, adaptiveSpeed);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, text.length, speed]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return currentIndex;
}
