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

type Props = NativeStackScreenProps<AuthStackParams, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [focused, setFocused]   = useState<string | null>(null);
  const setAuth = useAuthStore((s) => s.setAuth);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  function shake() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 5,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -5, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 55, useNativeDriver: true }),
    ]).start();
  }

  async function handleLogin() {
    setError('');
    if (!phone.trim() || !password.trim()) {
      setError('Phone and password are required'); shake(); return;
    }
    const formatted = phone.startsWith('0') ? '+27' + phone.slice(1) : phone;
    setLoading(true);
    try {
      const res = await authService.login(formatted, password);
      setAuth(res.user, res.access_token, res.refresh_token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
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
                <Text style={s.title}>Welcome{'\n'}back</Text>
                <Text style={s.subtitle}>Sign in to your Connex account</Text>
              </View>

              {/* Form */}
              <Animated.View style={[s.form, { transform: [{ translateX: shakeAnim }] }]}>

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

                <View style={s.field}>
                  <Text style={s.label}>Password</Text>
                  <TextInput
                    style={[s.input, focused === 'pass' && s.inputFocused]}
                    placeholder="Your password"
                    placeholderTextColor="#C0CDD8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    onFocus={() => setFocused('pass')}
                    onBlur={() => setFocused(null)}
                  />
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
                <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.88}>
                  <LinearGradient
                    colors={loading ? ['#9AA5B0', '#9AA5B0'] : ['#0D1B2A', '#0D1B2A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.btnPrimary}
                  >
                    {loading
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={s.btnPrimaryText}>Sign in</Text>
                    }
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.replace('Register')} style={s.linkBtn} activeOpacity={0.7}>
                  <Text style={s.linkText}>Don't have an account? </Text>
                  <Text style={s.link}>Create one free</Text>
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
  root:          { flex: 1, backgroundColor: '#fff' },
  inner:         { flexGrow: 1, paddingHorizontal: 28, paddingTop: 20, paddingBottom: 32, gap: 32 },
  back:          { width: 32, height: 32, borderRadius: 10, backgroundColor: '#0D1B2A', alignItems: 'center', justifyContent: 'center' },
  header:        { gap: 6 },
  title:         { color: '#0D1B2A', fontSize: 38, fontWeight: '900', letterSpacing: -1.5 },
  subtitle:      { color: '#8A9BB0', fontSize: 16 },
  form:          { gap: 20 },
  field:         { gap: 8 },
  label:         { color: '#0D1B2A', fontSize: 14, fontWeight: '700' },
  input:         { backgroundColor: '#F7F9FB', borderWidth: 1.5, borderColor: '#E8EDF2', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16, color: '#0D1B2A', fontSize: 16 },
  inputFocused:  { borderColor: '#0D1B2A', backgroundColor: '#fff' },
  errorBox:      { backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#FED7D7', borderRadius: 12, padding: 14 },
  errorText:     { color: '#E53E3E', fontSize: 14 },
  actions:       { gap: 16 },
  btnPrimary:    { paddingVertical: 17, borderRadius: 14, alignItems: 'center' },
  btnPrimaryText:{ color: '#fff', fontSize: 17, fontWeight: '800' },
  linkBtn:       { flexDirection: 'row', justifyContent: 'center' },
  linkText:      { color: '#8A9BB0', fontSize: 15 },
  link:          { color: '#0D1B2A', fontSize: 15, fontWeight: '700' },
});
