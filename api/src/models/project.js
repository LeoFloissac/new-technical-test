const mongoose = require("mongoose");

const MODELNAME = "project";

const Schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    budget: { type: Number, required: true, min: 0 },
    notifiedOverBudget: { type: Boolean, default: false },
    lastOverBudgetNotifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
