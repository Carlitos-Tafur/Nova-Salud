const router = require("express").Router();
const controller = require("../controllers/catalog.controller");
router.get("/", controller.listar);
module.exports = router;
