import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, userOtpsTable } from "@workspace/db/schema";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";

const router: IRouter = Router();

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// POST /auth/request-otp
router.post("/auth/request-otp", async (req, res) => {
  const { phone } = req.body;
  if (!phone || typeof phone !== "string") {
    res.status(400).json({ error: "Phone number required" });
    return;
  }
  const cleaned = phone.replace(/\s+/g, "").replace(/-/g, "");

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  await db.insert(userOtpsTable).values({ phone: cleaned, otp, expiresAt });

  // In production, you'd send via SMS. For demo, return it in response.
  res.json({ success: true, otp, message: "OTP generated (demo: returned in response)" });
});

// POST /auth/verify-otp
router.post("/auth/verify-otp", async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) {
    res.status(400).json({ error: "Phone and OTP required" });
    return;
  }
  const cleaned = phone.replace(/\s+/g, "").replace(/-/g, "");

  const now = new Date();
  const otpRow = await db
    .select()
    .from(userOtpsTable)
    .where(and(eq(userOtpsTable.phone, cleaned), eq(userOtpsTable.otp, otp), eq(userOtpsTable.used, false), gt(userOtpsTable.expiresAt, now)))
    .orderBy(userOtpsTable.createdAt)
    .limit(1);

  if (!otpRow.length) {
    res.status(401).json({ error: "Invalid or expired OTP" });
    return;
  }

  // Mark OTP used
  await db.update(userOtpsTable).set({ used: true }).where(eq(userOtpsTable.id, otpRow[0].id));

  // Find or create user
  let user = await db.select().from(usersTable).where(eq(usersTable.phone, cleaned)).limit(1);
  let userData;
  if (!user.length) {
    const token = generateToken();
    const created = await db.insert(usersTable).values({ phone: cleaned, sessionToken: token, displayName: "" }).returning();
    userData = created[0];
  } else {
    const token = generateToken();
    const updated = await db.update(usersTable).set({ sessionToken: token }).where(eq(usersTable.phone, cleaned)).returning();
    userData = updated[0];
  }

  res.json({ token: userData.sessionToken, userId: userData.id, isNew: !user.length });
});

export default router;
