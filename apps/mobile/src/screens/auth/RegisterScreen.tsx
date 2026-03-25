import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParams } from '../../navigation';
import ConnexWordmark from '../../components/shared/ConnexWordmark';
import { authService } from '../../services/auth';
import { useAuthStore } from '../../store/authStore';

type Props = NativeStackScreenProps<AuthStackParams, 'Register'>;

const TAGLINE = [
  { text: 'Chat.', color: '#0D1B2A' },
  { text: 'Stay informed.', color: '#4F6D8A' },
  { text: 'Learn.', color: '#00A86B' },
] as const;

const RULES = [
  { key: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { key: 'uppercase', label: 'At least 1 uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { key: 'number', label: 'At least 1 number', test: (p: string) => /[0-9]/.test(p) },
  { key: 'special', label: 'At least 1 special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function getStrength(password: string): { score: number; label: string; color: string } {
  const passed = RULES.filter((rule) => rule.test(password)).length;
  if (password.length === 0) return { score: 0, label: '', color: '#DCE5EC' };
  if (passed <= 1) return { score: 1, label: 'Weak', color: '#D96A6A' };
  if (passed === 2) return { score: 2, label: 'Fair', color: '#E6A84A' };
  if (passed === 3) return { score: 3, label: 'Good', color: '#55B983' };
  return { score: 4, label: 'Strong', color: '#2B7A78' };
}

export default function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const setAuth = useAuthStore((s) => s.setAuth);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const strength = getStrength(password);

  function shake() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 5, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -5, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start();
  }

  async function handleRegister() {
    setError('');
    if (!name.trim() || !phone.trim() || !password.trim()) {
      setError('All fields are required');
      shake();
      return;
    }

    const failedRule = RULES.find((rule) => !rule.test(password));
    if (failedRule) {
      setError(failedRule.label);
      shake();
      return;
    }

    const formatted = phone.startsWith('0') ? '+27' + phone.slice(1) : phone;
    setLoading(true);
    try {
      const res = await authService.register(formatted, password, name.trim());
      setAuth(res.user, res.sessionId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      shake();
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F9FB" />

      <LinearGradient
        colors={['#E2F5EC', '#E8EEF9', '#F1F6E8']}
        start={{ x: 0.08, y: 0.02 }}
        end={{ x: 0.92, y: 0.98 }}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.safe}>
          <ScrollView
            contentContainerStyle={s.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={s.inner}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={s.backButton} activeOpacity={0.8}>
                <Ionicons name="chevron-back" size={18} color="#0D1B2A" />
              </TouchableOpacity>

              <View style={s.brandBlock}>
                <ConnexWordmark size="sm" />
                <View style={s.taglineWrap}>
                  {TAGLINE.map((item) => (
                    <Text key={item.text} style={[s.taglineText, { color: item.color }]}>
                      {item.text}
                    </Text>
                  ))}
                </View>
              </View>

              <View style={s.header}>
                <Text style={s.title}>Create account</Text>
                <Text style={s.subtitle}>Start with Connex in a minute.</Text>
              </View>

              <Animated.View style={[s.formCard, { transform: [{ translateX: shakeAnim }] }]}>
                <View style={s.field}>
                  <Text style={s.label}>Full name</Text>
                  <TextInput
                    style={[s.input, focused === 'name' && s.inputFocused]}
                    placeholder="e.g. Thabo Nkosi"
                    placeholderTextColor="#A6B6C4"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    onFocus={() => setFocused('name')}
                    onBlur={() => setFocused(null)}
                  />
                </View>

                <View style={s.field}>
                  <Text style={s.label}>Phone number</Text>
                  <TextInput
                    style={[s.input, focused === 'phone' && s.inputFocused]}
                    placeholder="082 123 4567"
                    placeholderTextColor="#A6B6C4"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    onFocus={() => setFocused('phone')}
                    onBlur={() => setFocused(null)}
                  />
                </View>

                <View style={s.field}>
                  <Text style={s.label}>Password</Text>
                  <View style={[s.inputRow, focused === 'pass' && s.inputRowFocused]}>
                    <TextInput
                      style={s.inputInner}
                      placeholder="Min. 8 characters"
                      placeholderTextColor="#A6B6C4"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPass}
                      onFocus={() => setFocused('pass')}
                      onBlur={() => setFocused(null)}
                    />
                    <TouchableOpacity onPress={() => setShowPass((value) => !value)} style={s.eyeButton}>
                      <Ionicons
                        name={showPass ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#7D91A3"
                      />
                    </TouchableOpacity>
                  </View>

                  {password.length > 0 ? (
                    <View style={s.strengthRow}>
                      {[1, 2, 3, 4].map((level) => (
                        <View
                          key={level}
                          style={[
                            s.strengthBar,
                            { backgroundColor: level <= strength.score ? strength.color : '#DCE5EC' },
                          ]}
                        />
                      ))}
                      <Text style={[s.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
                    </View>
                  ) : null}

                  {password.length > 0 ? (
                    <View style={s.rules}>
                      {RULES.map((rule) => {
                        const passed = rule.test(password);
                        return (
                          <View key={rule.key} style={s.ruleRow}>
                            <Ionicons
                              name={passed ? 'checkmark-circle' : 'ellipse-outline'}
                              size={14}
                              color={passed ? '#2B7A78' : '#B2C1CD'}
                            />
                            <Text style={[s.ruleText, passed && s.ruleTextPassed]}>{rule.label}</Text>
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              </Animated.View>

              {error ? (
                <View style={s.errorBox}>
                  <Text style={s.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={s.actions}>
                <TouchableOpacity onPress={handleRegister} disabled={loading} activeOpacity={0.9}>
                  <LinearGradient
                    colors={loading ? ['#A6B2BC', '#A6B2BC'] : ['#0D1B2A', '#2B7A78']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.primaryButton}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={s.primaryButtonText}>Create account</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigation.replace('Login')}
                  style={s.linkButton}
                  activeOpacity={0.75}
                >
                  <Text style={s.linkText}>Already have an account? </Text>
                  <Text style={s.linkHighlight}>Sign in</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  scrollContent: {
    flexGrow: 1,
  },
  inner: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 14,
    paddingBottom: 36,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(220,229,236,0.95)',
  },
  brandBlock: {
    marginTop: 28,
    alignItems: 'flex-start',
  },
  taglineWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginLeft: 6,
  },
  taglineText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  header: {
    marginTop: 28,
    gap: 6,
  },
  title: {
    color: '#0D1B2A',
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '900',
    letterSpacing: -1.2,
  },
  subtitle: {
    color: '#6F8194',
    fontSize: 16,
    lineHeight: 23,
  },
  formCard: {
    marginTop: 24,
    borderRadius: 28,
    padding: 18,
    gap: 18,
    backgroundColor: 'rgba(255,255,255,0.74)',
    borderWidth: 1,
    borderColor: 'rgba(223,231,236,0.95)',
  },
  field: {
    gap: 8,
  },
  label: {
    color: '#0D1B2A',
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    minHeight: 54,
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DCE5EC',
    color: '#0D1B2A',
    fontSize: 15,
  },
  inputFocused: {
    borderColor: '#2B7A78',
    backgroundColor: '#FFFFFF',
  },
  inputRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DCE5EC',
  },
  inputRowFocused: {
    borderColor: '#2B7A78',
  },
  inputInner: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#0D1B2A',
    fontSize: 15,
  },
  eyeButton: {
    paddingHorizontal: 16,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 999,
  },
  strengthLabel: {
    minWidth: 48,
    fontSize: 12,
    fontWeight: '700',
  },
  rules: {
    gap: 6,
    marginTop: 8,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ruleText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#8FA1B1',
  },
  ruleTextPassed: {
    color: '#2B7A78',
  },
  errorBox: {
    marginTop: 16,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(255, 245, 245, 0.95)',
    borderWidth: 1,
    borderColor: '#F2D5D5',
  },
  errorText: {
    color: '#C14949',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  actions: {
    marginTop: 26,
    gap: 16,
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
  linkButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkText: {
    color: '#8A9BB0',
    fontSize: 15,
    fontWeight: '600',
  },
  linkHighlight: {
    color: '#0D1B2A',
    fontSize: 15,
    fontWeight: '800',
  },
});
