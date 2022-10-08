module.exports = class APIFeatures {
    // we need to have the mongoQuery because it will be attached to collection we need to target and hence we can use this same class for any api!

    constructor(reqQuery, mongoQuery) {
        // console.log({...reqQuery});
        this.queryObj = { ...reqQuery };
        this.mongoQuery = mongoQuery;
    }

    filter() {
        //filtering
        let excludedQuery = { ...this.queryObj };
        const excludedFields = ['page', 'sort', 'limit', 'fields']
        excludedFields.forEach(el => delete excludedQuery[el]);


        //advanced filtering
        excludedQuery = JSON.parse(JSON.stringify(excludedQuery).replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`));
        this.mongoQuery.find(excludedQuery);

        return this;
    }

    sort() {
        if (this.queryObj.sort) {
            //two ways
            this.mongoQuery = this.mongoQuery.sort(this.queryObj.sort.replace(/\b,\b/g, ' '));
            // query = query.sort(req.query.sort.split(',').join(' '));

        }
        else {
            this.mongoQuery = this.mongoQuery.sort('-createdAt')
        }
        return this;
    }

    limitFields() {
        if (this.queryObj.fields) {
            this.mongoQuery = this.mongoQuery.select(this.queryObj.fields.replace(/\b,\b/g, ' '));
        }
        else {
            this.mongoQuery = this.mongoQuery.select('-__v')
        }
        return this;
    }

    paginate() {
        // console.log(this.queryObj);
        const page = this.queryObj.page || 1;
        const limit = this.queryObj.limit || 1000;
        const skip = (page - 1) * limit;

        this.mongoQuery = this.mongoQuery.skip(skip).limit(limit);

        // if (this.queryObj.page) {
        //     const toursCount = await Tour.countDocuments();
        //     if (skip >= toursCount) {
        //         throw new Error('This page does not exist!');
        //     }
        // }
        return this;
    }
}