function getUsers(req, res) {
  res.json({ users: [] });
}

function loginUser(req, res) {
  const { username, password } = req.body;
  res.json({ token: 'mock-jwt-token' });
}

module.exports = {
  getUsers,
  loginUser
};
