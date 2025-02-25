const router = require('express').Router();

const verifyToken = require('../middlewares/verifyToken');
const authRoutes = require('./auth');

router.use('/auth', authRoutes);

module.exports = router;