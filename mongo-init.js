// MongoDB initialization script
// This script runs when the MongoDB container is first created

// Switch to the lottery_db database
db = db.getSiblingDB('lottery_db');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['username', 'password', 'role'],
      properties: {
        username: {
          bsonType: 'string',
          description: 'Username must be a string and is required'
        },
        password: {
          bsonType: 'string',
          description: 'Password must be a string and is required'
        },
        role: {
          enum: ['user', 'admin'],
          description: 'Role must be either user or admin'
        },
        fullName: {
          bsonType: 'string',
          description: 'Full name must be a string'
        },
        isActive: {
          bsonType: 'bool',
          description: 'Active status must be a boolean'
        }
      }
    }
  }
});

db.createCollection('customers');
db.createCollection('transactions');
db.createCollection('configurations');

// Create indexes for better performance
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ createdAt: -1 });

db.customers.createIndex({ userId: 1, customerId: 1 }, { unique: true });
db.customers.createIndex({ userId: 1, status: 1 });

db.transactions.createIndex({ userId: 1, date: -1 });
db.transactions.createIndex({ customerId: 1, date: -1 });
db.transactions.createIndex({ userId: 1, customerId: 1, date: -1 });

db.configurations.createIndex({ userId: 1 }, { unique: true });

print('✅ Database initialization completed successfully');
print('📊 Collections created: users, customers, transactions, configurations');
print('🔍 Indexes created for optimal query performance');