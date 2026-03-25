import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

type Size = 'sm' | 'md';

interface Props {
  size?: Size;
}

const LETTERS = [
  { char: 'o', color: '#2B7A78' },
  { char: 'n', color: '#8EE7C0' },
  { char: 'n', color: '#68D7BE' },
  { char: 'e', color: '#A9D6F8' },
  { char: 'x', color: '#6BE4A0' },
] as const;

const SIZES = {
  sm: { mark: 72, fontSize: 34, lineHeight: 38, offset: -18 },
  md: { mark: 92, fontSize: 43, lineHeight: 47, offset: -22 },
} as const;

export default function ConnexWordmark({ size = 'sm' }: Props) {
  const current = SIZES[size];

  return (
    <View style={s.row}>
      <Svg width={current.mark} height={current.mark} viewBox="0 0 64 64">
        <Defs>
          <LinearGradient id="arc" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#0D1B2A" />
            <Stop offset="100%" stopColor="#2B7A78" />
          </LinearGradient>
        </Defs>

        <Path
          d="M 41.9 22.1 A 14 14 0 1 0 41.9 41.9"
          stroke="url(#arc)"
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />
        <Circle cx="41.9" cy="41.9" r="4.8" fill="#00A86B" />
        <Circle cx="40.4" cy="40.4" r="1.8" fill="#00D48A" opacity="0.6" />
      </Svg>

      <View style={[s.lettersRow, { marginLeft: current.offset }]}>
        {LETTERS.map((letter, index) => (
          <Text
            key={`${letter.char}-${index}`}
            style={[
              s.letter,
              {
                color: letter.color,
                fontSize: current.fontSize,
                lineHeight: current.lineHeight,
              },
            ]}
          >
            {letter.char}
          </Text>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lettersRow: {
    flexDirection: 'row',
  },
  letter: {
    fontWeight: '900',
    letterSpacing: -1.6,
  },
});
