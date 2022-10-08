const appError = require("../utils/appError");

const sendErrDev = (err, req, res) => {

    if (req.originalUrl.startsWith('/api')) {
        return res.status(err.statusCode).json({
            status: err.status,
            err: err,
            message: err.message,
            stack: err.stack
        })
    }
    console.error('ERROR💥', err);
    //rendered website error
    res.status(err.statusCode).render('error', {
        title: 'Something went wrong',
        msg: err.message
    })
};

const sendErrProd = (err, req, res) => {
    //api errors
    if (req.originalUrl.startsWith('/api')) {
        if (err.isOperational)
            return res.status(err.statusCode).json({
                status: err.status,
                message: err.message
            })
        //internal erros, so don't leak details!
        console.error('ERROR💥', err);
        return res.status(500).json({
            status: 'error',
            message: 'Unexpected error occured'
        })
    }
    //rendered website errors
    if (err.isOperational)
        return res.status(err.statusCode).render('error', {
            title: 'Something Went Wrong!',
            msg: err.message
        })
    //internal erros, so don't leak details!
    console.error('ERROR💥', err);
    return res.status(500).render('error', {
        title: 'Something Went Wrong!',
        msg: 'Please try later'
    })


}

const handleErrCastDB = (err) => {
    const message = `Inavalid ${err.path}-${err.value}`;
    return new appError(message, 400);
}

const handleDuplicateErrDB = (err) => {
    const values = Object.values(err.keyValue).join(', ');
    const message = `Duplicate field value(s): ${values}. Please try different value(s)!`;
    return new appError(message, 400);
}

const handlevalidationErrDB = err => {
    const errors = Object.values(err.errors).map(obj => obj.message);
    const message = `Input data found invalid due to following reason(s):${errors.join(',')}`
    return new appError(message, 400)
}

const handleJwtErr = () => new appError('Unauthenticated Access', 401)
const handleJwtExpiryErr = () => new appError('Session expired, please log in again', 401)

module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'fail';
    console.log(err);
    if (process.env.NODE_ENV === "development")
        sendErrDev(err, req, res);
    else if (process.env.NODE_ENV === "production") {
        let error = { ...err }
        error.message = err.message;
        if (error.name === "CastError") {
            error = handleErrCastDB(error);
        }
        else if (error.code === 11000) {
            error = handleDuplicateErrDB(error);
        }
        else if (error.name === "ValidationError")
            error = handlevalidationErrDB(error);
        else if (error.name === "JsonWebTokenError")
            error = handleJwtErr();
        else if (error.name === "TokenExpiredError")
            error = handleJwtExpiryErr();

        sendErrProd(error, req, res);
    }
}