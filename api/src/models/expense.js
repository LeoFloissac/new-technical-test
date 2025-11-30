const mongoose = require("mongoose");

const MODELNAME = "expense";

const Schema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  category: { type: String, default: 'uncategorized' },
  description: { type: String, default: '' },
  date: { type: Date, default: Date.now },
});
Schema.index({ projectId: 1, date: -1 });
const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
