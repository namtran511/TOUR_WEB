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

  const vouchers = [
    {
      code: 'SUMMER10',
      name: 'Summer 10%',
      description: 'Giảm 10% cho booking từ 500.000 VND',
      type: 'PERCENT',
      value: 10,
      max_discount: 300000,
      min_booking_amount: 500000,
      usage_limit: 100,
      expires_at: new Date('2026-12-31T23:59:59.000Z')
    },
    {
      code: 'WELCOME200K',
      name: 'Welcome 200K',
      description: 'Giảm trực tiếp 200.000 VND cho người dùng mới',
      type: 'FIXED',
      value: 200000,
      max_discount: null,
      min_booking_amount: 1500000,
      usage_limit: 50,
      expires_at: new Date('2026-12-31T23:59:59.000Z')
    }
  ];

  for (const voucher of vouchers) {
    await prisma.voucher.upsert({
      where: { code: voucher.code },
      update: voucher,
      create: voucher
    });
  }

  const spots = await prisma.spot.findMany({
    include: {
      departures: true
    }
  });

  for (const spot of spots) {
    if (spot.departures.length > 0) continue;

    const base = new Date();
    base.setMinutes(0, 0, 0);

    const departures = [1, 3, 5].map((dayOffset, index) => {
      const start = new Date(base);
      start.setDate(start.getDate() + dayOffset);
      start.setHours(8 + index * 2, 0, 0, 0);

      const end = new Date(start);
      end.setHours(end.getHours() + 4);

      return {
        spot_id: spot.id,
        label: `Khởi hành ${index + 1}`,
        start_time: start,
        end_time: end,
        capacity: 20,
        booked_count: 0,
        confirmation_type: index === 0 ? 'INSTANT' : 'MANUAL',
        is_active: true
      };
    });

    await prisma.spotDeparture.createMany({
      data: departures
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
