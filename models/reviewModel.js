const mongoose = require('mongoose');
const User = require('./userModel');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema({
    review: {
        type: String,
        required: [true, 'A review must have text']
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
    },
    createdAt: {
        type: Date,
        default: Date.now()
    },
    tour: {
        type: mongoose.Schema.ObjectId,
        ref: 'Tour',
        required: [true, 'A review must belong to a tour']
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'A review must be written by a user']
    }

})

reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
    // this.populate('user', 'name photo -_id').populate('tour', ' -guides name ');
    this.populate('user', 'name photo -_id');
    next();
})

reviewSchema.statics.calcAverageRatings = async function (tourId) {
    const stats = await this.aggregate([
        {
            $match: { tour: tourId }
        },
        {
            $group: {
                _id: '$tour',
                nRating: { $sum: 1 },
                ratingsAverage: { $avg: '$rating' }
            }
        }
    ]);
    if (stats.length > 0)
        await Tour.findByIdAndUpdate(tourId, { ratingsAverage: stats[0].ratingsAverage, ratingsQuantity: stats[0].nRating })
    else {
        await Tour.findByIdAndUpdate(tourId, { ratingsAverage: 4.5, ratingsQuantity: 0 })
    }
}

//Jonas' method

// reviewSchema.pre(/^findOneAnd/, async function (next) {
//     //we execute 'this' query beforehand, now it will reach to findOneAnd... method but it would have already been executed!
//     // this.reviewDoc = await this.findOne();
//     // So fix is like this, we use a method called clone to make a clone of query and execute it!
//     this.reviewDoc = await this.clone();
//     next;
// })

// reviewSchema.post(/^findOneAnd/, async function () {
//     await this.reviewDoc.constructor.calcAverageRatings(this.reviewDoc.tour);
// });

// Short n Sweet Method
reviewSchema.post(/^findOneAnd/, async function (doc) {
    //here doc means the doc on which query worked(means the reviewDoc)

    //!!!💥💥💥will throw error if deleted last review of a tour
    //coz now doc is the last deleted review doc of a tour, we pass tour's id to calcverageRatings
    // but that tour now has no reviews and hence aggregator returns undefined as match fails to find any review doc with tourId we passed!
    await doc.constructor.calcAverageRatings(doc.tour);
});

reviewSchema.post('save', function () {
    //we used constructor coz calcAverageRatings is defined on review model, but we can't use it still as model is not yet defined from schema, hence we used constructor to get model of current doc.
    this.constructor.calcAverageRatings(this.tour);
})

module.exports = mongoose.model('Review', reviewSchema);