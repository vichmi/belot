const router = require('express').Router();

const verifyToken = require('../middlewares/verifyToken');
const authRoutes = require('./auth');
const gameRoutes = require('./gameRoutes');

router.use('/auth', authRoutes);
router.use('/game', verifyToken, gameRoutes);

module.exports = router;