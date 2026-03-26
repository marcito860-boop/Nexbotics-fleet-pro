import bcrypt from 'bcryptjs';
import { Admin } from '../models';
import sequelize from '../config/database';

const seedDatabase = async () => {
  try {
    // Sync database
    await sequelize.sync({ alter: true });
    console.log('Database synced successfully');

    // Check if admin exists
    const existingAdmin = await Admin.findOne({
      where: { username: process.env.ADMIN_USERNAME || 'admin' }
    });

    if (!existingAdmin) {
      // Create default admin
      const hashedPassword = await bcrypt.hash(
        process.env.ADMIN_PASSWORD || 'admin123',
        10
      );

      await Admin.create({
        username: process.env.ADMIN_USERNAME || 'admin',
        password_hash: hashedPassword
      });

      console.log('Default admin created successfully');
    } else {
      console.log('Admin already exists');
    }

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();