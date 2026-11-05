const router = require("express").Router();
const controller = require("../controllers/catalog.controller");
router.get("/", controller.listar);
router.get("/exportar", controller.exportarExcel);
module.exports = router;
