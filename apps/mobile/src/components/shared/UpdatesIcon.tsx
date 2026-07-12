import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

// WhatsApp "Updates" glyph:
// - outer ring cut into dashes
// - inner circle continuous (NOT cut, NOT filled)
// - pointed tail at the bottom-left: two strokes meeting at a tip (no fill)
export default function UpdatesIcon({
  color,
  size = 24,
  showDot = false,
}: {
  color: string;
  size?: number;
  showDot?: boolean;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Outer dashed ring — gap at the bottom-left where the tail sits */}
      <Circle
        cx="12"
        cy="12"
        r="8.3"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="6.5 5 6.5 5 6.5 5 6.5 11.2"
        transform="rotate(170 12 12)"
      />
      {/* Inner circle — continuous outline */}
      <Circle
        cx="12"
        cy="12"
        r="4.3"
        stroke={color}
        strokeWidth="2"
        fill="none"
      />
      {/* Pointed tail — two lines meeting at the tip, unfilled */}
      <Path
        d="M 5.9 17.7 L 3.0 20.9 L 8.1 19.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Green notification dot for unseen status updates */}
      {showDot && <Circle cx="20" cy="4" r="3" fill="#25D366" />}
    </Svg>
  );
}
