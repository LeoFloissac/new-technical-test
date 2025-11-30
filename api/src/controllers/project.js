const express = require("express");
const router = express.Router();
const passport = require("passport");

const Project = require("../models/project");
const ProjectMember = require("../models/project_member");
const ERROR_CODES = require("../utils/errorCodes");

// Liste des projets dont l'utilisateur fait partie
router.get("/", passport.authenticate("user", { session: false, failWithError: true }), async (req, res) => {
  try {
    const memberships = await ProjectMember.find({ userId: req.user._id }).select("projectId");
    const projectIds = memberships.map((m) => m.projectId);

    const projects = await Project.find({ _id: { $in: projectIds } }).sort({ createdAt: -1 });

    return res.status(200).send({ ok: true, data: projects });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

// Récupérer un projet si l'utilisateur en est membre
router.get("/:id", passport.authenticate("user", { session: false, failWithError: true }), async (req, res) => {
  try {
    const membership = await ProjectMember.findOne({ projectId: req.params.id, userId: req.user._id });
    if (!membership) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    return res.status(200).send({ ok: true, data: project });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

// Créer un projet et ajouter le créateur comme membre
router.post("/", passport.authenticate("user", { session: false, failWithError: true }), async (req, res) => {
  try {
    const { name, budget } = req.body;

    if (!name || (budget === undefined || budget === null))
      return res.status(400).send({ ok: false, code: ERROR_CODES.INVALID_BODY });

    const project = await Project.create({ name: name.trim(), budget });

    // s'assurer d'ajouter le créateur comme membre
    try {
      await ProjectMember.create({ projectId: project._id, userId: req.user._id });
    } catch (e) {
      // si l'insertion du membership échoue, on supprime le projet pour rester consistant
      console.log("project member create failed, removing project", e);
      await project.remove();
      return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
    }

    return res.status(200).send({ ok: true, data: project });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

// Supprimer un projet si l'utilisateur en est membre
router.delete("/:id", passport.authenticate("user", { session: false, failWithError: true }), async (req, res) => {
  try {
    const membership = await ProjectMember.findOne({ projectId: req.params.id, userId: req.user._id });
    if (!membership) return res.status(404).send({ ok: false, code: ERROR_CODES.NOT_FOUND });

    // supprimer le projet
    await Project.findByIdAndRemove(req.params.id);

    // supprimer toutes les relations membres liées au projet
    await ProjectMember.deleteMany({ projectId: req.params.id });

    return res.status(200).send({ ok: true });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ ok: false, code: ERROR_CODES.SERVER_ERROR });
  }
});

module.exports = router;
