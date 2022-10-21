const express = require('express');
const cors = require("cors");
const mongoose = require('mongoose');
const cloudinary = require("cloudinary").v2;

require('dotenv').config(); 

const app = express();
  app.use(cors());
  app.use(express.json());


mongoose.connect(process.env.MONGODB_URI);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const userRoutes = require('./routes/user');
const offerRoutes = require('./routes/offer');
  app.use(userRoutes);
  app.use(offerRoutes);

  app.get("/", (req, res) => {
    res.json({ message: "Welcome to my project hello 🚀🚀🚀🚀🚀🚀" });
  });

  app.all("*", (req, res) => {
      res.status(404).json({ message: "This route does not exist" });
  });

  app.listen(3000, () => {
      console.log('Server started !');
  });