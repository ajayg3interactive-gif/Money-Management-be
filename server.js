const path = require("path");
const express = require("express");
const mangoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:4200",
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// app.use("/api/users", require(".routes/users"));
app.use("/api/transactions", require("./src/routes/routes"));
app.use("/api/auth", require("./src/routes/auth.routes"));
app.use("/api/dropdowns", require("./src/routes/dropdown.routes"));
app.use("/api/budgets", require("./src/routes/budget.routes"));
app.use("/api/recurring", require("./src/routes/recurring.routes"));
app.get("/health", (req, res) => res.json({ status: "ok" }));
// app.use('/columns', require('./src/routes/columns'));

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const seedDropdowns = async () => {
  const Dropdown = require("./src/models/dropdown");

  const defaults = [
    { type: "category", label: "Food & Dining", value: "food", position: 1 },
    { type: "category", label: "Transport", value: "transport", position: 2 },
    { type: "category", label: "Bills/Rent", value: "bill", position: 3 },
    { type: "category", label: "Salary", value: "salary", position: 4 },
    { type: "category", label: "Shopping", value: "shopping", position: 5 },
    { type: "category", label: "Entertainment", value: "entertainment", position: 6 },
    { type: "category", label: "Health", value: "health", position: 7 },
    { type: "category", label: "Other", value: "other", position: 8 },
    ...MONTH_NAMES.map((label, i) => ({ type: "month", label, value: String(i + 1), position: i + 1 })),
  ];

  for (const item of defaults) {
    await Dropdown.updateOne(
      { type: item.type, value: item.value },
      { $setOnInsert: item },
      { upsert: true }
    );
  }
};

const seedColumns = async () => {
  const Column = require("./src/models/columns");
  const defaults = {
    transaction: [
      { position: 1, key: "date", label: "Date", view: true },
      { position: 2, key: "description", label: "Description", view: true },
      { position: 3, key: "category", label: "Category", view: true },
      { position: 4, key: "amount", label: "Amount", view: true },
      { position: 5, key: "type", label: "Type", view: true },
      { position: 6, key: "action", label: "Action", view: true },
    ],
    budget: [
      { position: 1, key: "category", label: "Category", view: true },
      { position: 2, key: "maximum", label: "Maximum", view: true },
      { position: 3, key: "spent", label: "Spent", view: true },
      { position: 4, key: "action", label: "Action", view: true },
    ],
  };

  // Rebuilds a column group from its defaults whenever a key is missing (e.g. a new
  // column was introduced after this DB was first seeded), reusing any custom
  // label/view already stored for keys that already existed.
  const mergeGroup = (existingGroup, defaultGroup) => {
    const existingByKey = new Map((existingGroup || []).map((c) => [c.key, c]));
    const hasAllKeys = defaultGroup.every((c) => existingByKey.has(c.key));
    if (existingGroup && existingGroup.length > 0 && hasAllKeys) return null;

    return defaultGroup.map((def, index) => {
      const existing = existingByKey.get(def.key);
      return {
        position: index + 1,
        key: def.key,
        label: existing ? existing.label : def.label,
        view: existing ? existing.view : def.view,
      };
    });
  };

  const existing = await Column.findOne();
  if (!existing) {
    await Column.create(defaults);
    console.log("Seeded default columns");
    return;
  }

  const updates = {};
  const mergedTransaction = mergeGroup(existing.transaction, defaults.transaction);
  if (mergedTransaction) updates.transaction = mergedTransaction;
  const mergedBudget = mergeGroup(existing.budget, defaults.budget);
  if (mergedBudget) updates.budget = mergedBudget;

  if (Object.keys(updates).length > 0) {
    await Column.updateOne({ _id: existing._id }, { $set: updates });
    console.log("Seeded missing column groups:", Object.keys(updates).join(", "));
  }
};

mangoose.connection.once("open", () => {
  seedDropdowns();
  seedColumns();

  const { processDueOccurrences } = require("./src/jobs/recurringJob");
  processDueOccurrences().catch((err) => console.error("recurring job failed:", err));
  setInterval(() => {
    processDueOccurrences().catch((err) => console.error("recurring job failed:", err));
  }, 60 * 60 * 1000);
});

mangoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(process.env.PORT || 3000, () => console.log("server Running"));
  })
  .catch((err) => console.error(err));
