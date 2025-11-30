const mongoose = require("mongoose");

const MODELNAME = "project_member";

const Schema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'project', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true, index: true },
  },
  { timestamps: true }
);

Schema.index({ projectId: 1, userId: 1 }, { unique: true });

const OBJ = mongoose.model(MODELNAME, Schema);
module.exports = OBJ;
