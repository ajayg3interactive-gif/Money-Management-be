const mongoose = require('mongoose');

const columnSchema = new mongoose.Schema({
  transaction: [
    {
      position: Number,
      key:      String,
      label:    String,
      view:     Boolean
    }
  ]
});

module.exports = mongoose.model('Column', columnSchema);