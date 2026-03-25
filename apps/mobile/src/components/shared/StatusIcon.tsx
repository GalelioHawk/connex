import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

interface Props {
  size?: number;
  color?: string;
  showDot?: boolean;
}

export default function StatusIcon({ size = 26, color = '#8E8E93', showDot = false }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Outer ring */}
      <Circle cx="12" cy="12" r="9.5" stroke={color} strokeWidth="1.6" />

      {/* Chat bubble with tail */}
      <Path
        d="M9 8.5 H15 A1.5 1.5 0 0 1 16.5 10 V13 A1.5 1.5 0 0 1 15 14.5 H13 L11.5 16.5 L10 14.5 H9 A1.5 1.5 0 0 1 7.5 13 V10 A1.5 1.5 0 0 1 9 8.5 Z"
        stroke={color}
        strokeWidth="1.4"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Ellipsis dots inside bubble */}
      <Circle cx="10"   cy="11.5" r="0.75" fill={color} />
      <Circle cx="12"   cy="11.5" r="0.75" fill={color} />
      <Circle cx="14"   cy="11.5" r="0.75" fill={color} />

      {/* Green notification dot */}
      {showDot && <Circle cx="19.5" cy="4.5" r="2.8" fill="#4CAF50" />}
    </Svg>
  );
}
