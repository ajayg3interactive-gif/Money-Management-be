// One-time migration: converts the legacy "YYYY-MM-DD" string date fields
// (written before Transaction.date / RecurringTransaction.startDate,endDate,
// scheduleAnchor / RecurringOccurrence.date were changed to real Date) into
// UTC-midnight Date objects, so they match the new Mongoose schema types.
//
// Safe to run multiple times: documents whose field is already a Date (or
// missing) are skipped.
//
// Usage (from mm-be/):
//   node scripts/migrate-date-strings-to-dates.js
//
// Requires the same .env as the server (MONGO_URI).

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const { parseDateStr } = require("../src/utils/dateUtc");

const Transaction = require("../src/models/Transactions");
const RecurringTransaction = require("../src/models/RecurringTransaction");
const RecurringOccurrence = require("../src/models/RecurringOccurrence");

/**
 * Converts every document's given string fields to Date in place, using a
 * raw collection scan (bypassing Mongoose casting on read, since the model's
 * schema already declares the new Date type and would otherwise fail to load
 * documents whose stored value is still a plain string).
 */
async function migrateCollection(model, fields) {
  const collection = model.collection;
  const cursor = collection.find({});
  let scanned = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for await (const doc of cursor) {
    scanned++;
    const set = {};
    let hasStringField = false;

    for (const field of fields) {
      const value = doc[field];
      if (typeof value === "string") {
        hasStringField = true;
        const parsed = parseDateStr(value);
        if (!parsed) {
          console.warn(`  [SKIP-INVALID] ${model.modelName} ${doc._id}: ${field}="${value}" is not YYYY-MM-DD`);
          failed++;
          continue;
        }
        set[field] = parsed;
      }
    }

    if (!hasStringField) {
      skipped++;
      continue;
    }

    if (Object.keys(set).length > 0) {
      await collection.updateOne({ _id: doc._id }, { $set: set });
      updated++;
    }
  }

  console.log(`${model.modelName}: scanned=${scanned} updated=${updated} alreadyDate=${skipped} failed=${failed}`);
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set (check mm-be/.env)");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  try {
    await migrateCollection(Transaction, ["date"]);
    await migrateCollection(RecurringTransaction, ["startDate", "endDate", "scheduleAnchor"]);
    await migrateCollection(RecurringOccurrence, ["date"]);
    console.log("Migration complete.");
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
