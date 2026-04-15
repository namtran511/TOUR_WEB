const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addPackages() {
  const spots = await prisma.spot.findMany({
    include: { packages: true, departures: true }
  });

  for (const spot of spots) {
    if (spot.packages.length === 0) {
      await prisma.spotPackage.createMany({
        data: [
          {
            spot_id: spot.id,
            name: 'Gói Phổ Thông',
            description: 'Bao gồm vé vào cửa và dịch vụ tiêu chuẩn',
            price: 500000,
            duration_minutes: 240,
            meeting_point: 'Sảnh chính',
            pickup_included: false,
            free_cancel_before_hours: 48,
            refund_percent_before: 100,
            refund_percent_after: 0
          },
          {
            spot_id: spot.id,
            name: 'Gói Nâng Cao',
            description: 'Thêm dịch vụ ăn uống và hướng dẫn viên',
            price: 1500000,
            duration_minutes: 360,
            meeting_point: 'Sảnh chính',
            pickup_included: true,
            pickup_note: 'Đón trong khu vực trung tâm',
            pickup_area: 'Trung tâm thành phố',
            free_cancel_before_hours: 48,
            refund_percent_before: 100,
            refund_percent_after: 25
          },
          {
            spot_id: spot.id,
            name: 'Gói Cao Cấp (VIP)',
            description: 'Trải nghiệm sang trọng và xe đưa đón tận nơi',
            price: 3500000,
            duration_minutes: 480,
            meeting_point: 'Sảnh VIP',
            pickup_included: true,
            pickup_note: 'Đón tận nơi',
            pickup_area: 'Nội thành',
            free_cancel_before_hours: 72,
            refund_percent_before: 100,
            refund_percent_after: 50
          }
        ]
      });

      console.log(`Đã thêm gói cho địa điểm: ${spot.name}`);
    }

    if (spot.departures.length === 0) {
      const now = new Date();
      now.setMinutes(0, 0, 0);

      const departures = [1, 2, 4].map((offset, index) => {
        const start = new Date(now);
        start.setDate(start.getDate() + offset);
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

      await prisma.spotDeparture.createMany({ data: departures });
      console.log(`Đã thêm departure cho địa điểm: ${spot.name}`);
    }
  }

  console.log('Hoàn tất thêm gói và departure tự động!');
}

addPackages()
  .catch((error) => console.error(error))
  .finally(() => prisma.$disconnect());
