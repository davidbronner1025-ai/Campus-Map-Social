import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { requestOtp, verifyOtp } from "../api/client";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { useAuth } from "../state/AuthContext";
import { colors, radius, spacing } from "../theme";
import { formatPhone } from "../utils/format";

const DEMO_PHONE = "+972501234567";

export function AuthScreen() {
  const { setToken, refreshUser } = useAuth();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [demoOtp, setDemoOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const signInWithOtp = async () => {
    setLoading(true);
    setError("");
    try {
      const formatted = formatPhone(phone);
      const res = await requestOtp(formatted);
      setPhone(formatted);
      setDemoOtp(res.otp);
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await verifyOtp(phone, otp);
      await setToken(res.token);
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const demo = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await requestOtp(DEMO_PHONE);
      const verified = await verifyOtp(DEMO_PHONE, res.otp);
      await setToken(verified.token);
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.wrap}>
        <View style={styles.brandMark}>
          <Text style={styles.brandLetter}>C</Text>
        </View>
        <Text style={styles.title}>Campus</Text>
        <Text style={styles.subtitle}>People, events, and chats around your campus.</Text>

        <View style={styles.panel}>
          {step === "phone" ? (
            <>
              <Text style={styles.label}>Phone number</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="05X-XXX-XXXX"
                placeholderTextColor={colors.muted}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                style={styles.input}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <PrimaryButton label="Get OTP" onPress={signInWithOtp} loading={loading} disabled={!phone.trim()} />
              <PrimaryButton label="Open demo" tone="secondary" onPress={demo} loading={loading} />
            </>
          ) : (
            <>
              <Text style={styles.label}>Verification code</Text>
              <Text style={styles.help}>Sent to {phone}</Text>
              {demoOtp ? <Text style={styles.demo}>Demo OTP: {demoOtp}</Text> : null}
              <TextInput
                value={otp}
                onChangeText={(value) => setOtp(value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                maxLength={6}
                style={[styles.input, styles.otp]}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <PrimaryButton label="Verify" onPress={verify} loading={loading} disabled={otp.length !== 6} />
              <PrimaryButton label="Change number" tone="secondary" onPress={() => setStep("phone")} />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md
  },
  brandMark: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    borderWidth: 1,
    borderColor: colors.border
  },
  brandLetter: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "900"
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "900",
    textAlign: "center"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.lg
  },
  panel: {
    gap: spacing.md
  },
  label: {
    color: colors.text,
    fontWeight: "700"
  },
  help: {
    color: colors.muted
  },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    fontSize: 16
  },
  otp: {
    textAlign: "center",
    letterSpacing: 8,
    fontSize: 22,
    fontWeight: "800"
  },
  demo: {
    color: colors.accent,
    fontWeight: "800"
  },
  error: {
    color: colors.danger
  }
});
