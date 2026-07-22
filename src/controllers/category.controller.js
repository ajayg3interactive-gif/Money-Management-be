const Category = require("../models/category");
const { ok, fail } = require("../utils/response");

const getAll = async (req, res) => {
  try {
    const categories = await Category.find();
    return ok(res, categories);
  } catch (err) {
    return fail(res, 500, "CATEGORY_FETCH_FAILED", err.message);
  }
};

module.exports = { getAll };
