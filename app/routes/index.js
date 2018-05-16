// routes/index.js
const matchupRoutes = require('./matchup_routes');
module.exports = function(app, db, pp) {
  matchupRoutes(app, db, pp);
  // Other route groups could go here, in the future
};
