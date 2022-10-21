const express = require("express");
const fileUpload = require("express-fileupload");
const convertToBase64 = require("../utils/convertToBase64"); // Fonction qui permet de transformer nos fichier qu'on reçois sous forme de Buffer en base64 afin de pouvoir les upload sur cloudinary

const uid2 = require("uid2"); // Package qui sert à créer des string aléatoires
const SHA256 = require("crypto-js/sha256"); // Sert à encripter une string
const encBase64 = require("crypto-js/enc-base64"); // Sert à transformer l'encryptage en string

const router = express.Router();

const User = require("../models/User");

// upload file

const cloudinary = require('cloudinary').v2;

// Return "https" URLs by setting secure: true
cloudinary.config({ 
    cloud_name: 'dnnjwgolt', 
    api_key: '969599212569319', 
    api_secret: 'FRIFwUy3nQsfYtzLDXUGcaf4nFE',
    secure: true
  });


// Create 
    // signup
    router.post('/user/signup', fileUpload(), async (req,res) => {
        try {
            const { username, email, password, newsletter } = req.body;
            // allready information has been mentionned ? 
            if(!username ||
                !email ||
                !password ||
                (newsletter !== false && newsletter !== true)
                ) {
                return res.status(400).json({message : "Missing parameter"});
            }   
            
            // user exist ?
            const ifUser = await User.findOne({email : email, username : username});
            if(ifUser) {
                return res.status(409).json({message : "This email is already used"});
               
            } 
        
            // generate salt
            const token = uid2(64);
            const salt = uid2(16);
            const hash = SHA256(salt + password).toString(encBase64);


            // // convert picture
            // const pictureConverted = convertToBase64(req.files.picture);

            // // send file
            // const result = await cloudinary.uploader.upload(pictureConverted, {
            //     folder: "/vinted/avatar",
            // });

            const newUser = new User({
                email,
                account: {
                    username,
                    // avatar: result.secure_url, 
                },
                newsletter,
                token,
                hash,
                salt,
            });

            await newUser.save();
            res.json({
                _id: newUser.id,
                token: newUser.token,
                account: newUser.account
            });
        } catch (error) {
            res.status(400).json({message : error.message});
        }
    });

// Read
    // login
    router.post('/user/login', async (req,res) => {
        try {
            const {email, password} = req.body;
            const user = await User.findOne({email : email});
            // user exist ?
            if(!user) {
                return res.status(401).json({message : "Unauthorized"});
            } 
        
            // reconstitute password-hash
            const newHash = SHA256(user.salt + password).toString(encBase64);

            if(newHash !== user.hash) {
                return res.status(401).json({message : "Le mot de passe n'est pas correct ❌"}); 
            } 
            
            res.json({
                _id: user._id,
                token: user.token,
                account: user.account,
              });
        } catch (error) {
            res.status(400).json({message : error.message});
        }
    })

module.exports = router;