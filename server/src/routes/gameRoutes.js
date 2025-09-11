const router = require('express').Router();
const db = require('../config/db');
const Room = require('../game/room'); 
const jwt = require('jsonwebtoken');

router.get('/rooms', (req, res) => {
   const query = 'select name, joinedPlayers, requiresPassword from rooms';
   db.query(query, (err, result) => {
      if(err) {
         res.status(500).send('Something is wrong.');
      }else{
         return res.status(200).json({rooms: result});
      }
   });
});

router.post('/createRoom', (req, res) => {
   const query = `select count(*) from rooms where name = '${req.body.name}'`;
   db.query(query, (err, result) => {
      if(err) {
         res.status(500).send('Room name already exists or something is wrong.');
      }else{
         if(result[0]['count(*)'] == 0){
            const room = new Room(req.body.name);
            const query = `insert into rooms (name, state, password, requiresPassword) values ('${req.body.name}', '${JSON.stringify(room)}', '${req.body.password}', '${req.body.password.length > 0  ? 1 : 0}')`;
            db.query(query, (err, ress) => {
               if(err) {
                  console.log(err)
                  res.status(500).send('Room name already exists or something is wrong.');
               }else{
                  res.status(200).send('Room created successfully.');
               }
            });
         }else{
            res.status(500).send('Room name already exists or something is wrong.');
         }
         
      }
   });
});

router.post('/joinRoom', (req, res) => {
   const query = `select * from rooms where name = '${req.body.roomName}'`;
   const token = req.cookies.token;
   db.query(query, (err, result) => {
      if(err) {
         return res.status(500).send('Room name does not exist or something is wrong.');
      }
      if(result.length == 0){
         return res.status(500).send('Room name does not exist or something is wrong.');
      }
      if(result[0].requiresPassword == 1 && result[0].password != req.body.password){
         return res.status(500).send('Password is incorrect.');
      }
      if(result[0].joinedPlayers >= 4){
         return res.status(500).send('Room is full.');
      }
      console.log(result[0].state)
      const roomState = result[0].state
      if(roomState.players.filter(p => p.id == jwt.decode(token).username).length > 0) {
         return res.status(500).send('You have already joined this game.');
      }
      res.status(200).send('Room set successfully.');
   });
});

module.exports = router;