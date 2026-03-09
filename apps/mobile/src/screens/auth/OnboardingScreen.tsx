import React from 'react';
import {
  View, Text, TouchableOpacity, SafeAreaView,
  StyleSheet, StatusBar, Dimensions, Linking,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParams } from '../../navigation';
import ConnexLogo from '../../components/shared/ConnexLogo';

type Props = NativeStackScreenProps<AuthStackParams, 'Onboarding'>;

const { height } = Dimensions.get('window');

export default function OnboardingScreen({ navigation }: Props) {
  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SafeAreaView style={s.safe}>

        {/* ── Center: Logo + Name ── */}
        <View style={s.center}>
          <ConnexLogo size="lg" color="dark" />
          <Text style={s.tagline}>Chat. Stay informed. Learn.</Text>
        </View>

        {/* ── Bottom: Buttons + Terms ── */}
        <View style={s.bottom}>
          <TouchableOpacity
            style={s.btnPrimary}
            activeOpacity={0.88}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={s.btnPrimaryText}>Create account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.btnSecondary}
            activeOpacity={0.88}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={s.btnSecondaryText}>I already have an account</Text>
          </TouchableOpacity>

          <Text style={s.terms}>
            By continuing you agree to our{' '}
            <Text style={s.termsLink} onPress={() => Linking.openURL('https://connexsa.co.za/terms.html')}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={s.termsLink} onPress={() => Linking.openURL('https://connexsa.co.za/privacy.html')}>Privacy Policy</Text>
          </Text>
        </View>

      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root:            { flex: 1, backgroundColor: '#fff' },
  safe:            { flex: 1, paddingHorizontal: 32, paddingBottom: 36, justifyContent: 'space-between' },

  // Center
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  tagline:         { color: '#0D1B2A', fontSize: 16, letterSpacing: 0.1 },

  // Bottom
  bottom:          { gap: 12 },
  btnPrimary:      { paddingVertical: 17, borderRadius: 14, alignItems: 'center', backgroundColor: '#0D1B2A' },
  btnPrimaryText:  { color: '#fff', fontSize: 17, fontWeight: '800' },
  btnSecondary:    { paddingVertical: 17, borderRadius: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#0D1B2A' },
  btnSecondaryText:{ color: '#0D1B2A', fontSize: 17, fontWeight: '700' },
  terms:           { textAlign: 'center', color: '#0D1B2A', fontSize: 12, lineHeight: 18, marginTop: 4 },
  termsLink:       { color: '#0D1B2A', fontWeight: '600', textDecorationLine: 'underline' },
});
