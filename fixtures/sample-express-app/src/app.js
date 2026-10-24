const express = require('express');
const { loginUser, getUsers } = require('./controllers/auth.controller.js');
const { authenticate } = require('./middleware/auth.js');

const app = express();
app.use(express.json());

app.get('/users', authenticate, getUsers);
app.post('/login', loginUser);

module.exports = app;
