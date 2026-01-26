# Docker Deployment Guide

Hướng dẫn chi tiết về cách triển khai hệ thống Lottery Management với Docker.

## 📋 Tổng quan

Hệ thống bao gồm 3 services chính:
1. **Backend API** - Node.js/Express application
2. **MongoDB** - Database
3. **Mongo Express** - Web-based MongoDB admin interface (optional)

## 🚀 Quick Start

### 1. Cài đặt Docker

#### Windows
- Tải [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
- Chạy installer và khởi động lại máy
- Mở Docker Desktop để khởi động Docker daemon

#### macOS
- Tải [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)
- Kéo Docker vào Applications
- Mở Docker từ Applications

#### Linux
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Khởi động Docker
sudo systemctl start docker
sudo systemctl enable docker
```

### 2. Kiểm tra cài đặt
```bash
docker --version
docker-compose --version
```

## 🔧 Configuration

### Environment Variables

Copy file `.env.docker` thành `.env`:
```bash
cp .env.docker .env
```

**Các biến quan trọng cần thay đổi:**

```env
# Security - ĐỔI NGAY CHO PRODUCTION!
MONGO_ROOT_PASSWORD=your_secure_mongodb_password_here
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
MONGOEXPRESS_PASSWORD=your_mongo_express_password

# Application
NODE_ENV=production
PORT=5000

# MongoDB
MONGO_ROOT_USERNAME=admin
MONGO_DATABASE=lottery_db

# CORS - Thêm domain frontend của bạn
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

## 🏗️ Build và Deploy

### Production Deployment

```bash
# 1. Build images
docker-compose build

# 2. Start services
docker-compose up -d

# 3. Verify services are running
docker-compose ps

# 4. Check logs
docker-compose logs -f backend
```

### Development Deployment

```bash
# Start with hot reload
docker-compose -f docker-compose.dev.yml up -d

# Code changes will automatically reload the server
```

## 📊 Accessing Services

Sau khi khởi động, các services sẽ có sẵn tại:

| Service | URL | Credentials |
|---------|-----|-------------|
| Backend API | http://localhost:5000 | - |
| Health Check | http://localhost:5000/health | - |
| MongoDB | localhost:27017 | Username: admin<br>Password: (từ .env) |
| Mongo Express | http://localhost:8081 | Username: admin<br>Password: (từ .env) |

## 🔍 Monitoring và Debugging

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f mongodb

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Check Container Status

```bash
# List running containers
docker-compose ps

# Detailed container info
docker inspect lottery-backend

# Check resource usage
docker stats
```

### Execute Commands in Container

```bash
# Access backend container shell
docker-compose exec backend sh

# Access MongoDB shell
docker-compose exec mongodb mongosh -u admin -p

# Run npm commands
docker-compose exec backend npm run test
```

## 🗄️ Database Management

### Backup Database

```bash
# Create backup
docker-compose exec -T mongodb mongodump \
  --username=admin \
  --password=your_password \
  --authenticationDatabase=admin \
  --db=lottery_db \
  --archive=/data/backup.archive

# Copy backup to host
docker cp lottery-mongodb:/data/backup.archive ./backup-$(date +%Y%m%d).archive
```

### Restore Database

```bash
# Copy backup to container
docker cp ./backup.archive lottery-mongodb:/data/backup.archive

# Restore
docker-compose exec mongodb mongorestore \
  --username=admin \
  --password=your_password \
  --authenticationDatabase=admin \
  --db=lottery_db \
  --archive=/data/backup.archive
```

### Access MongoDB directly

```bash
# MongoDB shell
docker-compose exec mongodb mongosh -u admin -p

# Run query
docker-compose exec mongodb mongosh -u admin -p lottery_db --eval "db.users.find().pretty()"
```

## 🔄 Updates và Maintenance

### Update Application Code

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose up -d --build backend
```

### Update Docker Images

```bash
# Pull latest base images
docker-compose pull

# Recreate containers with new images
docker-compose up -d --force-recreate
```

### Clean Up

```bash
# Stop and remove containers
docker-compose down

# Remove containers and volumes (DATA WILL BE LOST!)
docker-compose down -v

# Remove unused images
docker image prune -a

# Remove all unused resources
docker system prune -a --volumes
```

## 🛡️ Security Best Practices

### 1. Production Checklist

- [ ] Change all default passwords in `.env`
- [ ] Use strong JWT_SECRET (minimum 32 characters)
- [ ] Update ALLOWED_ORIGINS with actual frontend domains
- [ ] Don't expose MongoDB port (27017) in production
- [ ] Consider removing Mongo Express in production
- [ ] Use HTTPS with reverse proxy (nginx/traefik)
- [ ] Enable Docker secrets for sensitive data
- [ ] Regular security updates: `docker-compose pull`

### 2. Firewall Configuration

```bash
# Only allow necessary ports
sudo ufw allow 5000/tcp  # Backend API
sudo ufw allow 80/tcp    # HTTP (if using nginx)
sudo ufw allow 443/tcp   # HTTPS (if using nginx)

# Deny MongoDB external access
sudo ufw deny 27017/tcp
```

### 3. Use Docker Secrets (Advanced)

```yaml
# docker-compose.prod.yml
secrets:
  mongodb_password:
    file: ./secrets/mongodb_password.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt

services:
  backend:
    secrets:
      - jwt_secret
      - mongodb_password
```

## 🐛 Troubleshooting

### Issue: Container won't start

```bash
# Check logs
docker-compose logs backend

# Check container status
docker-compose ps

# Restart service
docker-compose restart backend
```

### Issue: MongoDB connection failed

```bash
# Check MongoDB is running
docker-compose ps mongodb

# Check MongoDB logs
docker-compose logs mongodb

# Test connection
docker-compose exec mongodb mongosh -u admin -p
```

### Issue: Port already in use

```bash
# Find process using port 5000
lsof -i :5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows

# Change port in .env
PORT=5001
```

### Issue: Out of disk space

```bash
# Check disk usage
docker system df

# Clean up
docker system prune -a --volumes
```

## 📈 Scaling (Advanced)

### Horizontal Scaling

```yaml
# docker-compose.scale.yml
services:
  backend:
    deploy:
      replicas: 3
    
  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    ports:
      - "80:80"
    depends_on:
      - backend
```

```bash
# Scale to 3 instances
docker-compose -f docker-compose.yml -f docker-compose.scale.yml up -d --scale backend=3
```

## 🔗 Integration with CI/CD

### GitHub Actions Example

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /path/to/lottery-backend
            git pull origin main
            docker-compose up -d --build
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [MongoDB Docker Hub](https://hub.docker.com/_/mongo)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)

## 🆘 Support

Nếu gặp vấn đề:
1. Kiểm tra logs: `docker-compose logs -f`
2. Xem documentation trong README.md
3. Tạo issue trên GitHub repository