require('dotenv').config();
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@travelspot.com' },
    update: {},
    create: {
      full_name: 'System Admin',
      email: 'admin@travelspot.com',
      password_hash: adminPassword,
      role: 'ADMIN',
      avatar_url: null
    }
  });

  const categories = [
    { name: 'Beach', description: 'Beautiful beach destinations', icon: 'beach' },
    { name: 'Mountain', description: 'Mountain and hiking spots', icon: 'mountain' },
    { name: 'Historical', description: 'Historical and cultural places', icon: 'landmark' }
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: category,
      create: category
    });
  }

  console.log('Seed completed successfully');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
