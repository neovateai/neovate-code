import gradient, { pastel, rainbow } from 'gradient-string';
import { Text } from 'ink';
import React, { useMemo } from 'react';

interface GradientStringProps {
  text: string;
  colors?: string[];
  preset?: 'rainbow' | 'pastel' | 'custom';
  interpolation?: 'rgb' | 'hsv';
  hsvSpin?: 'short' | 'long';
  multiline?: boolean;
}

export function GradientString({
  text,
  colors = ['cyan', 'pink'],
  preset = 'custom',
  interpolation = 'rgb',
  hsvSpin = 'short',
  multiline = false,
}: GradientStringProps) {
  const gradientText = useMemo(() => {
    if (!text) return '';

    let gradientFn: any;

    switch (preset) {
      case 'rainbow':
        gradientFn = rainbow;
        break;
      case 'pastel':
        gradientFn = pastel;
        break;
      case 'custom':
      default:
        gradientFn = gradient(colors, { interpolation, hsvSpin });
        break;
    }

    // 如果启用 multiline 模式，使用 multiline() 方法
    if (multiline) {
      return gradientFn.multiline(text);
    }

    return gradientFn(text);
  }, [text, colors, preset, interpolation, hsvSpin, multiline]);

  return <Text>{gradientText}</Text>;
}

// 预定义的渐变样式
export const GradientPresets = {
  rainbow: (text: string) => <GradientString text={text} preset="rainbow" />,
  pastel: (text: string) => <GradientString text={text} preset="pastel" />,
  cyanPink: (text: string) => (
    <GradientString text={text} colors={['cyan', 'pink']} />
  ),
  bluePurple: (text: string) => (
    <GradientString text={text} colors={['blue', 'purple']} />
  ),
  greenYellow: (text: string) => (
    <GradientString text={text} colors={['green', 'yellow']} />
  ),
  redOrange: (text: string) => (
    <GradientString text={text} colors={['red', 'orange']} />
  ),
  hsv: (text: string) => (
    <GradientString text={text} colors={['red', 'green']} interpolation="hsv" />
  ),
  hsvLong: (text: string) => (
    <GradientString
      text={text}
      colors={['red', 'green']}
      interpolation="hsv"
      hsvSpin="long"
    />
  ),
};
