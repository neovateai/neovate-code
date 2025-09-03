import { Text } from 'ink';
import React, { useMemo } from 'react';
import { UI_COLORS } from './constants';

interface GradientTextProps {
  text: string;
  highlightIndex: number;
  baseColor?: string;
  highlightColor?: string;
}

function getColorByDistance(
  distance: number,
  baseColor: string,
  highlightColor: string,
): string {
  if (distance === 0) return highlightColor;

  const fadeLevel =
    UI_COLORS.ACTIVITY_INDICATOR_GRADIENT.FADE_LEVELS[distance - 1];
  return fadeLevel || baseColor;
}

export function GradientText({
  text,
  highlightIndex,
  baseColor = UI_COLORS.ACTIVITY_INDICATOR_GRADIENT.BASE,
  highlightColor = UI_COLORS.ACTIVITY_INDICATOR_GRADIENT.HIGHLIGHT,
}: GradientTextProps) {
  const renderedText = useMemo(() => {
    if (!text) return null;

    return text.split('').map((char, index) => {
      const distance = Math.abs(index - highlightIndex);
      const color = getColorByDistance(distance, baseColor, highlightColor);

      return (
        <Text key={`${index}-${char}-${highlightIndex}`} color={color}>
          {char}
        </Text>
      );
    });
  }, [text, highlightIndex, baseColor, highlightColor]);

  return <>{renderedText}</>;
}
