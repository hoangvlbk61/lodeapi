const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Vui lòng nhập tên đăng nhập'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Tên đăng nhập phải có ít nhất 3 ký tự'],
      maxlength: [50, 'Tên đăng nhập không được quá 50 ký tự'],
    },
    password: {
      type: String,
      required: [true, 'Vui lòng nhập mật khẩu'],
      minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự'],
      select: false,
    },
    fullName: {
      type: String,
      trim: true,
      maxlength: [100, 'Họ tên không được quá 100 ký tự'],
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    featureExpiry: {
      type: Date,
      default: () => new Date(Date.now() + 50 * 24 * 60 * 60 * 1000), // 50 days
    },
    transferExpiry: {
      type: Date,
      default: () => new Date(Date.now() - 203 * 24 * 60 * 60 * 1000), // -203 days (expired)
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to check if features are expired
userSchema.methods.isFeatureExpired = function () {
  return this.featureExpiry < new Date();
};

userSchema.methods.isTransferExpired = function () {
  return this.transferExpiry < new Date();
};

// Method to get days until expiry
userSchema.methods.getDaysUntilExpiry = function (field = 'featureExpiry') {
  const now = new Date();
  const expiryDate = this[field];
  const diffTime = expiryDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const User = mongoose.model('User', userSchema);

module.exports = User;