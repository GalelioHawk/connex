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
      {/* Central solid circle (Step 2 size) */}
      <Circle cx="12" cy="12" r="4.5" fill={color} />

      {/* Symmetrical 4-segment Status Ring:
          - Drawn as a single circle for perfect alignment.
          - Right-side segments (top-right, bottom-right) are longer (11 units).
          - Left-side segments (top-left, bottom-left) are cut shorter (5.5 units).
          - The gap at the bottom-left (6 o'clock) is wide (12.4 units) to position the cut-off exactly at the bottom-left as requested.
      */}
      <Circle
        cx="12"
        cy="12"
        r="8.5"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray="11 2.5 11 12.4 5.5 2.5 5.5 3.0"
        transform="rotate(-90 12 12)" // Standard top-aligned starting rotation
      />

      {/* Speech bubble tail connecting both sides of the bottom-left cut perfectly */}
      <Path
        d="M 4.08 15.08 L 4.0 19.5 L 14.18 20.22"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Green notification dot for unseen status updates */}
      {showDot && <Circle cx="19.5" cy="4.5" r="3" fill="#25D366" />}
    </Svg>
  );
}
