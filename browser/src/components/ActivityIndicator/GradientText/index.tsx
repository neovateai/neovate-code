import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './index.module.css';

interface GradientTextProps {
  text: string;
  speed?: number;
  className?: string;
  baseColor?: string;
  highlightColor?: string;
  isActive?: boolean;
}

const FADE_LEVELS = ['fade1', 'fade2', 'fade3', 'fade4'] as const;

function getColorClassByDistance(distance: number): string {
  if (distance === 0) return 'highlight';

  const fadeLevel = FADE_LEVELS[distance - 1];
  return fadeLevel || 'base';
}

const GradientText: React.FC<GradientTextProps> = ({
  text,
  speed = 150,
  className = '',
  baseColor,
  highlightColor,
  isActive = true,
}) => {
  const [highlightIndex, setHighlightIndex] = useState(0);

  useEffect(() => {
    if (!isActive || !text) {
      return;
    }

    const interval = setInterval(() => {
      setHighlightIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;
        return nextIndex >= text.length ? 0 : nextIndex;
      });
    }, speed);

    return () => {
      clearInterval(interval);
    };
  }, [text, speed, isActive]);

  const resetAnimation = useCallback(() => {
    setHighlightIndex(0);
  }, []);

  const renderedText = useMemo(() => {
    if (!text) return null;

    return text.split('').map((char, index) => {
      const distance = Math.abs(index - highlightIndex);
      const colorClass = getColorClassByDistance(distance);

      return (
        <span
          key={`${index}-${char}-${highlightIndex}`}
          className={`${styles.character} ${styles[colorClass]}`}
        >
          {char}
        </span>
      );
    });
  }, [text, highlightIndex]);

  const containerStyle = useMemo(() => {
    const style: Record<string, string> = {};

    if (baseColor) {
      style['--base-color'] = baseColor;
    }

    if (highlightColor) {
      style['--highlight-color'] = highlightColor;
    }

    return style;
  }, [baseColor, highlightColor]);

  const containerClass = [
    styles.gradientText,
    !isActive && styles.paused,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      className={containerClass}
      style={containerStyle}
      data-base-color={baseColor ? '' : undefined}
      data-highlight-color={highlightColor ? '' : undefined}
      onClick={resetAnimation}
    >
      {renderedText}
    </span>
  );
};

export default GradientText;
