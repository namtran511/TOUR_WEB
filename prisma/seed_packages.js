const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addPackages() {
  const spots = await prisma.spot.findMany({
    include: { packages: true }
  });

  for (const spot of spots) {
    if (spot.packages.length === 0) {
      await prisma.spotPackage.createMany({
        data: [
          {
            spot_id: spot.id,
            name: "Gói Phổ Thông",
            description: "Bao gồm vé vào cửa và dịch vụ tiêu chuẩn",
            price: 500000
          },
          {
            spot_id: spot.id,
            name: "Gói Nâng Cao",
            description: "Thêm dịch vụ ăn uống và hướng dẫn viên",
            price: 1500000
          },
          {
            spot_id: spot.id,
            name: "Gói Cao Cấp (VIP)",
            description: "Trải nghiệm sang trọng và xeưa đón tận nơi",
            price: 3500000
          }
        ]
      });
      console.log(`Đã thêm gói cho địa điểm: ${spot.name}`);
    }
  }

  console.log('Hoàn tất thêm gói tự động!');
}

addPackages()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
