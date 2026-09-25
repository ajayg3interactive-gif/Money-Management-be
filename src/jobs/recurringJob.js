const RecurringTransaction = require("../models/RecurringTransaction");
const RecurringOccurrence = require("../models/RecurringOccurrence");
const Transaction = require("../models/Transactions");
const { isDueOn, today: todayUtc } = require("../utils/recurrence");

const processDueOccurrences = async () => {
  const today = todayUtc();
  const rules = await RecurringTransaction.find({ active: true });

  for (const rule of rules) {
    if (!isDueOn(rule, today)) continue;

    const existing = await RecurringOccurrence.findOne({ rule: rule._id, date: today });
    if (existing) continue;

    const transaction = await Transaction.create({
      user: rule.user,
      date: today,
      description: rule.description,
      category: rule.category,
      amount: rule.amount,
      type: rule.type,
    });

    await RecurringOccurrence.create({
      user: rule.user,
      rule: rule._id,
      date: today,
      status: "posted",
      transaction: transaction._id,
    });
  }
};

module.exports = { processDueOccurrences };
