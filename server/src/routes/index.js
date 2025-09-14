const router = require('express').Router();

const verifyToken = require('../middlewares/verifyToken');
const authRoutes = require('./auth');
const gameRoutes = require('./gameRoutes');
const userRoutes = require('./user');

router.use('/auth', authRoutes);
router.use('/game', verifyToken, gameRoutes);
router.use('/user', verifyToken, userRoutes);

module.exports = router;