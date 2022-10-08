const appError = require('../utils/appError');
const Tour = require('./../models/tourModel');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');
const multer = require('multer');
const sharp = require('sharp');

exports.aliasTopTours = (req, res, next) => {
    req.query.limit = 5;
    req.query.sort = '-ratingsAverage,price';
    req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
    next();
}
// const tours = JSON.parse(
//     fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
// );

// exports.checkId = (req, res, next, val) => {
//     if (!tours.find(el => el.id === Number(val))) {
//         return res.status(404).json({
//             status: 'fail',
//             message: 'invalid id'
//         })
//     }
//     next();
// }

// exports.checkBody = (req, res, next) => {
//     if (req.body.name && req.body.price) {
//         next();
//     }
//     else {
//         return res.status(400).json({
//             status: 'fail',
//             message: 'missing name or price or both'
//         })
//     }
// }

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image'))
        cb(null, true)
    else
        cb(new appError('Not an image, please upload valid image', 400), false);
}

const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter
});
//here fields refer to form fields!
exports.uploadTourImages = upload.fields([
    {
        name: 'imageCover', maxCount: 1
    },
    {
        name: 'images', maxCount: 3
    }
])

exports.resizeTourImages = catchAsync(async (req, res, next) => {
    if (!req.files.imageCover || !req.files.images)
        return next();

    //cover image
    req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
    await sharp(req.files.imageCover[0].buffer).resize(2000, 1333).toFormat('jpeg').jpeg({ quality: 90 }).toFile(`public/img/tours/${req.body.imageCover}`);

    req.body.images = [];
    await Promise.all(req.files.images.map(async (file, i) => {
        const fileName = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;
        await sharp(file.buffer).resize(2000, 1333).toFormat('jpeg').jpeg({ quality: 90 }).toFile(`public/img/tours/${fileName}`);
        req.body.images.push(fileName);
    }));
    console.log(req.body);

    next();
});

exports.getAllTours = factory.getAll(Tour);
exports.createNewTour = factory.createOne(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.updateTour = factory.updateOne(Tour)
exports.deleteTour = factory.deleteOne(Tour);

exports.tourStats = catchAsync(async (req, res, next) => {
    const tourStat = await Tour.aggregate([
        {
            $match: { ratingsAverage: { $gte: 3 } }
        },
        {
            $group: {
                _id: '$difficulty',
                num: { $sum: 1 },
                numRatings: { $sum: '$ratingsQuantity' },
                avgRatings: { $avg: '$ratingsAverage' },
                avgPrice: { $avg: '$price' },
                minPrice: { $min: '$price' },
                maxPrice: { $max: '$price' }

            }
        },
        {
            $sort: {
                avgPrice: 1
            }
        }
    ])
    res.status(200).json(
        {
            status: 'success',
            data: {
                tourStat
            }
        }
    );

})
exports.monthlyPlans = catchAsync(async (req, res, next) => {
    const year = req.params.year * 1;
    const monthlyPlan = await Tour.aggregate([
        {
            $unwind: '$startDates'
        },
        {
            $match: {
                startDates: {
                    $gte: new Date(`${year}-01-01`),
                    $lte: new Date(`${year}-12-31`)
                }
            }
        },
        {
            $group: {
                _id: { $month: '$startDates' },
                numTours: { $sum: 1 },
                tours: {
                    $push: '$name'
                }
            }
        },
        {
            $sort: {
                _id: 1
            }
        },
        {
            $addFields: {
                month: {
                    $arrayElemAt: [
                        ['', 'January', 'Feburary', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], '$_id'
                    ]
                }
            }
        },
        {
            $project: {
                _id: 0
            }
        },
        {
            $sort: {
                numTours: -1
            }
        }
    ])
    res.status(200).json(
        {
            status: 'success',
            data: {
                monthlyPlan
            }
        }
    );
})

//tours-within/233/center/34.111745-118.113491/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
    const { distance, latlng, unit } = req.params;
    const [lat, lng] = latlng.split(',');
    // console.log(distance, lat, lng, unit);
    if (!lat || !lng) {
        return next(new appError('please give center-coordinates in lat,lng format', 400))
    }
    const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1
    const tours = await Tour.find({
        startLocation: {
            $geoWithin: { $centerSphere: [[lng, lat], radius] }
        }
    });


    res.status(200).json({
        status: "success",
        results: tours.length,
        data: {
            data: tours
        }
    })
})
exports.getDistances = catchAsync(async (req, res, next) => {
    const { latlng, unit } = req.params;
    const [lat, lng] = latlng.split(',');
    // console.log(distance, lat, lng, unit);
    if (!lat || !lng) {
        return next(new appError('please give center-coordinates in lat,lng format', 400));
    }

    const multiplier = unit === 'mi' ? 0.000621371 : .001;

    const distances = await Tour.aggregate([
        {
            $geoNear: {
                near: {
                    type: 'Point',
                    coordinates: [lng * 1, lat * 1]
                },
                distanceField: 'distance',
                distanceMultiplier: multiplier//for converting to Km or mile as user said
            }
        },
        {
            $project: {
                distance: 1,
                name: 1
            }
        }
    ])

    res.status(200).json({
        status: "success",
        data: {
            data: distances
        }
    })

})