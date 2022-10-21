const User = require("../models/User");

const isAuthenticated = async (req, res, next) => {
    try {
      if(req.headers.authorization){
        // get token of header and remove "Bearer"
        const token = req.headers.authorization.replace("Bearer ", "");
        // just key account
        const user = await User.findOne({token: token}).select("account _id");
        req.user = user;
        next();
      } else {
        // if not user 
        return res.status(401).json({ message: "Unauthorized" });
      }
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  };
  
  module.exports = isAuthenticated;
  