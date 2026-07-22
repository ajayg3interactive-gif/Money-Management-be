const Column = require("../models/columns");

const getColumns = async (req, res) => {
  try {
    const columns = await Column.find();
    res.json(columns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


module.exports = { getColumns };