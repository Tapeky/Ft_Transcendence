import { DatabaseManager } from '../database/DatabaseManager';
import { UserRepository } from '../repositories/UserRepository';
import bcrypt from 'bcrypt';

async function createTestUsers() {
  console.log('🔧 Creating test users...');
  
  // Initialize database connection
  const dbManager = DatabaseManager.getInstance();
  const db = await dbManager.connect();
  await dbManager.initialize();
  const userRepo = new UserRepository(db);
  
  const testUsers = [
    { username: 'alice', email: 'alice@test.com', display_name: 'Alice Test' },
    { username: 'bob', email: 'bob@test.com', display_name: 'Bob Test' },
    { username: 'charlie', email: 'charlie@test.com', display_name: 'Charlie Test' },
    { username: 'diana', email: 'diana@test.com', display_name: 'Diana Test' },
    { username: 'eve', email: 'eve@test.com', display_name: 'Eve Test' }
  ];
  
  const password = 'password123';
  const passwordHash = await bcrypt.hash(password, 10);
  
  for (const user of testUsers) {
    try {
      // Check if user already exists
      const existingUser = await userRepo.findByEmail(user.email);
      if (existingUser) {
        console.log(`✅ User ${user.username} already exists`);
        continue;
      }
      
      // Create user
      await userRepo.create({
        username: user.username,
        email: user.email,
        password: password, // UserRepository will hash it
        display_name: user.display_name,
        data_consent: true
      });
      
      console.log(`✅ Created user: ${user.username}`);
      
    } catch (error) {
      console.error(`❌ Failed to create user ${user.username}:`, error);
    }
  }
  
  console.log('🎉 Test users creation completed!');
  process.exit(0);
}

createTestUsers().catch(console.error);