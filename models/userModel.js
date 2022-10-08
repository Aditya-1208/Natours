const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: [true, "User must have a name"]
    },
    email: {
        type: String,
        required: [true, "user must have an email"],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, "Invalid Email"]
    },
    role: {
        type: String,
        enum: ['user', 'guide', 'lead-guide', 'admin'],
        default: 'user'
    },
    photo: {
        type: String,
        default: 'default.jpg'
    },
    password: {
        type: String,
        required: [true, "Passwword please"],
        minlength: 8,
        select: false
    },
    confirmPassword: {
        type: String,
        required: [true, "please confirm your password"],
        validate: {
            //works only on create/save and not on update
            validator: function (confirmPass) {
                return confirmPass === this.password;
            },
            message: "passwords don't match"
        }
    },
    passModifiedAt: {
        type: Date
    },
    passResetToken: {
        type: String
    },
    passResetExpires: {
        type: Date
    },
    active: {
        type: Boolean,
        default: true,
        select: false
    }
})

// document middlewares
userSchema.pre('save', function (next) {
    if (!this.isModified('password') || this.isNew) return next();
    this.passModifiedAt = Date.now();
    next();
})

userSchema.pre('save', async function (next) {

    if (!this.isModified('password')) return next();
    else {
        const hash = await bcrypt.hash(this.password, 12);
        this.password = hash;
        // as this point validation already happened as this middleware runs just before save!  
        this.confirmPassword = undefined;

        next();
    }

})


// query middlewares
userSchema.pre(/^find/, function (next) {
    this.find({ active: { $ne: false } });
    next()
})

// model methods
userSchema.methods.correctPassword = async (candidatePassword, userPassword) => {
    return await bcrypt.compare(candidatePassword, userPassword)
}

userSchema.methods.passwordModifiedAfter = function (JwtIssueTime) {
    if (this.passModifiedAt) {
        const passModTimeSec = this.passModifiedAt.getTime() / 1000;
        return passModTimeSec > JwtIssueTime;
    }
    return false;
}

userSchema.methods.generatePasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex');
    this.passResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    this.passResetExpires = Date.now() + 10 * 60 * 1000;//10 minutes from now

    return resetToken;
}

const User = mongoose.model('User', userSchema);

module.exports = User;