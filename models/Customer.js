const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    customerId: {
      type: String,
      required: [true, 'Vui lòng nhập mã khách hàng'],
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Vui lòng nhập tên khách hàng'],
      trim: true,
      maxlength: [100, 'Tên khách hàng không được quá 100 ký tự'],
    },
    prices: {
      de: {
        type: Number,
        default: 0.72,
        min: [0, 'Giá không được âm'],
      },
      lo: {
        type: Number,
        default: 21.7,
        min: [0, 'Giá không được âm'],
      },
      x2: {
        type: Number,
        default: 0.56,
        min: [0, 'Giá không được âm'],
      },
      x3: {
        type: Number,
        default: 0.56,
        min: [0, 'Giá không được âm'],
      },
      x4: {
        type: Number,
        default: 0.56,
        min: [0, 'Giá không được âm'],
      },
      xiuNhay: {
        type: Number,
        default: 1.1,
        min: [0, 'Giá không được âm'],
      },
      baCang: {
        type: Number,
        default: 0.72,
        min: [0, 'Giá không được âm'],
      },
    },
    rewards: {
      thuongDe: {
        type: Number,
        default: 70,
        min: [0, 'Thưởng không được âm'],
      },
      thuongLo: {
        type: Number,
        default: 80,
        min: [0, 'Thưởng không được âm'],
      },
      thuongX2: {
        type: Number,
        default: 10,
        min: [0, 'Thưởng không được âm'],
      },
      thuongX3: {
        type: Number,
        default: 40,
        min: [0, 'Thưởng không được âm'],
      },
      thuongX4: {
        type: Number,
        default: 100,
        min: [0, 'Thưởng không được âm'],
      },
      thuongBaCang: {
        type: Number,
        default: 400,
        min: [0, 'Thưởng không được âm'],
      },
    },
    discountPercent: {
      type: Number,
      default: 100,
      min: [0, 'Phần trăm chiết khấu không được âm'],
      max: [100, 'Phần trăm chiết khấu không được quá 100'],
    },
    type: {
      type: String,
      enum: ['customer', 'agent'],
      default: 'customer',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for userId and customerId
customerSchema.index({ userId: 1, customerId: 1 }, { unique: true });

// Method to calculate total for a transaction
customerSchema.methods.calculateTotal = function (items) {
  let total = 0;
  
  if (items.de) {
    total += items.de.reduce((sum, item) => sum + item.amount * this.prices.de, 0);
  }
  if (items.lo) {
    total += items.lo.reduce((sum, item) => sum + item.amount * this.prices.lo, 0);
  }
  if (items.x2) {
    total += items.x2.reduce((sum, item) => sum + item.amount * this.prices.x2, 0);
  }
  if (items.x3) {
    total += items.x3.reduce((sum, item) => sum + item.amount * this.prices.x3, 0);
  }
  if (items.x4) {
    total += items.x4.reduce((sum, item) => sum + item.amount * this.prices.x4, 0);
  }
  if (items.xiuNhay) {
    total += items.xiuNhay.reduce((sum, item) => sum + item.amount * this.prices.xiuNhay, 0);
  }
  if (items.baCang) {
    total += items.baCang.reduce((sum, item) => sum + item.amount * this.prices.baCang, 0);
  }

  const discount = (total * this.discountPercent) / 100;
  const netAmount = total - discount;

  return {
    total,
    discount,
    netAmount,
  };
};

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;