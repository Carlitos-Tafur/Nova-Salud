const router = require("express").Router();
const controller = require("../controllers/dashboard.controller");
router.get("/resumen", controller.resumen);
router.get("/stock-bajo", controller.stockBajo);
router.get("/proximos-vencer", controller.proximosVencer);
module.exports = router;
