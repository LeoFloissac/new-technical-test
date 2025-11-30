const express = require("express");
const router = express.Router();
const passport = require("passport");
const mongoose = require("mongoose");

const Expense = require("../models/expense");
const ProjectMember = require("../models/project_member");
const Project = require("../models/project");
const Brevo = require("../services/brevo");
const ERROR_CODES = require("../utils/errorCodes");

// Get all expenses for a project (user must be member)
router.get(
  "/project/:projectId",
  passport.authenticate("user", { session: false, failWithError: true }),
  async (req, res) => {
    try {
      const { projectId } = req.params;

      const membership = await ProjectMember.findOne({ projectId, userId: req.user._id });
      if (!membership) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

      const expenses = await Expense.find({ projectId }).sort({ date: -1 });
      return res.status(200).send({ ok: true, data: expenses });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
    }
  },
);

// Add an expense to a project
router.post(
  "/project/:projectId",
  passport.authenticate("user", { session: false, failWithError: true }),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { amount, category, description, date } = req.body;

      if (amount === undefined || amount === null) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });
      const membership = await ProjectMember.findOne({ projectId, userId: req.user._id });
      if (!membership) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

      const expense = await Expense.create({ projectId, amount, category, description, date });

      // Compute total and notify members if budget exceeded (do not fail the request if notification errors)
      (async () => {
        try {
          const objectId = mongoose.Types.ObjectId.isValid(projectId) ? new mongoose.Types.ObjectId(projectId) : null;
          if (!objectId) return;

          const agg = await Expense.aggregate([
            { $match: { projectId: objectId } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ]);
          const total = agg && agg.length ? agg[0].total : 0;

          const project = await Project.findById(projectId);
          // Only notify if project.notifiedOverBudget is false OR last notification was more than a week ago
          const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          const shouldNotify =
            project &&
            project.budget !== undefined &&
            total > project.budget &&
            (
              project.notifiedOverBudget === false ||
              (project.lastOverBudgetNotifiedAt && project.lastOverBudgetNotifiedAt < oneWeekAgo)
            );

          if (shouldNotify) {
            const members = await ProjectMember.find({ projectId }).populate("userId", "email name");
            const to = members
              .map((m) => ({ email: m.userId?.email, name: m.userId?.name }))
              .filter((t) => t.email);

            if (to.length) {
              const subject = `Budget dépassé pour le projet \"${project.name}\"`;
              const htmlContent = `<p>Le budget du projet <strong>${project.name}</strong> a été dépassé.</p>` +
                `<p>Budget: ${project.budget} €<br/>Total dépenses: ${total} €<br/>Dernière dépense: ${expense.amount} €</p>`;
              try {
                await Brevo.sendEmail(to, subject, htmlContent);
                project.notifiedOverBudget = true;
                project.lastOverBudgetNotifiedAt = new Date();
                await project.save();
              } catch (e) {
                console.log("Error sending over-budget notification", e);
              }
            }
          }
        } catch (e) {
          console.log("Error computing total / notifying over budget", e);
        }
      })();

      return res.status(200).send({ ok: true, data: expense });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
    }
  },
);

// Delete an expense by id (user must be member of related project)
router.delete(
  "/:id",
  passport.authenticate("user", { session: false, failWithError: true }),
  async (req, res) => {
    try {
      const expense = await Expense.findById(req.params.id);
      if (!expense) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

      const membership = await ProjectMember.findOne({ projectId: expense.projectId, userId: req.user._id });
      if (!membership) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

      await Expense.findByIdAndDelete(expense._id);

      // After deletion, recompute total and if we're now under (or equal to) budget, reset notified flags
      (async () => {
        try {
          const objectId = mongoose.Types.ObjectId.isValid(expense.projectId) ? new mongoose.Types.ObjectId(expense.projectId) : null;
          if (!objectId) return;

          const agg = await Expense.aggregate([
            { $match: { projectId: objectId } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ]);
          const total = agg && agg.length ? agg[0].total : 0;

          const project = await Project.findById(expense.projectId);
          if (project && project.budget !== undefined && total <= project.budget && project.notifiedOverBudget) {
            project.notifiedOverBudget = false;
            project.lastOverBudgetNotifiedAt = null;
            await project.save();
          }
        } catch (e) {
          console.log("Error recomputing total / resetting over-budget flag", e);
        }
      })();

      return res.status(200).send({ ok: true });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
    }
  },
);

// Get total sum of expenses for a project
router.get(
  "/project/:projectId/total",
  passport.authenticate("user", { session: false, failWithError: true }),
  async (req, res) => {
    try {
      const { projectId } = req.params;

      const membership = await ProjectMember.findOne({ projectId, userId: req.user._id });
      if (!membership) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

      const objectId = mongoose.Types.ObjectId.isValid(projectId) ? new mongoose.Types.ObjectId(projectId) : null;
      if (!objectId) return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });

      const result = await Expense.aggregate([
        { $match: { projectId: objectId } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);

      const total = result && result.length ? result[0].total : 0;
      return res.status(200).send({ ok: true, data: { total } });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
    }
  },
);

module.exports = router;
