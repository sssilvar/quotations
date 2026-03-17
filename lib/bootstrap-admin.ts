import * as bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const DEFAULT_BOOTSTRAP_ADMIN = {
  username: "admin",
  password: "admin123",
  name: "Admin",
  email: "admin@soinsolar.com",
} as const;

function getBootstrapAdminConfig() {
  return {
    username:
      process.env.BOOTSTRAP_ADMIN_USERNAME?.trim() ||
      DEFAULT_BOOTSTRAP_ADMIN.username,
    password:
      process.env.BOOTSTRAP_ADMIN_PASSWORD?.trim() ||
      DEFAULT_BOOTSTRAP_ADMIN.password,
    name:
      process.env.BOOTSTRAP_ADMIN_NAME?.trim() || DEFAULT_BOOTSTRAP_ADMIN.name,
    email:
      process.env.BOOTSTRAP_ADMIN_EMAIL?.trim() || DEFAULT_BOOTSTRAP_ADMIN.email,
  };
}

let bootstrapPromise: Promise<void> | null = null;

export async function ensureBootstrapAdmin() {
  if (bootstrapPromise) {
    await bootstrapPromise;
    return;
  }

  bootstrapPromise = (async () => {
    const userCount = await prisma.user.count();
    if (userCount > 0) return;

    const config = getBootstrapAdminConfig();
    const passwordHash = await bcrypt.hash(config.password, 10);

    await prisma.user.upsert({
      where: { username: config.username },
      update: {
        role: "admin",
        name: config.name,
        email: config.email,
        passwordHash,
      },
      create: {
        username: config.username,
        passwordHash,
        role: "admin",
        name: config.name,
        email: config.email,
      },
    });

    console.log(
      `[auth] Bootstrapped initial admin user "${config.username}" because the database was empty.`
    );
  })();

  try {
    await bootstrapPromise;
  } finally {
    bootstrapPromise = null;
  }
}
