import React from 'react';
import { Linking, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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

const FEATURES = [
  { icon: 'chatbubble-outline' as const, label: 'Messaging' },
  { icon: 'notifications-outline' as const, label: 'Alerts' },
  { icon: 'book-outline' as const, label: 'Learn' },
] as const;

// ─── Connex mark SVG ─────────────────────────────────────────────────────────
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

// ─── Decorative background orbs ──────────────────────────────────────────────
function BackgroundOrbs() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[s.orb, s.orb1]} />
      <View style={[s.orb, s.orb2]} />
      <View style={[s.orb, s.orb3]} />
      {/* Scattered accent dots */}
      <View style={[s.dot, { top: '24%', left: 30,  width: 5, height: 5, backgroundColor: '#00A86B', opacity: 0.45 }]} />
      <View style={[s.dot, { top: '31%', right: 38, width: 4, height: 4, backgroundColor: '#2B7A78', opacity: 0.38 }]} />
      <View style={[s.dot, { top: '37%', left: 72,  width: 3, height: 3, backgroundColor: '#0D1B2A', opacity: 0.15 }]} />
      <View style={[s.dot, { top: '40%', right: 68, width: 6, height: 6, backgroundColor: '#6BE4A0', opacity: 0.32 }]} />
      <View style={[s.dot, { bottom: '38%', left: 44, width: 4, height: 4, backgroundColor: '#2B7A78', opacity: 0.28 }]} />
      <View style={[s.dot, { bottom: '28%', right: 52, width: 3, height: 3, backgroundColor: '#00A86B', opacity: 0.35 }]} />
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function WordmarkOnboardingScreen({ navigation }: Props) {
  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F9FB" />

      {/* Rich 4-stop gradient base */}
      <ExpoLinearGradient
        colors={['#DCF0E8', '#E6EEFA', '#F0EAF8', '#EBF5E4']}
        locations={[0, 0.32, 0.68, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating decorative orbs */}
      <BackgroundOrbs />

      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.content}>

          {/* ─── Hero ──────────────────────────────────────────────────────── */}
          <View style={s.top}>

            {/* Logo mark with ambient glow ring */}
            <View style={s.logoWrapper}>
              <View style={s.logoGlowOuter} />
              <View style={s.logoGlowInner} />
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
            </View>

            {/* Thin accent separator beneath the wordmark */}
            <View style={s.accentSeparator}>
              <View style={s.accentLine} />
              <View style={s.accentDot} />
              <View style={s.accentLine} />
            </View>

            {/* Tagline with soft dot dividers */}
            <View style={s.taglineWrap}>
              {TAGLINE.map((item, i) => (
                <React.Fragment key={item.text}>
                  <Text style={[s.taglineText, { color: item.color }]}>
                    {item.text}
                  </Text>
                  {i < TAGLINE.length - 1 && (
                    <View style={s.taglineDot} />
                  )}
                </React.Fragment>
              ))}
            </View>

            <Text style={s.supportLine}>{SUPPORT_LINE}</Text>
          </View>

          {/* ─── Middle feature pills ──────────────────────────────────────── */}
          <View style={s.featureRow}>
            {FEATURES.map((f, i) => (
              <React.Fragment key={f.label}>
                <View style={[
                  s.featurePill,
                  i === 0 && s.featurePillFirst,
                  i === FEATURES.length - 1 && s.featurePillLast,
                ]}>
                  <Ionicons name={f.icon} size={13} color="#2B7A78" />
                  <Text style={s.featureLabel}>{f.label}</Text>
                </View>
                {i < FEATURES.length - 1 && <View style={s.featureSplit} />}
              </React.Fragment>
            ))}
          </View>

          {/* ─── Bottom ───────────────────────────────────────────────────── */}
          <View style={s.bottom}>

              {/* Primary CTA */}
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => navigation.navigate('Register')}
              >
                <ExpoLinearGradient
                  colors={['#0D1B2A', '#1B3F54', '#2B7A78']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.primaryButton}
                >
                  {/* Inner top-edge highlight */}
                  <View style={s.buttonHighlight} />
                  <Text style={s.primaryButtonText}>Create account</Text>
                  <View style={s.buttonArrow}>
                    <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.8)" />
                  </View>
                </ExpoLinearGradient>
              </TouchableOpacity>

              {/* Sign-in row with flanking separator lines */}
              <View style={s.signInRow}>
                <View style={s.signInLine} />
                <TouchableOpacity
                  style={s.secondarySignIn}
                  activeOpacity={0.82}
                  onPress={() => navigation.navigate('Login')}
                >
                  <Text style={s.secondaryPrefix}>Already have an account? </Text>
                  <Text style={s.secondaryLink}>Sign in</Text>
                </TouchableOpacity>
                <View style={s.signInLine} />
              </View>

              {/* Terms */}
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#E0ECE9',
  },
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },

  // ── Background orbs ────────────────────────────────────────────────────────
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orb1: {
    width: 420,
    height: 420,
    top: -170,
    right: -150,
    backgroundColor: '#2B7A78',
    opacity: 0.075,
  },
  orb2: {
    width: 340,
    height: 340,
    bottom: -90,
    left: -130,
    backgroundColor: '#00A86B',
    opacity: 0.085,
  },
  orb3: {
    width: 180,
    height: 180,
    top: '44%',
    right: -70,
    backgroundColor: '#0D1B2A',
    opacity: 0.032,
  },
  dot: {
    position: 'absolute',
    borderRadius: 99,
  },

  // ── Hero section ───────────────────────────────────────────────────────────
  top: {
    paddingTop: 176,
    paddingLeft: 36,
    paddingRight: 28,
  },
  logoWrapper: {
    position: 'relative',
  },
  logoGlowOuter: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    top: -34,
    left: -34,
    backgroundColor: '#00A86B',
    opacity: 0.08,
  },
  logoGlowInner: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    top: -4,
    left: -4,
    backgroundColor: '#2B7A78',
    opacity: 0.07,
  },
  wordmarkInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lettersWrap: {
    flexDirection: 'row',
    marginLeft: -22,
  },
  wordmarkText: {
    fontSize: 44,
    lineHeight: 48,
    fontWeight: '900',
    letterSpacing: -1.8,
  },

  // Thin accent separator
  accentSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    marginLeft: 8,
    marginBottom: 4,
    width: 108,
    gap: 6,
  },
  accentLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2B7A78',
    opacity: 0.28,
  },
  accentDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00A86B',
    opacity: 0.75,
  },

  // Tagline
  taglineWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
    marginLeft: 8,
  },
  taglineDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#8A9BB0',
    opacity: 0.55,
    marginBottom: 1,
  },
  taglineText: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  supportLine: {
    marginTop: 10,
    marginLeft: 8,
    color: '#567086',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    letterSpacing: 0.1,
  },

  // ── Middle feature pills ───────────────────────────────────────────────────
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 36,
    backgroundColor: 'rgba(255,255,255,0.48)',
    borderRadius: 16,
    borderWidth: 0.75,
    borderColor: 'rgba(43,122,120,0.14)',
    overflow: 'hidden',
    shadowColor: '#0D1B2A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featurePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
  },
  featurePillFirst: {},
  featurePillLast: {},
  featureSplit: {
    width: 0.75,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(43,122,120,0.18)',
    marginVertical: 10,
  },
  featureLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3A5870',
    letterSpacing: 0.05,
  },

  // ── Bottom ────────────────────────────────────────────────────────────────
  bottom: {
    alignItems: 'stretch',
    gap: 12,
    paddingHorizontal: 36,
    paddingBottom: 68,
  },

  // ── CTA button ────────────────────────────────────────────────────────────
  primaryButton: {
    minHeight: 60,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#0D1B2A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.26,
    shadowRadius: 30,
    elevation: 10,
  },
  buttonHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  buttonArrow: {
    position: 'absolute',
    right: 22,
    opacity: 0.9,
  },

  // ── Sign-in row ───────────────────────────────────────────────────────────
  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  signInLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(138,155,176,0.32)',
  },
  secondarySignIn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  secondaryPrefix: {
    color: '#8A9BB0',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  secondaryLink: {
    color: '#0D1B2A',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.1,
  },

  // ── Terms ─────────────────────────────────────────────────────────────────
  terms: {
    marginTop: 2,
    color: '#8A9BB0',
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
  },
  termsLink: {
    color: '#2B7A78',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
