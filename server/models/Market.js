const mongoose = require('mongoose');

const marketSchema = new mongoose.Schema({
    seller: { type: String, required: true },
    item: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    offerId: { type: String, required: true, unique: true }
});

module.exports = mongoose.model('Market', marketSchema);