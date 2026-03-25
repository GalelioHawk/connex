import React from 'react';
import { Linking, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParams } from '../../navigation';

type Props = NativeStackScreenProps<AuthStackParams, 'Onboarding'>;

function openExternal(url: string) {
  void Linking.openURL(url);
}

const LETTERS = [
  { char: 'o', color: '#2B7A78' },
  { char: 'n', color: '#8EE7C0' },
  { char: 'n', color: '#68D7BE' },
  { char: 'e', color: '#A9D6F8' },
  { char: 'x', color: '#6BE4A0' },
] as const;

const TAGLINE = [
  { text: 'Chat.', color: '#0D1B2A' },
  { text: 'Stay informed.', color: '#4F6D8A' },
  { text: 'Learn.', color: '#00A86B' },
] as const;

const SUPPORT_LINE = 'Your community, in one place.';

function ConnexMark() {
  return (
    <Svg width={92} height={92} viewBox="0 0 64 64">
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
  );
}

export default function OnboardingScreen({ navigation }: Props) {
  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F9FB" />

      <ExpoLinearGradient
        colors={['#E2F5EC', '#E8EEF9', '#F1F6E8']}
        start={{ x: 0.08, y: 0.02 }}
        end={{ x: 0.92, y: 0.98 }}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.content}>
          <View style={s.top}>
            <View style={s.wordmarkInner}>
              <ConnexMark />
              <View style={s.lettersWrap}>
                {LETTERS.map((letter, index) => (
                  <Text
                    key={`${letter.char}-${index}`}
                    style={[s.wordmarkText, { color: letter.color }]}
                  >
                    {letter.char}
                  </Text>
                ))}
              </View>
            </View>

            <View style={s.taglineWrap}>
              {TAGLINE.map((item) => (
                <Text
                  key={item.text}
                  style={[s.taglineText, { color: item.color }]}
                >
                  {item.text}
                </Text>
              ))}
            </View>

            <Text style={s.supportLine}>{SUPPORT_LINE}</Text>
          </View>

          <View style={s.bottom}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => navigation.navigate('Register')}
            >
              <ExpoLinearGradient
                colors={['#0D1B2A', '#2B7A78']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.primaryButton}
              >
                <Text style={s.primaryButtonText}>Create account</Text>
              </ExpoLinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.secondarySignIn}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={s.secondaryPrefix}>Already have an account? </Text>
              <Text style={s.secondaryLink}>Sign in</Text>
            </TouchableOpacity>

            <Text style={s.terms}>
              By continuing you agree to our{' '}
              <Text
                style={s.termsLink}
                onPress={() => openExternal('https://connexsa.co.za/terms.html')}
              >
                Terms of Service
              </Text>
              {' '}and{' '}
              <Text
                style={s.termsLink}
                onPress={() => openExternal('https://connexsa.co.za/privacy.html')}
              >
                Privacy Policy
              </Text>
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#E8EEF3',
  },
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  top: {
    alignItems: 'flex-start',
    paddingTop: 192,
    paddingLeft: 36,
  },
  wordmarkInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lettersWrap: {
    flexDirection: 'row',
    marginLeft: -22,
    marginTop: 0,
  },
  wordmarkText: {
    fontSize: 43,
    lineHeight: 47,
    fontWeight: '900',
    letterSpacing: -1.6,
  },
  taglineWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    marginLeft: 8,
  },
  taglineText: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  supportLine: {
    marginTop: 10,
    marginLeft: 8,
    color: '#6F8194',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  bottom: {
    alignItems: 'stretch',
    gap: 12,
    paddingHorizontal: 36,
    paddingBottom: 68,
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D1B2A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  secondarySignIn: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryPrefix: {
    color: '#8A9BB0',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  secondaryLink: {
    color: '#0D1B2A',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  terms: {
    marginTop: 8,
    color: '#8A9BB0',
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
  },
  termsLink: {
    color: '#0D1B2A',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
