const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
    const bearerHeader = req.header('Authorization');
    if(bearerHeader) {
        const token = bearerHeader.split(' ')[1];
        jwt.verify(token, process.env.JWT_SECRET, (err, data) => {
            if(err) {
                res.status(403).send('Forbidden');
            }else{
                req.user = data;
                next();
            }
        });
    }else{
        res.status(403).send('Forbidden');
    }
}

module.exports = verifyToken;