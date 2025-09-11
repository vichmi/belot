const router = require('express').Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

router.post('/register', (req, res) => {
    const {username, password} = req.body;
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, (err, hash) => {
            const query = `INSERT INTO users (username, password) VALUES ('${username}', '${hash}')`;
            db.query(query, (err, result) => {
                if(err) {
                    console.log(err)
                    res.status(500).send(err);
                }else{ 
                    res.status(200).send(result);
                }
            });
        });
    }); 
    // const salt = bcrypt.genSaltSync(10);
    // const hash = bcrypt.hashSync(password, salt);
});

router.post('/login', (req, res) => {
    const {username, password} = req.body;
    console.log
    const query = `SELECT * FROM users WHERE username='${username}'`;
    db.query(query, (err, result) => {
        if(err) {
            res.status(500).send(err);
        }else{
            if(result.length > 0) {
                const user = result[0];
                const isPasswordCorrect = bcrypt.compareSync(password, user.password);
                if(isPasswordCorrect) {

                    const token = jwt.sign({
                        id: user.id,
                        username: user.username
                    }, process.env.JWT_SECRET, { expiresIn: '365d' });

                    res.cookie('token', token, { 
                        httpOnly: true,
                        secure: false,
                        sameSite: 'strict',
                        maxAge: 1000 * 60 * 60 * 24 * 365
                    });

                    res.status(200).json({ message: 'Logged in successfully' });
                }else{
                    res.status(401).send('Password is incorrect');
                }
            }else{
                res.status(404).send('User not found');
            }
        }
    });
});

router.get('/me', (req, res) => {
    const token = req.cookies.token;
    if(token) {
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if(err) {
                res.status(403).send('Invalid token');
            }else{
                res.status(200).json(user);
            }
        });
    }else{
        res.status(403).send('Token not found');
    }
});

module.exports = router;