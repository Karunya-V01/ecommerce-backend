const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    required: true,
    unique: true,
  },
  paymentRequestId: {
    type: String,
    required: true,
  },
  buyerName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  status: {
    type: String, // e.g. 'Credit', 'Failed', etc.
    required: true,
  },
  paymentDate: {
    type: Date,
    required: true,
  },
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
