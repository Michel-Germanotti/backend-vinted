const express = require("express");
const fileUpload = require("express-fileupload");
const convertToBase64 = require("../utils/convertToBase64"); // Fonction qui permet de transformer nos fichier qu'on reçois sous forme de Buffer en base64 afin de pouvoir les upload sur cloudinary
const isAuthenticated = require('../middlewares/isAuthenticated');

const Offer = require("../models/Offer");
const cloudinary = require('cloudinary').v2;

const router = express.Router();

// Create
router.post(
    "/offer/publish",
    isAuthenticated,
    //upload.array("photos", 3),
    fileUpload(),
    async (req, res) => {
      //console.log(req.body);
      try {
        const { title, description, price, brand, size, condition, color, city } =
          req.body;
        if (
          !title ||
          !description ||
          !price ||
          !brand ||
          !size ||
          !city ||
          !color ||
          !condition
        ) {
          return res
            .status(400)
            .json({ message: "One of the element is missing" });
        }
  
        const newOffer = new Offer({
          product_name: req.body.title,
          product_description: req.body.description,
          product_price: req.body.price,
          product_details: [
            {
              MARQUE: req.body.brand,
            },
            {
              TAILLE: req.body.size,
            },
            {
              ETAT: req.body.condition,
            },
            {
              COULEUR: req.body.color,
            },
            {
              EMPLACEMENT: req.body.city,
            },
          ],
  
          owner: req.user,
        });
        //console.log(req.files.avatar);
  
        if (!req.files?.avatar) {
          return res.status(400).json({ message: "No image contained" });
        }
        const avatarConverted = convertToBase64(req.files.avatar);
        const resultAvatar = await cloudinary.uploader.upload(avatarConverted, {
          folder: `/vinted/offers${newOffer._id}`,
        });
        newOffer.product_image = resultAvatar;
  
        //console.log(avatarConverted);
        //console.log(resultAvatar);
        //console.log(req.files.picture.length);
  
        if (!req.files?.picture) {
          return res.status(400).json("No images uploaded!");
        }
  
        const arrayOfPictureUrl = [];
        const picture = req.files.picture;
        let pictureConverted = "";
        let resultPicture = {};
        const length = req.files.picture.length;
        for (let i = 0; i < length; i++) {
          pictureConverted = convertToBase64(picture[i]);
          //console.log(pictureConverted);
          resultPicture = await cloudinary.uploader.upload(pictureConverted, {
            folder: `/vinted/offers_${newOffer._id}`,
          });
          console.log(resultPicture);
          arrayOfPictureUrl.push(resultPicture.secure_url);
        }
        //console.log(arrayOfPictureUrl);
  
        //if (arrayOfPictureUrl.length === req.files.picture.length)
  
        //console.log(resultImage);
        newOffer.product_pictures = arrayOfPictureUrl;
        await newOffer.save();
  
        res.status(200).json(newOffer);
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }
    }
  );
  
  router.put(
    "/offer/modify",
    isAuthenticated,
    fileUpload(),
    async (req, res) => {
      if (!req.body.id) {
        return res.status(400).json({ message: "The offre isn't chosed" });
      }
  
      //const { title, description, price, brand, size, condition, color, city } =
      const offerUpdate = await Offer.findById(req.body.id).populate({
        path: "owner",
        select: "account",
      });
  
      if (!offerUpdate) {
        return res.status(400).json({ message: "No offer with this ID" });
      }
      //req.body;
  
      if (req.body.description) {
        offerUpdate.product_description = req.body.description;
      }
      if (req.body.price) {
        offerUpdate.product_price = req.body.price;
      }
      if (req.body.title) {
        offerUpdate.product_name = req.body.title;
      }
      if (req.body.brand) {
        offerUpdate.product_details[0].MARQUE = req.body.brand;
      }
      if (req.body.size) {
        offerUpdate.product_details[1].TAILLE = req.body.size;
      }
      if (req.body.condition) {
        offerUpdate.product_details[2].ETAT = req.body.condition;
      }
      if (req.body.color) {
        offerUpdate.product_details[3].COULEUR = req.body.color;
      }
      if (req.body.city) {
        offerUpdate.product_details[4].EMPLACEMENT = req.body.city;
      }
      if (req.files.picture) {
        await cloudinary.uploader.destroy(offerUpdate.product_image.public_id);
        const pictureUpdateConverted = convertToBase64(req.files.picture);
        const resultImageUpdate = await cloudinary.uploader.upload(
          pictureUpdateConverted,
          {
            folder: `/vinted/offers${offerUpdate._id}`,
          }
        );
        offerUpdate.product_image = resultImageUpdate;
      }
  
      offerUpdate.markModified("product_details");
      await offerUpdate.save();
      res.status(200).json(offerUpdate);
    }
  );
  
  router.delete("/offer/delete", isAuthenticated, async (req, res) => {
    //console.log(req.body.id);
    if (!req.body.id) {
      return res.status(400).json({ error: error.message });
    }
  
    const offerToDelete = await Offer.findById(req.body.id);
  
    if (req.files.picture) {
      await cloudinary.uploader.destroy(offerToDelete.product_image.public_id);
  
      await offerToDelete.delete();
      res
        .status(200)
        .json({ message: "The offre have been succesefully deleted" });
      //console.log(offerToDelete);
    }
  });
  
  router.get("/offers", async (req, res) => {
    try {
      const filters = {};
      let sortObj = {};
      let filtre_price;
      //console.log(req.query.sort);
      let offers;
      if (req.query.priceMin && req.query.priceMax) {
        filters.product_price = {
          $gte: Number(req.query.priceMin),
          $lte: Number(req.query.priceMax),
        };
      } else if (req.query.priceMin) {
        filters.product_price = { $gte: Number(req.query.priceMin) };
      } else if (req.query.priceMax) {
        filters.product_price = { $lte: Number(req.query.priceMax) };
      }
  
      if (req.query.title) {
        const middleFilter = req.query.title;
        filters.product_name = RegExp(middleFilter, "i");
      }
      if (req.query.sort === "price - asc" || req.query.sort === "asc") {
        filtre_price = 1;
      } else if (req.query.sort === "price - dsc" || req.query.sort === "dsc") {
        filtre_price = -1;
      }
  
      sortObj = { product_price: filtre_price };
  
      const limit = 4;
      let pageRequired = 1;
  
      if (req.query.page) {
        pageRequired = Number(req.query.page);
      }
  
      const skip = (Number(req.query.page) - 1) * limit;
      //console.log("sortObj", sortObj);
      //console.log(filters);
      offers = await Offer.find(filters)
        .populate({ path: "owner", select: "account" })
        .sort(sortObj)
        //.select("_id product_name product_price owner")
        .skip(skip)
        .limit(limit);
  
      //console.log("offers", offers);
  
      const count = await Offer.countDocuments(filters);
  
      res.status(200).json({ count, offers });
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  });
  
  router.get("/offer/:id", async (req, res) => {
    try {
      const detailOffer = await Offer.findById(req.params.id).populate({
        path: "owner",
        select: "account",
      });
  
      if (!detailOffer) {
        return res.status(400).json({ message: "No article with this ID" });
      }
  
      res.status(200).json(detailOffer);
      //console.log(req.params.id);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  });
  module.exports = router;