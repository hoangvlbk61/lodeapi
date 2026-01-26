# Lottery Management System - Backend API

Hệ thống quản lý số đề với RESTful API được xây dựng bằng Node.js, Express và MongoDB.

## Tính năng

- 🔐 Xác thực JWT
- 👥 Quản lý người dùng
- 🎫 Quản lý khách hàng
- 💰 Tính toán và lưu trữ giao dịch
- ⚙️ Cấu hình thay thế ký tự
- 📊 Báo cáo ngày và tuần
- 🔒 Bảo mật với Helmet và Rate Limiting

## Yêu cầu hệ thống

- Node.js >= 14.x
- MongoDB >= 4.x
- npm hoặc yarn

## Cài đặt

### Phương pháp 1: Sử dụng Docker (Khuyến nghị) 🐳

#### Prerequisites
- Docker Desktop hoặc Docker Engine
- Docker Compose

#### Production Mode
```bash
# Clone repository
git clone <repository-url>
cd lottery-backend

# Copy environment file
cp .env.docker .env

# Chỉnh sửa .env với thông tin của bạn (JWT_SECRET, passwords, etc.)

# Build và khởi động containers
docker-compose up -d

# Xem logs
docker-compose logs -f backend

# Dừng containers
docker-compose down

# Dừng và xóa volumes (data sẽ bị mất)
docker-compose down -v
```

#### Development Mode
```bash
# Sử dụng docker-compose.dev.yml
docker-compose -f docker-compose.dev.yml up -d

# Xem logs với live reload
docker-compose -f docker-compose.dev.yml logs -f backend
```

**Services khi chạy Docker:**
- Backend API: `http://localhost:5000`
- MongoDB: `localhost:27017`
- Mongo Express (Web Admin): `http://localhost:8081`
  - Username: admin (xem trong .env)
  - Password: pass (xem trong .env)

### Phương pháp 2: Cài đặt thủ công

#### Prerequisites
- Node.js >= 14.x
- MongoDB >= 4.x

#### Các bước cài đặt

1. Clone repository:
```bash
git clone <repository-url>
cd lottery-backend
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Tạo file `.env` từ `.env.example`:
```bash
cp .env.example .env
```

4. Cập nhật các biến môi trường trong file `.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/lottery_db
JWT_SECRET=your_secret_key_here
JWT_EXPIRE=7d
ALLOWED_ORIGINS=http://localhost:3000
```

5. Khởi động MongoDB (nếu chưa chạy):
```bash
# MacOS/Linux
mongod

# Windows
net start MongoDB
```

6. Khởi động server:
```bash
# Development mode với nodemon
npm run dev

# Production mode
npm start
```

Server sẽ chạy tại `http://localhost:5000`

## API Endpoints

### Authentication
```
POST   /api/auth/register        - Đăng ký tài khoản
POST   /api/auth/login           - Đăng nhập
GET    /api/auth/me              - Lấy thông tin user hiện tại
POST   /api/auth/change-password - Đổi mật khẩu
```

### Customers
```
GET    /api/customers            - Lấy danh sách khách hàng
GET    /api/customers/:id        - Lấy thông tin khách hàng
POST   /api/customers            - Tạo khách hàng mới
PUT    /api/customers/:id        - Cập nhật khách hàng
DELETE /api/customers/:id        - Xóa khách hàng
```

### Transactions
```
POST   /api/transactions/calculate  - Tính toán giao dịch
POST   /api/transactions/save       - Lưu giao dịch
GET    /api/transactions            - Lấy danh sách giao dịch
GET    /api/transactions/:id        - Lấy chi tiết giao dịch
DELETE /api/transactions/:id        - Xóa giao dịch
```

### Configurations
```
GET    /api/configurations           - Lấy cấu hình
PUT    /api/configurations           - Cập nhật cấu hình
POST   /api/configurations/test-replace - Test quy tắc thay thế
```

### Reports
```
GET    /api/reports/daily              - Báo cáo ngày
GET    /api/reports/weekly             - Báo cáo tuần
GET    /api/reports/available-dates    - Lấy danh sách ngày có dữ liệu
GET    /api/reports/customer-stats/:id - Thống kê khách hàng
```

## Ví dụ Request

### 1. Đăng ký tài khoản
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123",
    "fullName": "Test User"
  }'
```

### 2. Đăng nhập
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

### 3. Tạo khách hàng (cần token)
```bash
curl -X POST http://localhost:5000/api/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "customerId": "17296",
    "name": "Achu",
    "prices": {
      "de": 0.72,
      "lo": 21.7,
      "x2": 0.56,
      "x3": 0.56,
      "x4": 0.56,
      "xiuNhay": 1.1,
      "baCang": 0.72
    },
    "discountPercent": 100
  }'
```

### 4. Tính toán giao dịch
```bash
curl -X POST http://localhost:5000/api/transactions/calculate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "customerId": "CUSTOMER_ID",
    "date": "2026-01-24",
    "rawData": "12 100\n34 50\n56.1 30",
    "type": "receive"
  }'
```

## Database Schema

Xem chi tiết database schema trong file `API_DESIGN.md`.

## Scripts

```bash
npm start          # Khởi động server production
npm run dev        # Khởi động server development với nodemon
npm test           # Chạy tests
```

## Docker Commands

### Production
```bash
# Build và start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build

# Remove all (including data)
docker-compose down -v
```

### Development
```bash
# Start with hot reload
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f backend

# Stop
docker-compose -f docker-compose.dev.yml down
```

### Useful Docker Commands
```bash
# Execute commands in running container
docker-compose exec backend sh

# View MongoDB logs
docker-compose logs mongodb

# Restart specific service
docker-compose restart backend

# Check container status
docker-compose ps

# View resource usage
docker stats
```

## Bảo mật

- Mật khẩu được mã hóa bằng bcrypt
- Xác thực JWT với token hết hạn
- Helmet.js cho HTTP headers security
- Rate limiting để chống DDoS
- CORS configuration
- Input validation

## Cấu trúc thư mục

```
lottery-backend/
├── src/
│   ├── config/           # Cấu hình database, etc.
│   ├── controllers/      # Request handlers
│   ├── middlewares/      # Custom middlewares
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   └── server.js        # Entry point
├── tests/               # Test files
├── .env.example         # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

## Môi trường phát triển

- Node.js v18+
- Express.js v4
- MongoDB v6+
- Mongoose ODM
- JWT cho authentication

## License

ISC

## Liên hệ

Nếu có câu hỏi hoặc vấn đề, vui lòng tạo issue trên GitHub.