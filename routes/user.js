const express = require("express");
const router = express.Router();
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");
const cloudinary = require("cloudinary").v2;
const fileUpload = require("express-fileupload");

const User = require("../models/User");

const convertToBase64 = (file) => {
  return `data:${file.mimetype};base64,${file.data.toString("base64")}`;
};
router.post("/user/signup", fileUpload(), async (req, res) => {
  //console.log(req.body);
  //console.log(req.files);
  try {
    if (
      !req.body.email ||
      !req.body.username ||
      !req.body.password ||
      req.body.newsletter
    ) {
      return res.status(400).json({ message: "The element missing" });
    }

    if (await User.findOne({ email: req.body.email })) {
      return res.status(400).json({ message: "This mail has already used" });
    }
    const password = req.body.password;
    const salt = uid2(16);
    const hash = SHA256(salt + password).toString(encBase64);
    const token = uid2(64);

    const newUser = new User({
      email: req.body.email,
      account: {
        username: req.body.username,
        //avataer : (img)
      },
      newsletter: req.body.newsletter,
      token: token,
      hash: hash,
      salt: salt,
    });
    //console.log(newUser);
    const pictureToAvatar = convertToBase64(req.files.picture);
    //console.log(pictureToAvatar);
    const resultAvatar = await cloudinary.uploader.upload(pictureToAvatar, {
      folder: `/users${newUser._id}`,
    });

    //console.log(resultAvatar);
    newUser.account.avatar = resultAvatar;

    await newUser.save();

    console.log(newUser);
    const response = {
      id: newUser._id,
      token: token,
      account: newUser.account,
    };
    res.json(response);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/user/login", async (req, res) => {
  //console.log(req.body);
  try {
    if (!req.body.email || !req.body.password) {
      return res.status(400).json({ message: "The element missing" });
    }
    const user = await User.findOne({ email: req.body.email });
    //console.log(user);
    if (user) {
      const userPassword = req.body.password;
      //console.log(userPassword);
      const userSalt = user.salt;
      //console.log(userSalt);
      userHash = SHA256(userSalt + userPassword).toString(encBase64);
      //console.log(userHash);
      //console.log(userHash === user.hash);
      if (userHash !== user.hash) {
        return res
          .status(400)
          .json({ message: "The email or password isn't correct" });
      }

      const responseUser = {
        id: user._id,
        token: user.token,
        account: user.account,
      };
      res.json(responseUser);
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;