import { Text } from 'ink';
import React, { useMemo } from 'react';
import { ANIMATION_CONFIG } from './constants';

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

  const fadeLevel = ANIMATION_CONFIG.GRADIENT_COLORS.FADE_LEVELS[distance - 1];
  return fadeLevel || baseColor;
}

export function GradientText({
  text,
  highlightIndex,
  baseColor = ANIMATION_CONFIG.GRADIENT_COLORS.BASE,
  highlightColor = ANIMATION_CONFIG.GRADIENT_COLORS.HIGHLIGHT,
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
