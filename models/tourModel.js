const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
const User = require('../models/userModel');
// const Review = require('../models/reviewModel');
const tourSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'A tour must have a name'],
        unique: [true, 'Duplicate key'],
        trim: true,
        maxlength: [40, 'A name must have less than or equal to 40 characters'],
        minlength: [10, 'A name must have greater than or equal to 10 characters'],
        // validate : [validator.isAlpha,'Name must only contain alphabets!']
        // validate : {
        //     validator : validator.isAlpha,
        //     message : 'Name must only contain alphabets!'
        // }

    },
    duration: {
        type: Number,
        required: [true, 'A tour must have a duration']
    },
    maxGroupSize: {
        type: Number,
        required: [true, 'A tour must have a group size']
    },
    difficulty: {
        type: String,
        required: [true, 'A tour must have a diffficulty'],
        enum: {
            values: ['easy', 'medium', 'difficult'],
            message: 'difficulty must be one of easy,medium or difficult'
        }
    },
    ratingsAverage: {
        type: Number,
        default: 4,
        min: [1, 'rating must be greater than equal to 1'],
        max: [5, 'rating must be less than equal to 5'],
        set: (val) => {
            return math.round(val * 10) / 10;
        }
    },
    ratingsQuantity: {
        type: Number,
        default: 0
    },
    price: {
        type: Number,
        required: [true, 'A tour must have a price']
    },
    priceDiscount: {
        type: Number,
        validate: {
            validator: function (val) {
                //this points to current doc only incsae of NEW DOC FORMED !!!!!
                return val < this.price;
            },
            message: 'discount ({VALUE}) must be less than price!'
        }
    },
    summary: {
        type: String,
        trim: true,
        required: [true, 'A tour must have a description']
    },
    description: {
        type: String,
        trim: true
    },
    imageCover: {
        type: String,
        required: [true, 'A tour must have a cover image']
    },
    images: [String],
    createdAt: {
        type: Date,
        default: Date.now(),
        select: false
    },
    startDates: [Date],
    secretTour: {
        type: Boolean,
        default: false
    },

    startLocation: {
        //geoJSON
        type: {
            type: String,
            default: 'Point',
            enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String
    },
    //for middleware locations, an array of objects
    locations: [
        {
            type: {
                type: String,
                default: 'Point',
                enum: ['Point']
            },
            coordinates: [Number],
            address: String,
            description: String,
            day: Number

        }
    ],

    // guides: Array, for embedding
    guides: [
        { type: mongoose.Schema.ObjectId, ref: 'User' }
    ],


    slug: String
},
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
)

// tourSchema.index({ price: 1 })
tourSchema.index({ price: 1, ratingsAverage: -1 })
tourSchema.index({ slug: 1 })
tourSchema.index({ startLocation: '2dsphere' });
tourSchema.virtual('durationWeeks').get(function () {
    return this.duration / 7;
})

//virtual populate
tourSchema.virtual('reviews', {
    ref: 'Review',
    foreignField: 'tour',
    localField: '_id'
})

//Document middleware
tourSchema.pre('save', function (next) {
    this.slug = slugify(this.name, {
        replacement: '-',  // replace spaces with replacement character, defaults to `-`
        lower: true,      // convert to lower case, defaults to `false`
        strict: false,     // strip special characters except replacement, defaults to `false`
        locale: 'vi',       // language code of the locale to use
        trim: true         // trim leading and trailing replacement chars, defaults to `true`
    })
    next();
})

// tourSchema.pre('save', async function (next) {
//     const guidesPromises = this.guides.map(async (id) => {
//         return await User.findById(id);
//     })
//     this.guides = await Promise.all(guidesPromises);


//     next();
// })

// tourSchema.post('save',(document,next)=>{
//     console.log(document);
//     next();
// })


// Query Middleware
tourSchema.pre(/^find/, function (next) {
    this.find({
        secretTour: { $ne: true }
    })
    this.start = Date.now();
    next();
})

tourSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'guides',
        select: '-__v -passModifiedAt'
    });
    next();
})

tourSchema.post(/^find/, function (docs, next) {
    console.log(`The query took ${Date.now() - this.start} ms`);
    next();
})

//aggregation middleware
// tourSchema.pre('aggregate', function (next) {
//     console.log(this._pipeline);
//     this.pipeline().unshift({
//         $match: {
//             secretTour: { $ne: true }
//         }
//     })
//     next();
// })

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;