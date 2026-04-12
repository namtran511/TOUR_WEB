const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get admin user
  const admin = await prisma.user.findUnique({ where: { email: 'admin@travelspot.com' } });
  if (!admin) {
    console.log('Admin not found!');
    return;
  }

  // Ensure category exists
  let category = await prisma.category.findFirst({ where: { name: 'Du lịch khám phá' } });
  if (!category) {
    category = await prisma.category.create({
      data: { name: 'Du lịch khám phá', description: 'Khám phá thiên nhiên và văn hóa' }
    });
  }

  const spots = [
    {
      name: 'Vịnh Hạ Long',
      description: 'Di sản thiên nhiên thế giới với hàng nghìn hòn đảo đá vôi kỳ vĩ.',
      address: 'Vịnh Hạ Long, tỉnh Quảng Ninh',
      city: 'Quảng Ninh',
      latitude: 20.9101,
      longitude: 107.1839,
      category_id: category.id,
      image_url: 'https://images.unsplash.com/photo-1528127269322-539801943592?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      created_by: admin.id,
      average_rating: 4.8
    },
    {
      name: 'Phố cổ Hội An',
      description: 'Di sản văn hóa thế giới với những ngôi nhà cổ kính màu vàng và đèn lồng lung linh.',
      address: 'Phường Minh An, TP. Hội An',
      city: 'Quảng Nam',
      latitude: 15.8794,
      longitude: 108.3283,
      category_id: category.id,
      image_url: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      created_by: admin.id,
      average_rating: 4.9
    },
    {
      name: 'Bà Nà Hills',
      description: 'Khu du lịch trên đỉnh núi Chúa với Cầu Vàng vô cùng nổi tiếng.',
      address: 'Hòa Ninh, Hòa Vang',
      city: 'Đà Nẵng',
      latitude: 15.9984,
      longitude: 107.9882,
      category_id: category.id,
      image_url: 'https://plus.unsplash.com/premium_photo-1667055743132-2d88adbc60a7?q=80&w=3438&auto=format&fit=crop&ixlib=rb-4.0.3',
      created_by: admin.id,
      average_rating: 4.7
    },
    {
      name: 'Đảo Phú Quốc',
      description: 'Đảo ngọc lớn nhất Việt Nam với những bãi biển trong xanh.',
      address: 'Thành phố Phú Quốc',
      city: 'Kiên Giang',
      latitude: 10.2289,
      longitude: 103.9572,
      category_id: category.id,
      image_url: 'https://images.unsplash.com/photo-1520660233405-b04bfa4a6e09?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      created_by: admin.id,
      average_rating: 4.8
    },
    {
      name: 'Sa Pa',
      description: 'Thị trấn mờ sương với cảnh ruộng bậc thang ngoạn mục.',
      address: 'Thị xã Sa Pa',
      city: 'Lào Cai',
      latitude: 22.3364,
      longitude: 103.8438,
      category_id: category.id,
      image_url: 'https://images.unsplash.com/photo-1549463934-8c838e78cdbe?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      created_by: admin.id,
      average_rating: 4.6
    },
    {
      name: 'Tràng An',
      description: 'Khu du lịch sinh thái kết hợp núi non và di tích lịch sử.',
      address: 'Xã Trường Yên, Hoa Lư',
      city: 'Ninh Bình',
      latitude: 20.2587,
      longitude: 105.9085,
      category_id: category.id,
      image_url: 'https://images.unsplash.com/photo-1698299292850-d463b2fba6b1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      created_by: admin.id,
      average_rating: 4.9
    },
    {
      name: 'Đà Lạt',
      description: 'Thành phố ngàn hoa với khí hậu mát mẻ quanh năm.',
      address: 'Trung tâm thành phố',
      city: 'Lâm Đồng',
      latitude: 11.9404,
      longitude: 108.4384,
      category_id: category.id,
      image_url: 'https://images.unsplash.com/photo-1627402636594-c7da98fc2062?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      created_by: admin.id,
      average_rating: 4.8
    },
    {
      name: 'Vườn Quốc gia Phong Nha - Kẻ Bàng',
      description: 'Di sản thế giới với hệ thống hang động đá vôi hùng vĩ nhất thế giới.',
      address: 'Thị trấn Phong Nha, Bố Trạch',
      city: 'Quảng Bình',
      latitude: 17.5925,
      longitude: 106.3262,
      category_id: category.id,
      image_url: 'https://images.unsplash.com/photo-1601736631559-67341fe0374e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      created_by: admin.id,
      average_rating: 4.7
    },
    {
      name: 'Mũi Né',
      description: 'Thiên đường nghỉ dưỡng với những đồi cát bay trứ danh.',
      address: 'Khoảnh 3, Mũi Né',
      city: 'Bình Thuận',
      latitude: 10.9333,
      longitude: 108.2833,
      category_id: category.id,
      image_url: 'https://images.unsplash.com/photo-1616147481745-f04bf491a6d9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      created_by: admin.id,
      average_rating: 4.5
    },
    {
      name: 'Hoàng Thành Thăng Long',
      description: 'Quần thể di tích lịch sử gắn liền với lịch sử ngàn năm văn hiến.',
      address: '19C Hoàng Diệu, Ba Đình',
      city: 'Hà Nội',
      latitude: 21.0366,
      longitude: 105.8385,
      category_id: category.id,
      image_url: 'https://images.unsplash.com/photo-1598442127599-2e65d218dcde?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
      created_by: admin.id,
      average_rating: 4.4
    }
  ];

  for (const s of spots) {
    await prisma.spot.create({ data: s });
  }

  console.log('Seeded 10 places!');
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
