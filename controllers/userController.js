const appError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const User = require('./../models/userModel');
const factory = require('./handlerFactory');

const multer = require('multer');
const sharp = require('sharp');

// const multerStorage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, 'public/img/users');
//     },
//     filename: (req, file, cb) => {
//         const extension = file.mimetype.split('/')[1];
//         cb(null, `user-${req.user.id}-${Date.now()}.${extension}`)
//     }
// });

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

exports.updateUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
    if (!req.file) next();

    req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

    await sharp(req.file.buffer).resize(500, 500).toFormat('jpeg').jpeg({ quality: 90 }).toFile(`public/img/users/${req.file.filename}`);

    next();
}
);

const filterObj = (obj, ...allowedFields) => {
    const filteredbody = {};
    Object.keys(obj).forEach(el => {
        if (allowedFields.includes(el))
            filteredbody[el] = obj[el];
    })
    return filteredbody;
}

exports.getMe = (req, res, next) => {
    req.params.id = req.user.id;
    next();
}

exports.updateMe = catchAsync(async (req, res, next) => {
    //1 error if user tries to update passsword
    if (req.body.password || req.body.confirmPassword)
        return next(new appError('can\'t update password here', 400));

    //2 update user

    const filteredBody = filterObj(req.body, 'name', 'email');
    if (req.file)
        filteredBody.photo = req.file.filename;
    const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        status: "success",
        data: {
            user: updatedUser
        }

    })

})

exports.deleteMe = catchAsync(
    async (req, res, next) => {
        await User.findByIdAndUpdate(req.user.id, { active: false });

        res.status(204).json({
            status: "success",
            data: null
        })
    }
)


//this route will never be defined
exports.createNewUser = (req, res) => {
    res.status(500).json({
        status: 'error',
        message: 'this route is not yet defined and will never be, please sign up'
    });
}
exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);
// don't update passwords here!
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User)