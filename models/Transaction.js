const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['receive', 'send'],
      required: true,
    },
    rawData: {
      type: String,
      required: true,
    },
    processedData: {
      de: [
        {
          number: { type: String, required: true },
          amount: { type: Number, required: true },
        },
      ],
      lo: [
        {
          number: { type: String, required: true },
          amount: { type: Number, required: true },
        },
      ],
      x2: [
        {
          number: { type: String, required: true },
          amount: { type: Number, required: true },
        },
      ],
      x3: [
        {
          number: { type: String, required: true },
          amount: { type: Number, required: true },
        },
      ],
      x4: [
        {
          number: { type: String, required: true },
          amount: { type: Number, required: true },
        },
      ],
      xiuNhay: [
        {
          number: { type: String, required: true },
          amount: { type: Number, required: true },
        },
      ],
      baCang: [
        {
          number: { type: String, required: true },
          amount: { type: Number, required: true },
        },
      ],
    },
    totals: {
      totalAmount: {
        type: Number,
        required: true,
        default: 0,
      },
      discount: {
        type: Number,
        required: true,
        default: 0,
      },
      netAmount: {
        type: Number,
        required: true,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ customerId: 1, date: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;