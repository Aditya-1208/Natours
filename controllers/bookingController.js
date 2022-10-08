const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const catchAsync = require("../utils/catchAsync");
const Tour = require('./../models/tourModel');
const Booking = require('./../models/bookingModel');
const appError = require('./../utils/appError');
const factory = require('./handlerFactory');


exports.getCheckoutSession = catchAsync(async (req, res, next) => {
    //1 get the current tour which needs to be booked
    const tour = await Tour.findById(req.params.tourId);
    console.log(tour.price);
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        success_url: `${req.protocol}://${req.get('host')}/?tour=${req.params.tourId}&user=${req.user.id}&price=${tour.price}`,
        cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
        customer_email: req.user.email,
        client_reference_id: req.params.tourId,
        line_items: [{
            price_data: {
                currency: 'inr',
                unit_amount: tour.price * 80 * 100,
                product_data: {
                    name: `${tour.name} Tour`,
                    description: tour.summary,
                    images: ['https://www.natours.dev/img/tours/tour-1-cover.jpg'],
                },
            },
            quantity: 1,
        }],
        mode: 'payment'
    })

    res.status(200).json({
        status: 'success',
        session
    })

});

exports.createBookingCheckout = catchAsync(async (req, res, next) => {
    //temporary logic
    const { tour, user, price } = req.query;
    if (!tour && !user && !price) return next();//if not  hit as a result of payment then just go to dashboard
    await Booking.create({ tour, user, price });

    res.redirect(req.originalUrl.split('?')[0])
})

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBooking = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);