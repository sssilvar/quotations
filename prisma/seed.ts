import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminId = "seed-admin";
  const user1Id = "seed-user1";
  const adminHash = await bcrypt.hash("admin123", 10);
  const engHash = await bcrypt.hash("userpass123", 10);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: { id: adminId, role: "admin", name: "Admin", email: "admin@soinsolar.com" },
    create: {
      id: adminId,
      username: "admin",
      passwordHash: adminHash,
      role: "admin",
      name: "Admin",
      email: "admin@soinsolar.com",
    },
  });

  await prisma.user.upsert({
    where: { username: "user1" },
    update: { id: user1Id, name: "Usuario", lastName: "Prueba", email: "user1@soinsolar.com" },
    create: {
      id: user1Id,
      username: "user1",
      passwordHash: engHash,
      role: "engineer",
      name: "Usuario",
      lastName: "Prueba",
      email: "user1@soinsolar.com",
    },
  });

  console.log("Seeded: admin/admin123, user1/userpass123");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
