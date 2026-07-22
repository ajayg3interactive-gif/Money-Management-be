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

mangoose.connection.once("open", () => {
  seedCategories();
});

mangoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(process.env.PORT || 3000, () => console.log("server Running"));
  })
  .catch((err) => console.error(err));
