const Booking = require('../models/bookingModel');
const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const appError = require('./../utils/appError');

exports.getOverview = catchAsync(async (req, res) => {

    const tours = await Tour.find();

    res.status(200).render('overview', {
        title: 'All Tours', tours
    })
})

exports.getTour = catchAsync(async (req, res, next) => {

    const tour = await Tour.findOne({ slug: req.params.slug }).populate({ path: 'reviews', fields: 'review rating user' });

    if (!tour)
        return next(new appError('There is no tour with that name', 404));

    res.status(200).render('tour', {
        title: `${tour.name} Tour`,
        tour
    })
});

exports.renderLogin = catchAsync(async (req, res) => {
    res.status(200).render('login', {
        title: "Login to your account"
    })
});

exports.getAccount = catchAsync(async (req, res) => {
    res.status(200).render('account', {
        title: 'Your Account'
    })
})
exports.getMyTours = catchAsync(async (req, res) => {
    //find all bookings
    const bookings = await Booking.find({ user: req.user.id });

    //find tours with returned ids
    const tourIds = bookings.map(el => el.tour);
    const tours = await Tour.find({ _id: { $in: tourIds } });
    res.status(200).render('overview', {
        title: 'My tours',
        tours
    })
})

exports.updateUserData = catchAsync(async (req, res, next) => {
    const updatedUser = await User.findByIdAndUpdate(req.user.id, {
        name: req.body.name,
        email: req.body.email
    }, {
        new: true,
        runValidators: true
    });
    res.status(200).render('account', {
        title: 'Your account',
        user: updatedUser
    })
})