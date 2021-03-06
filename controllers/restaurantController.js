'use strict';

const Restaurant = require('../models/restaurant'),
    ApiHelper = require('../helpers/api'),
    bcrypt = require('bcrypt-nodejs'),
    config = require('../config/config'),
    jwt = require('jsonwebtoken');

exports.loginRestaurant = (req, res) => {
    let conditions = { email: req.body.email };
    Restaurant.findOne(conditions, function (err, resp) {

        if (err)
            return res.status(500).send(`There was an error searching all ${T.modelName}, please try again later. Error: ${err.message}`);

        if (!resp)
            return res.status(200).send({ message: 'E-mail or password is not correct' });

        //1º validate password hash are equals or 2º validate password decoded with password encoded.
        if (req.body.password === resp.password || bcrypt.compareSync(req.body.password, resp.password)) {

            let token = jwt.sign({ username: resp.username, email: resp.email, _id: resp.id }, config.secret, {
                expiresIn: 10800 //Seconds
            });
            resp.set({ lastLogin: resp.nextLastLogin });
            resp.set({ nextLastLogin: Date.now() });
            resp.save()
                .then(resp => {
                    delete resp._doc.password;
                    res.status(200).send({ success: true, message: 'Authenticated!', token: token, restaurant: resp });
                })
                .catch(err => console.log(err));
        } else return res.status(200).send({ message: 'E-mail or password is not correct' });
    }).select('+password');
};

exports.addRestaurant = (req, res) => {

    if (!req.body.email || !req.body.password || !req.body.username) {
        res.status(400).send({ message: 'Please enter all fields.' });
    } else {
        let conditions = { $or: [{ email: req.body.email }, { username: req.body.username }] };
        ApiHelper.addModel(req, res, Restaurant, conditions);
    }
};
exports.deleteRestaurantByName = (req, res) => ApiHelper.deleteModelByName(req, res, Restaurant);

exports.deleteRestaurantById = (req, res) => ApiHelper.deleteModelById(req, res, Restaurant);

exports.updateRestaurantById = (req, res) => {
    if (req.body.password) {
        bcrypt.genSalt(10, function (err, salt) {
            if (err) return err;
            bcrypt.hash(req.body.password, salt, null, function (err, hash) {
                if (err) return err;
                req.body.password = hash;
            });
        });
    }
    console.log(req.body._id)
    ApiHelper.updateModelById(req, res, Restaurant);
};

exports.findAllRestaurant = (req, res) => {
    Restaurant.find().select('-username -nextLastLogin -lastLogin -signupDate')
        .then(resp => res.status(200).jsonp(resp))
        .catch(err => res.status(500).send(`There was an error searching all restaurants, please try again later. Error: ${err.message}`));
};

exports.findRestaurantPublic = (req, res) => {
    Restaurant.findOne({ _id: req.query.id }).select('-username -nextLastLogin -lastLogin -signupDate')
        .then(resp => res.status(200).jsonp(resp))
        .catch(err => res.status(500).send(`There was an error searching the restaurant, please try again later. Error: ${err.message}`));
};

exports.findRestaurant = (req, res) => {
    let conditions = { _id: req.query.id };
    ApiHelper.findOneModel(req, res, Restaurant, conditions, 'orders');
};
exports.findRestaurantByName = (req, res) => {
    // conditions = {$text:{ $search:req.body.name }};
    let conditions;
    if (req.query.name)
        conditions = { name: {$regex: req.query.name,$options:'i'}};
        //conditions = { name: eval(`/${req.query.name}/`) };
    ApiHelper.findModels(req, res, Restaurant, conditions);
};
exports.findRestaurantsNamesByName = (req, res) => {
    Restaurant.find({ name: {$regex: req.query.name,$options:'i'}}).select('name')
        .then(resp => res.status(200).jsonp(resp))
        .catch(err => res.status(500).send(`There was an error searching the restaurant, please try again later. Error: ${err.message}`));
};
exports.findRestaurantByConditions = (req, res) => {
    var conditions = {};
    if (req.body.homeDelivery)
        conditions["tags.homeDelivery"]=req.body.homeDelivery  ;
    if (req.body.takeAway)
        conditions ["tags.takeAway"]=req.body.takeAway ;
    if (req.body.priceMin)
        conditions["tags.average.dish"] = { $gte: req.body.priceMin };
    if (req.body.priceMax){
        if(!conditions["tags.average.dish"])
            conditions["tags.average.dish"] = { $lt: req.body.priceMax };
        else
        conditions["tags.average.dish"]["$lt"] = req.body.priceMax;
    }

    // if ((req.body.takeAway)&&(req.body.homeDelivery))
    //     conditions = { "tags.homeDelivery": req.body.homeDelivery  , "tags.takeAway": req.body.takeAway };
    console.log(req.body);
    console.log(conditions);
    if(req.body.distanceMin||req.body.distanceMax) {
        ApiHelper.findByDistance(req, res, Restaurant, conditions);

    }
    else
        ApiHelper.findModels(req, res, Restaurant, conditions);
};