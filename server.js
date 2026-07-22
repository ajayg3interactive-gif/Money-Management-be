const express = require("express");
const mangoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors({ origin: "http://localhost:4200" }));
app.use(express.json());

// app.use("/api/users", require(".routes/users"));
app.use('/api/transactions', require('./src/routes/routes'));
app.use('/api/auth', require('./src/routes/auth.routes'));
app.get('/health', (req, res) => res.json({ status: 'ok' }));
// app.use('/columns', require('./src/routes/columns'));

mangoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(process.env.PORT || 3000, () => console.log("server Running"));
  })
  .catch((err) => console.error(err));





