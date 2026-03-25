import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import {
  useFonts,
  Poppins_900Black,
} from '@expo-google-fonts/poppins';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  /** 'gradient' uses green gradient, 'dark' uses navy, 'white' uses white */
  color?: 'gradient' | 'dark' | 'white';
}

const sw = Dimensions.get('window').width;

const SIZES = {
  sm: { fontSize: 28,          width: sw * 0.38, height: 40 },
  md: { fontSize: sw * 0.105,  width: sw * 0.60, height: sw * 0.15 },
  lg: { fontSize: sw * 0.13,   width: sw * 0.74, height: sw * 0.19 },
};

export default function ConnexLogo({ size = 'md', color = 'gradient' }: Props) {
  const [fontsLoaded] = useFonts({ Poppins_900Black });

  const { fontSize, width, height } = SIZES[size];

  if (!fontsLoaded) {
    // Fallback while font loads
    return (
      <View style={{ width, height, justifyContent: 'center' }}>
        <Text style={[s.fallback, { fontSize: fontSize * 0.85, color: color === 'white' ? '#fff' : color === 'dark' ? '#0D1B2A' : '#006B3C' }]}>
          Connex
        </Text>
      </View>
    );
  }

  if (color === 'dark') {
    return (
      <Svg width={width} height={height}>
        <SvgText
          x="0"
          y={height * 0.82}
          fontFamily="Poppins_900Black"
          fontSize={fontSize}
          fill="#0D1B2A"
          letterSpacing={-1.5}
        >
          Connex
        </SvgText>
      </Svg>
    );
  }

  if (color === 'white') {
    return (
      <Svg width={width} height={height}>
        <SvgText
          x="0"
          y={height * 0.82}
          fontFamily="Poppins_900Black"
          fontSize={fontSize}
          fill="#ffffff"
          letterSpacing={-1.5}
        >
          Connex
        </SvgText>
      </Svg>
    );
  }

  // Gradient
  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="wordmark" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#00A86B" />
          <Stop offset="100%" stopColor="#006B3C" />
        </LinearGradient>
      </Defs>
      <SvgText
        x="0"
        y={height * 0.82}
        fontFamily="Poppins_900Black"
        fontSize={fontSize}
        fill="url(#wordmark)"
        letterSpacing={-1.5}
      >
        Connex
      </SvgText>
    </Svg>
  );
}

const s = StyleSheet.create({
  fallback: { fontWeight: '900' },
});
