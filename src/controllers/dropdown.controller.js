const Dropdown = require("../models/dropdown");
const { ok, fail } = require("../utils/response");

const getByType = async (req, res) => {
  try {
    const options = await Dropdown.find({ type: req.params.type }).sort({ position: 1 });
    return ok(res, options);
  } catch (err) {
    return fail(res, 500, "DROPDOWN_FETCH_FAILED", err.message);
  }
};

module.exports = { getByType };
