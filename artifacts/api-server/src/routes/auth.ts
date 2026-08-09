import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { getDb } from "../lib/mongodb";
import { signToken } from "../middlewares/auth";
import { LoginBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { username, password } = parsed.data;
  const db = getDb();

  const user = await db.collection("users").findOne({ username });
  if (!user) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  if (!user.passwordHash || typeof user.passwordHash !== 'string') {
    res.status(500).json({ error: "Invalid user data: password hash missing" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const token = signToken({ userId: user.id, username: user.username, role: user.role });
  req.log.info({ username: user.username }, "User logged in");
  res.json({ token, username: user.username, role: user.role });
});

export default router;
