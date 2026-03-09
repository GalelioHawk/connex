import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, SafeAreaView,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  StyleSheet, StatusBar, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParams } from '../../navigation';
import { authService } from '../../services/auth';
import { useAuthStore } from '../../store/authStore';

type Props = NativeStackScreenProps<AuthStackParams, 'Register'>;

// ─── Password rules ───────────────────────────────────────────────────────────
const RULES = [
  { key: 'length',    label: 'At least 8 characters',          test: (p: string) => p.length >= 8 },
  { key: 'uppercase', label: 'At least 1 uppercase letter',    test: (p: string) => /[A-Z]/.test(p) },
  { key: 'number',    label: 'At least 1 number',              test: (p: string) => /[0-9]/.test(p) },
  { key: 'special',   label: 'At least 1 special character',   test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function getStrength(password: string): { score: number; label: string; color: string } {
  const passed = RULES.filter(r => r.test(password)).length;
  if (password.length === 0) return { score: 0, label: '',       color: '#E8EDF2' };
  if (passed <= 1)           return { score: 1, label: 'Weak',   color: '#E53E3E' };
  if (passed === 2)          return { score: 2, label: 'Fair',   color: '#F6AD55' };
  if (passed === 3)          return { score: 3, label: 'Good',   color: '#68D391' };
  return                            { score: 4, label: 'Strong', color: '#38A169' };
}

export default function RegisterScreen({ navigation }: Props) {
  const [name, setName]           = useState('');
  const [phone, setPhone]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [focused, setFocused]     = useState<string | null>(null);
  const setAuth = useAuthStore((s) => s.setAuth);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const strength = getStrength(password);

  function shake() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 5,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -5, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 55, useNativeDriver: true }),
    ]).start();
  }

  async function handleRegister() {
    setError('');
    if (!name.trim() || !phone.trim() || !password.trim()) {
      setError('All fields are required'); shake(); return;
    }
    const failedRule = RULES.find(r => !r.test(password));
    if (failedRule) {
      setError(failedRule.label); shake(); return;
    }
    const formatted = phone.startsWith('0') ? '+27' + phone.slice(1) : phone;
    setLoading(true);
    try {
      const res = await authService.register(formatted, password, name.trim());
      setAuth(res.user, res.access_token, res.refresh_token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      shake();
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={s.inner}>

              {/* Back */}
              <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
                <Ionicons name="chevron-back" size={18} color="#ffffff" />
              </TouchableOpacity>

              {/* Header */}
              <View style={s.header}>
                <Text style={s.title}>Create your{'\n'}account</Text>
                <Text style={s.subtitle}>Free forever. No credit card.</Text>
              </View>

              {/* Form */}
              <Animated.View style={[s.form, { transform: [{ translateX: shakeAnim }] }]}>

                <View style={s.field}>
                  <Text style={s.label}>Full name</Text>
                  <TextInput
                    style={[s.input, focused === 'name' && s.inputFocused]}
                    placeholder="e.g. Thabo Nkosi"
                    placeholderTextColor="#C0CDD8"
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
                    placeholderTextColor="#C0CDD8"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    onFocus={() => setFocused('phone')}
                    onBlur={() => setFocused(null)}
                  />
                </View>

                {/* Password with show/hide toggle */}
                <View style={s.field}>
                  <Text style={s.label}>Password</Text>
                  <View style={s.inputRow}>
                    <TextInput
                      style={[s.inputInner, focused === 'pass' && s.inputFocused]}
                      placeholder="Min. 8 characters"
                      placeholderTextColor="#C0CDD8"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPass}
                      onFocus={() => setFocused('pass')}
                      onBlur={() => setFocused(null)}
                    />
                    <TouchableOpacity onPress={() => setShowPass(v => !v)} style={s.eyeBtn}>
                      <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="#8A9BB0" />
                    </TouchableOpacity>
                  </View>

                  {/* Strength bar */}
                  {password.length > 0 && (
                    <View style={s.strengthRow}>
                      {[1, 2, 3, 4].map(i => (
                        <View
                          key={i}
                          style={[s.strengthBar, { backgroundColor: i <= strength.score ? strength.color : '#E8EDF2' }]}
                        />
                      ))}
                      <Text style={[s.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
                    </View>
                  )}

                  {/* Rules checklist */}
                  {password.length > 0 && (
                    <View style={s.rules}>
                      {RULES.map(rule => {
                        const passed = rule.test(password);
                        return (
                          <View key={rule.key} style={s.ruleRow}>
                            <Ionicons
                              name={passed ? 'checkmark-circle' : 'ellipse-outline'}
                              size={14}
                              color={passed ? '#38A169' : '#C0CDD8'}
                            />
                            <Text style={[s.ruleText, passed && s.ruleTextPassed]}>{rule.label}</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>

              </Animated.View>

              {/* Error */}
              {error ? (
                <View style={s.errorBox}>
                  <Text style={s.errorText}>⚠️  {error}</Text>
                </View>
              ) : null}

              {/* Submit */}
              <View style={s.actions}>
                <TouchableOpacity onPress={handleRegister} disabled={loading} activeOpacity={0.88}>
                  <LinearGradient
                    colors={loading ? ['#9AA5B0', '#9AA5B0'] : ['#0D1B2A', '#0D1B2A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.btnPrimary}
                  >
                    {loading
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={s.btnPrimaryText}>Create account</Text>
                    }
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.replace('Login')} style={s.linkBtn} activeOpacity={0.7}>
                  <Text style={s.linkText}>Already have an account? </Text>
                  <Text style={s.link}>Sign in</Text>
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
  root:            { flex: 1, backgroundColor: '#fff' },
  inner:           { flexGrow: 1, paddingHorizontal: 28, paddingTop: 20, paddingBottom: 32, gap: 32 },
  back:            { width: 32, height: 32, borderRadius: 10, backgroundColor: '#0D1B2A', alignItems: 'center', justifyContent: 'center' },
  header:          { gap: 6 },
  title:           { color: '#0D1B2A', fontSize: 34, fontWeight: '900', letterSpacing: -1 },
  subtitle:        { color: '#8A9BB0', fontSize: 16 },
  form:            { gap: 20 },
  field:           { gap: 8 },
  label:           { color: '#0D1B2A', fontSize: 14, fontWeight: '700' },
  input:           { backgroundColor: '#F7F9FB', borderWidth: 1.5, borderColor: '#E8EDF2', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16, color: '#0D1B2A', fontSize: 16 },
  inputFocused:    { borderColor: '#0D1B2A', backgroundColor: '#fff' },
  inputRow:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F9FB', borderWidth: 1.5, borderColor: '#E8EDF2', borderRadius: 14 },
  inputInner:      { flex: 1, paddingHorizontal: 16, paddingVertical: 16, color: '#0D1B2A', fontSize: 16 },
  eyeBtn:          { paddingHorizontal: 14 },
  strengthRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  strengthBar:     { flex: 1, height: 4, borderRadius: 4 },
  strengthLabel:   { fontSize: 12, fontWeight: '700', minWidth: 44 },
  rules:           { gap: 6, marginTop: 6 },
  ruleRow:         { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ruleText:        { fontSize: 12, color: '#C0CDD8' },
  ruleTextPassed:  { color: '#38A169' },
  errorBox:        { backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#FED7D7', borderRadius: 12, padding: 14 },
  errorText:       { color: '#E53E3E', fontSize: 14 },
  actions:         { gap: 16 },
  btnPrimary:      { paddingVertical: 17, borderRadius: 14, alignItems: 'center' },
  btnPrimaryText:  { color: '#fff', fontSize: 17, fontWeight: '800' },
  linkBtn:         { flexDirection: 'row', justifyContent: 'center' },
  linkText:        { color: '#8A9BB0', fontSize: 15 },
  link:            { color: '#0D1B2A', fontSize: 15, fontWeight: '700' },
});
