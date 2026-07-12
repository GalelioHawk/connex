import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

export default function CommunitiesIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="5"  cy="8"  r="2.8" stroke={color} strokeWidth={2.1} />
      <Path d="M1 19.5c0-2 1.8-3.5 4-3.5" stroke={color} strokeWidth={2.1} strokeLinecap="round" />
      <Circle cx="19" cy="8"  r="2.8" stroke={color} strokeWidth={2.1} />
      <Path d="M23 19.5c0-2-1.8-3.5-4-3.5" stroke={color} strokeWidth={2.1} strokeLinecap="round" />
      <Circle cx="12" cy="7"  r="3.2" stroke={color} strokeWidth={2.1} />
      <Path d="M6 21c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={color} strokeWidth={2.1} strokeLinecap="round" />
    </Svg>
  );
}
