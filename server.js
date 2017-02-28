var express = require('express');
var bodyParser = require('body-parser');
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId;
var voucher_codes = require('voucher-code-generator');
var bcrypt = require('bcryptjs');
var jwt = require('jwt-simple');

var app = express();
var JWT_SECRET = 'reservation';
var db = null;

MongoClient.connect("mongodb://localhost:27017/wilsons", function (err, dbconn) {
    if (!err) {
        console.log("We are connected");
        db = dbconn;
    }
});

app.use(express.static('public'));
app.use(bodyParser.json());

app.get('/reservations', function (req, res, next) {
    db.collection('reservations', function (err, reservationsCollection) {

        reservationsCollection.find().toArray(function (err, reservations) {
            return res.json(reservations);
        });
    });
});

app.post('/reservations', function (req, res, next) {
    db.collection('reservations', function (err, reservationsCollection) {

        var confirmcode = voucher_codes.generate({
            length: 6,
            count: 1,
            charset: "0123456789"
        });

        var newReservation = {reservations: req.body, confirmcode: confirmcode};

        reservationsCollection.insert(newReservation, {w: 1}, function (err) {
            return res.send();
        });
    });
});

app.put('/reservations/delete', function (req, res, next) {
    db.collection('reservations', function (err, reservationsCollection) {

        var reservationId = req.body.reservations._id;

        reservationsCollection.remove({_id: ObjectId(reservationId)}, {w: 1}, function (err) {
            return res.send();
        });
    });
});

app.post('/owners', function (req, res, next) {
    db.collection('owners', function (err, ownersCollection) {

        bcrypt.genSalt(10, function (err, salt) {
            bcrypt.hash(req.body.password, salt, function (err, hash) {

                var newOwner = {
                    email: req.body.email,
                    password: hash
                };

                ownersCollection.insert(newOwner, {w: 1}, function (err) {
                    return res.send();
                });
            });
        });
    });
});

app.put('/owners/signin', function (req, res, next) {
    db.collection('owners', function (err, ownersCollection) {

        ownersCollection.findOne({email: req.body.email}, function (err, owner) {
            bcrypt.compare(req.body.password, owner.password, function (err, result) {
                if (result) {
                    var token = jwt.encode(owner, JWT_SECRET);
                    return res.json({token: token});
                } else {
                    return res.status(400).send();
                }
            });
        });
    });
});

app.get('/reservations/:confirmcode', function (req, res, next) {
    db.collection('reservations', function (err, reservationsCollection) {

        var confirmcode = req.params.confirmcode;

        reservationsCollection.findOne({confirmcode: confirmcode}, function (err, reservations) {
            return res.send(reservations);
        });

    });
});

app.put('/reservations/:confirmcode', function (req, res, next) {
    db.collection('reservations', function (err, reservationsCollection) {

        var confirmcode = req.params.confirmcode;

        reservationsCollection.update({confirmcode: confirmcode}, {
            $set: {
                firstname: req.body.firstname,
                lastname: req.body.lastname,
                email: req.body.email,
                phonenumber: req.body.phonenumber,
                date: req.body.date,
                time: req.body.time,
                noofpeople: req.body.noofpeople
            }
        }, function (err) {
            return res.send();
        });
    });
});

app.listen('3000', function () {
    console.log("App is listening on port 3000!");
});