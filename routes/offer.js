const express = require("express");
const fileUpload = require("express-fileupload");
const convertToBase64 = require("../utils/convertToBase64"); // Fonction qui permet de transformer nos fichier qu'on reçois sous forme de Buffer en base64 afin de pouvoir les upload sur cloudinary
const isAuthenticated = require('../middlewares/isAuthenticated');

const Offer = require("../models/Offer");
const cloudinary = require('cloudinary').v2;

const router = express.Router();

// Return "https" URLs by setting secure: true
cloudinary.config({ 
    cloud_name: 'dnnjwgolt', 
    api_key: '969599212569319', 
    api_secret: 'FRIFwUy3nQsfYtzLDXUGcaf4nFE',
    secure: true
  });

// Create
    router.post('/offer/publish', isAuthenticated, fileUpload(), async (req,res) => {
        try {
            const {title, description, price, condition, city, brand, size, color} = req.body;

            const newOffer = new Offer({
                product_name: title,
                product_description: description,
                product_price: price,
                product_details: [
                { MARQUE: brand },
                { TAILLE: size },
                { ÉTAT: condition },
                { COULEUR: color },
                { EMPLACEMENT: city },
                ],
                owner: req.user,
            });

            if (req.files?.picture) {
                const result = await cloudinary.uploader.upload(
                    // convert picture
                    convertToBase64(req.files.picture), {
                        folder: "/vinted/offers"
                    }
                );
                newOffer.product_image = result;
              }

            await newOffer.save();
            res.status(200).json({newOffer});
        } catch (error) {
            res.status(400).json({message : error.message}); 
        }
    })

// Read
    router.get('/offers', async (req, res) => {
        try {
            const {title, priceMin, priceMax, sort, page} = req.query;
                
                /* ----------- FILTERS ----------- */ 
                const filters = {};

                if(title){
                    filters.product_name = new RegExp(title, 'i');
                }

                if(priceMin){
                    filters.product_price = {$gte: Number(priceMin) };
                }
                
                if(priceMax){
                    if(!filters.product_price){
                        filters.product_price = {$lte: Number(priceMax) };
                    } else {
                        filters.product_price.$lte = Number(priceMax);
                    }
                }

                // asc || desc
                const sortFilter = {}
                if(sort === "price-desc"){
                    sortFilter.product_price = "desc";
                } else if(sort === "price-asc"){
                    sortFilter.product_price = "asc";
                }

                // 5 résults per page : 1 skip 0, 2 skip 5, 3 skip 10, 4 skip 15
                // 3 résults per page : 1 skip 0, 2 skip 3, 3 skip 6, 4 skip 9
                const limit = 5;
                let pageRequired = 1;

                if(page){
                    pageRequired = Number(page);
                }
                
                const skip = (pageRequired - 1) * limit;

                /* ----------- END FILTERS ----------- */ 
            
            const offers = await Offer.find(filters)
                .sort(sortFilter)
                .skip(skip)
                .limit(limit)
                .select("product_name product_price owner")
                .populate("owner", "account _id");

            // number of results
            const offerCount = await Offer.countDocuments(filters)

            res.json({count: offerCount, offers: offers});
        } catch (error) {
            res.status(400).json({message : error.message});  
        }
    });

module.exports = router;