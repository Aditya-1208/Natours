const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const jwt = require('jsonwebtoken');
const appError = require('../utils/appError');
const { promisify } = require('util');
const Email = require('./../utils/email')
const crypto = require('crypto');


const signToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRY_TIME
    })
}

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id)
    const cookieOptions = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRY_TIME * 24 * 60 * 60 * 1000),
        httpOnly: true
    }

    if (process.env.NODE_ENV === "production")
        cookieOptions.secure = true;

    res.cookie('jwt', token, cookieOptions)
    user.password = undefined;
    res.status(statusCode).json({
        status: "success",
        token,
        data: {
            user
        }
    })
}

exports.signup = catchAsync(async (req, res, next) => {
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        role: req.body.role
    });
    const url = `${req.protocol}://${req.get('host')}/me`;
    await new Email(newUser, url).sendWelcome();
    createSendToken(newUser, 201, res);
})


exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;
    //1 if no email or password
    if (!email || !password)
        return next(new appError('please provide email and password', 400));

    //2 check if email exists(means user exists)
    const user = await User.findOne({ email }).select('+password');
    if (!user)
        return next(new appError('Invalid credentials', 401));

    //3 if user exists match passwords
    const passMatch = await user.correctPassword(password, user.password);
    if (!passMatch)
        return next(new appError('Invalid credentials', 401));

    createSendToken(user, 200, res);
})

exports.logout = (req, res) => {
    // res.cookie('jwt', 'logged out', {
    //     expiresIn: Date.now() + 10 * 10000,
    //     httpOnly: true
    // });
    res.clearCookie('jwt');
    res.status(200).json({ status: 'success' });
}


exports.protect = catchAsync(async (req, res, next) => {
    const headers = req.headers;
    let token;
    //1 check token exists
    if (headers.authorization && headers.authorization.startsWith('Bearer')) {
        token = headers.authorization.split(' ')[1];

    }
    else if (req.cookies.jwt) {
        token = req.cookies.jwt;

    }

    if (!token)
        return next(new appError('Unauthorized access,please login again', 401))

    //2 verify token
    const tokenDecoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET)

    //3 check if user still exists
    const currentUser = await User.findById(tokenDecoded.id);


    if (!currentUser)
        return next(new appError('This user no longer exists', 401))
    //4 check if user changed password after token was issued

    if (currentUser.passwordModifiedAfter(tokenDecoded.iat))
        return next(new appError('Password changed recently, please login again', 401))


    req.user = currentUser
    next();
})
exports.isLoggedIn = catchAsync(async (req, res, next) => {
    if (req.cookies.jwt) {
        const token = req.cookies.jwt;

        //2 verify token
        const tokenDecoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET)

        //3 check if user still exists
        const currentUser = await User.findById(tokenDecoded.id);


        if (!currentUser)
            return next();
        //4 check if user changed password after token was issued

        if (currentUser.passwordModifiedAfter(tokenDecoded.iat))
            return next();

        //So there is a logged in user, make it accessible to template
        res.locals.user = currentUser;
    }
    next();
})

exports.restrictTo = (...roles) => {
    return catchAsync(async (req, res, next) => {
        if (!roles.includes(req.user.role))
            return next(new appError('You don\'t have permission to perform this action', 403))
        next()
    })
}

exports.forgotPassword = catchAsync(async (req, res, next) => {

    //1 Get user
    const user = await User.findOne({ email: req.body.email });
    if (!user)
        return next(new appError('User not found', 404));

    //2 generate password reset token
    const resetToken = user.generatePasswordResetToken();
    //we modified user document but now need save the fields we added, namely token and expiry
    await user.save({ validateBeforeSave: false })

    try {
        // await sendEmail({
        //     email: user.email,
        //     subject: 'Password Reset',
        //     text: resetUrl,
        //     message: 'valid only for 10 min'
        // })
        const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
        await new Email(user, resetUrl).sendPasswordReset();
    }
    catch (err) {
        user.passResetToken = undefined;
        user.passResetExpires = undefined;
        await user.save({ validateBeforeSave: false })
        return next(new appError('error sending email, try again later', 500))

    }

    res.status(200).json({
        status: "success",
        message: "Token sent to mail "
    })

    //3 send email

})

exports.resetPassword = catchAsync(async (req, res, next) => {

    //1 Take reset token from req params and hash it to compare with one stored in db
    const hashedToken = crypto.createHash('sha256').update(req.params.resetToken).digest('hex');

    //2 find user based on token and also token not expired
    const user = await User.findOne({ passResetToken: hashedToken, passResetExpires: { $gt: Date.now() } });

    if (!user)
        return next(new appError('Token invalid or expired', 400));

    //3 we got user set the password now
    user.password = req.body.password;
    user.confirmPassword = req.body.confirmPassword;
    user.passResetToken = undefined;
    user.passResetExpires = undefined;

    await user.save();


    //login the user
    createSendToken(user, 200, res);


})

exports.updatePassword = catchAsync(
    async (req, res, next) => {
        //1 get current user
        const currentUser = await User.findById(req.user.id).select('+password');
        if (!currentUser)
            return next(new appError('Invalid user', 401));

        //2 check if current password is correct
        const passMatch = await currentUser.correctPassword(req.body.oldPassword, currentUser.password);
        if (!passMatch)
            return next(new appError('Incorrect password', 401));

        //3 If so,update password 
        currentUser.password = req.body.newPassword;
        currentUser.confirmPassword = req.body.confirmNewPassword;
        await currentUser.save();

        //log in the user
        createSendToken(currentUser, 200, res);

    }
)