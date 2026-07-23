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

// app.use("/api/users", require(".routes/users"));
app.use("/api/transactions", require("./src/routes/routes"));
app.use("/api/auth", require("./src/routes/auth.routes"));
app.use("/api/categories", require("./src/routes/category.routes"));
app.use("/api/budgets", require("./src/routes/budget.routes"));
app.use("/api/recurring", require("./src/routes/recurring.routes"));
app.get("/health", (req, res) => res.json({ status: "ok" }));
// app.use('/columns', require('./src/routes/columns'));

const seedCategories = async () => {
  const Category = require("./src/models/category");
  const defaults = [
    { label: "Food & Dining", value: "food" },
    { label: "Transport", value: "transport" },
    { label: "Bills/Rent", value: "bill" },
    { label: "Salary", value: "salary" },
    { label: "Shopping", value: "shopping" },
    { label: "Entertainment", value: "entertainment" },
    { label: "Health", value: "health" },
    { label: "Other", value: "other" },
  ];
  const count = await Category.countDocuments();
  if (count === 0) {
    await Category.insertMany(defaults);
    console.log("Seeded default categories");
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
  };
  const count = await Column.countDocuments();
  if (count === 0) {
    await Column.create(defaults);
    console.log("Seeded default columns");
  }
};

mangoose.connection.once("open", () => {
  seedCategories();
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
