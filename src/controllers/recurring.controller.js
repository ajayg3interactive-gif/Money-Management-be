const RecurringTransaction = require("../models/RecurringTransaction");
const RecurringOccurrence = require("../models/RecurringOccurrence");
const Transaction = require("../models/Transactions");
const { ok, fail } = require("../utils/response");
const { isDueOn, todayStr, daysInMonth, dateStrFor } = require("../utils/recurrence");

const formatRule = (r) => ({
  id: r._id,
  description: r.description,
  category: r.category,
  amount: r.amount,
  type: r.type,
  startDate: r.startDate,
  endDate: r.endDate,
  frequency: r.frequency,
  interval: r.interval,
  active: r.active,
});

const getRules = async (req, res) => {
  try {
    const rules = await RecurringTransaction.find({ user: req.user.id }).sort({ startDate: 1 });
    return ok(res, rules.map(formatRule));
  } catch (err) {
    return fail(res, 500, "RULE_FETCH_FAILED", err.message);
  }
};

const createRule = async (req, res) => {
  try {
    const { description, category, amount, type, startDate, endDate, frequency, interval } = req.body;

    if (!category || amount === undefined || amount === null || !type || !startDate || !frequency) {
      return fail(res, 400, "VALIDATION_ERROR", "Category, amount, type, start date and frequency are required");
    }
    if (frequency === "every-n-days" && (!interval || interval < 1)) {
      return fail(res, 400, "VALIDATION_ERROR", "A valid interval (in days) is required for this frequency");
    }

    const rule = await RecurringTransaction.create({
      user: req.user.id,
      description,
      category,
      amount,
      type,
      startDate,
      endDate: endDate || null,
      frequency,
      interval: frequency === "every-n-days" ? interval : null,
      active: true,
      scheduleAnchor: startDate,
    });

    return ok(res, formatRule(rule), 201);
  } catch (err) {
    console.error("create recurring rule failed:", err);
    return fail(res, 400, "RULE_CREATE_FAILED", "Could not save recurring transaction. Please try again.");
  }
};

const setActive = async (req, res) => {
  try {
    const { active } = req.body;
    const rule = await RecurringTransaction.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { active: !!active },
      { new: true }
    );
    if (!rule) return fail(res, 404, "RULE_NOT_FOUND", "Recurring transaction not found");
    return ok(res, formatRule(rule));
  } catch (err) {
    return fail(res, 400, "RULE_UPDATE_FAILED", err.message);
  }
};

const removeRule = async (req, res) => {
  try {
    const rule = await RecurringTransaction.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!rule) return fail(res, 404, "RULE_NOT_FOUND", "Recurring transaction not found");
    await RecurringOccurrence.deleteMany({ rule: rule._id });
    return res.status(204).send();
  } catch (err) {
    return fail(res, 400, "RULE_DELETE_FAILED", err.message);
  }
};

const getOccurrences = async (req, res) => {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    if (!month || !year) {
      return fail(res, 400, "VALIDATION_ERROR", "month and year query params are required");
    }

    const rules = await RecurringTransaction.find({ user: req.user.id });
    const rangeStart = dateStrFor(year, month, 1);
    const rangeEnd = dateStrFor(year, month, daysInMonth(year, month));

    const docs = await RecurringOccurrence.find({
      user: req.user.id,
      date: { $gte: rangeStart, $lte: rangeEnd },
    });
    const docsByKey = new Map(docs.map((d) => [`${d.rule}_${d.date}`, d]));

    const occurrences = [];
    for (const rule of rules) {
      const total = daysInMonth(year, month);
      for (let day = 1; day <= total; day++) {
        const dateStr = dateStrFor(year, month, day);
        const doc = docsByKey.get(`${rule._id}_${dateStr}`);

        if (doc) {
          occurrences.push({
            ruleId: rule._id,
            date: dateStr,
            status: doc.status,
            transactionId: doc.transaction,
            description: rule.description,
            category: rule.category,
            amount: rule.amount,
            type: rule.type,
          });
        } else if (isDueOn(rule, dateStr)) {
          occurrences.push({
            ruleId: rule._id,
            date: dateStr,
            status: "pending",
            transactionId: null,
            description: rule.description,
            category: rule.category,
            amount: rule.amount,
            type: rule.type,
          });
        }
      }
    }

    return ok(res, occurrences);
  } catch (err) {
    console.error("get occurrences failed:", err);
    return fail(res, 500, "OCCURRENCE_FETCH_FAILED", err.message);
  }
};

const holdOccurrence = async (req, res) => {
  try {
    const { ruleId, date } = req.body;
    if (!ruleId || !date) return fail(res, 400, "VALIDATION_ERROR", "ruleId and date are required");

    const rule = await RecurringTransaction.findOne({ _id: ruleId, user: req.user.id });
    if (!rule) return fail(res, 404, "RULE_NOT_FOUND", "Recurring transaction not found");

    let doc = await RecurringOccurrence.findOne({ rule: rule._id, date });

    if (doc && doc.status === "posted") {
      if (doc.transaction) {
        await Transaction.findOneAndDelete({ _id: doc.transaction, user: req.user.id });
      }
      doc.status = "held";
      doc.transaction = null;
      await doc.save();
    } else if (!doc) {
      doc = await RecurringOccurrence.create({
        user: req.user.id,
        rule: rule._id,
        date,
        status: "held",
      });
    }

    return ok(res, { ruleId: rule._id, date, status: "held" });
  } catch (err) {
    console.error("hold occurrence failed:", err);
    return fail(res, 400, "OCCURRENCE_HOLD_FAILED", err.message);
  }
};

const unholdOccurrence = async (req, res) => {
  try {
    const { ruleId, date } = req.body;
    if (!ruleId || !date) return fail(res, 400, "VALIDATION_ERROR", "ruleId and date are required");

    const rule = await RecurringTransaction.findOne({ _id: ruleId, user: req.user.id });
    if (!rule) return fail(res, 404, "RULE_NOT_FOUND", "Recurring transaction not found");

    const doc = await RecurringOccurrence.findOne({ rule: rule._id, date, status: "held" });
    if (!doc) return fail(res, 404, "OCCURRENCE_NOT_HELD", "This occurrence is not on hold");

    const today = todayStr();
    const isOverdue = today >= date;

    if (isOverdue) {
      const transaction = await Transaction.create({
        user: req.user.id,
        date: today,
        description: rule.description,
        category: rule.category,
        amount: rule.amount,
        type: rule.type,
      });
      doc.status = "posted";
      doc.transaction = transaction._id;
      await doc.save();

      if (rule.frequency === "every-n-days") {
        rule.scheduleAnchor = today;
        await rule.save();
      }

      return ok(res, { ruleId: rule._id, date, status: "posted", transactionId: transaction._id });
    }

    // Occurrence date hasn't arrived yet — just resume normal generation.
    await doc.deleteOne();
    return ok(res, { ruleId: rule._id, date, status: "pending" });
  } catch (err) {
    console.error("unhold occurrence failed:", err);
    return fail(res, 400, "OCCURRENCE_UNHOLD_FAILED", err.message);
  }
};

module.exports = {
  getRules,
  createRule,
  setActive,
  removeRule,
  getOccurrences,
  holdOccurrence,
  unholdOccurrence,
};
