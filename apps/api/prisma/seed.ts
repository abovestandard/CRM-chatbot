import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD ?? "ChangeMe123!";

  const passwordHash = await bcrypt.hash(password, 10);
  const superAdmin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, role: "SUPER_ADMIN" },
  });

  console.log(`Super Admin ready: ${superAdmin.email} (password: ${password})`);

  const demoWebsite = await prisma.website.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Demo Website",
      domain: "demo.example.com",
      platform: "WORDPRESS",
      status: "DRAFT",
      createdBy: superAdmin.id,
    },
  });

  console.log(`Demo website ready: ${demoWebsite.name} (${demoWebsite.id})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
