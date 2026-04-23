import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, KeyRound, ArrowRight, Loader2, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import { requestOtp, verifyOtp } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

function formatPhone(val: string): string {
  const digits = val.replace(/\D/g, "");
  if (digits.startsWith("972")) return "+" + digits;
  if (digits.startsWith("0")) return "+972" + digits.slice(1);
  return digits;
}

const DEMO_PHONE = "+972501234567";

export default function AuthPage() {
  const { setToken, refreshUser } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"phone" | "otp" | "done">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [demoOtp, setDemoOtp] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    setError("");
    try {
      const res = await requestOtp(DEMO_PHONE);
      const verify = await verifyOtp(DEMO_PHONE, res.otp);
      setStep("done");
      setTimeout(async () => {
        setToken(verify.token);
        await refreshUser();
        navigate("/");
      }, 600);
    } catch (err: any) {
      setError(err.message || "Demo login failed");
    } finally {
      setDemoLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    setError("");
    try {
      const formatted = formatPhone(phone.trim());
      const res = await requestOtp(formatted);
      setDemoOtp(res.otp); // demo mode: show OTP
      setPhone(formatted);
      setStep("otp");
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    setLoading(true);
    setError("");
    try {
      const res = await verifyOtp(phone, otp);
      setStep("done");
      setTimeout(async () => {
        setToken(res.token);
        await refreshUser();
        navigate("/");
      }, 800);
    } catch (err: any) {
      setError(err.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background gradient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-3xl bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-primary/10">
            <span className="text-4xl">🎓</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Campus</h1>
          <p className="text-muted-foreground text-sm mt-1">Connect with people around you</p>
        </div>

        <AnimatePresence mode="wait">
          {step === "phone" && (
            <motion.form key="phone" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Phone number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="05X-XXX-XXXX" autoFocus
                    className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
                  />
                </div>
              </div>
              {error && <p className="text-destructive text-xs">{error}</p>}
              <button type="submit" disabled={loading || !phone.trim()}
                className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Get OTP <ArrowRight className="w-4 h-4" /></>}
              </button>
              <div className="relative flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <button type="button" onClick={handleDemoLogin} disabled={demoLoading}
                className="w-full py-3.5 rounded-xl bg-secondary border border-border text-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-secondary/80 active:scale-[0.98] transition-all disabled:opacity-50">
                {demoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>🗺️ View Map Demo</>}
              </button>
              <p className="text-center text-xs text-muted-foreground">
                By continuing you agree to our Terms of Service
              </p>
            </motion.form>
          )}

          {step === "otp" && (
            <motion.form key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Verification code</label>
                <p className="text-xs text-muted-foreground mb-3">Sent to {phone}</p>

                {/* Demo notice */}
                {demoOtp && (
                  <div className="bg-accent/10 border border-accent/30 rounded-lg px-4 py-3 mb-4 flex items-center gap-3">
                    <span className="text-accent text-lg">🧪</span>
                    <div>
                      <p className="text-xs text-accent font-semibold">Demo Mode — No SMS sent</p>
                      <p className="text-sm font-mono font-bold text-foreground mt-0.5 tracking-widest">{demoOtp}</p>
                    </div>
                  </div>
                )}

                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                    value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000" autoFocus
                    className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-xl text-center font-mono tracking-[0.5em]"
                  />
                </div>
              </div>
              {error && <p className="text-destructive text-xs">{error}</p>}
              <button type="submit" disabled={loading || otp.length !== 6}
                className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Verify & Enter <ArrowRight className="w-4 h-4" /></>}
              </button>
              <button type="button" onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
                className="w-full text-muted-foreground text-sm py-2 hover:text-foreground transition-colors">
                ← Change number
              </button>
            </motion.form>
          )}

          {step === "done" && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
              <p className="text-foreground font-semibold text-lg">You're in! 🎉</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
