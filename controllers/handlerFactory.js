const catchAsync = require('../utils/catchAsync');
const appError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

exports.deleteOne = (model) => {
    return catchAsync(async (req, res, next) => {
        const doc = await model.findByIdAndDelete(req.params.id);

        if (!doc) {
            return next(new appError(`Coudln't find a document with id-${req.params.id}`, 404));
        }

        res.status(204).json(
            {
                status: 'success',
                data: null
            }
        );

    })
}

exports.updateOne = (model) => {
    return catchAsync(async (req, res, next) => {
        const doc = await model.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!doc) {
            return next(new appError(`Coudln't find a document with id-${req.params.id}`, 404));
        }

        res.status(200).json(
            {
                status: 'success',
                data: {
                    data: doc
                }
            }
        );
    })
}

exports.createOne = (model) => {
    return catchAsync(async (req, res, next) => {

        const doc = await model.create(req.body);
        res.status(201).json(
            {
                status: 'success',
                data: {
                    data: doc
                }
            }
        );

    })
}

exports.getOne = (model, popOptions) => {
    return catchAsync(async (req, res, next) => {
        const doc = await model.findById(req.params.id).populate(popOptions);
        // const tour = await Tour.findOne({_id : req.params.id});

        if (!doc) {
            return next(new appError(`Coudln't find a document with id-${req.params.id}`, 404));
        }

        res.status(200).json({
            status: 'success',
            data: {
                data: doc,
            },
        });

    })
}

exports.getAll = (model) => {
    return catchAsync(async (req, res, next) => {

        //HACK: only for nested GET reviews on tours
        let filter = {};
        if (req.params.tourId)
            filter = { tour: req.params.tourId };

        // const tours = await Tour.find({ duration: 5, difficulty: 'easy' });
        // const tours = await Tour.find().where('duration').equals(5).where('difficulty').equals('easy');
        //Execute query
        const features = new APIFeatures(req.query, model.find(filter)).filter().sort().limitFields().paginate();
        // const doc = await features.mongoQuery.explain();
        const doc = await features.mongoQuery;
        // const tours = await Tour.find();
        res.status(200).json({
            status: 'success',
            results: doc.length,
            data: {
                data: doc,
            },
        });
    })
}