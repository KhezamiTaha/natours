const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
   name: {
      type: String,
      required: [true, 'A user must have a name'],
      trim: true,
   },
   email: {
      type: String,
      required: [true, 'A user must have an email'],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
   },
   photo: {
      type: String,
      default: 'default.jpg',
   },
   password: {
      type: String,
      required: [true, 'A user must have a password'],
      minlength: 8,
      select: false, // could not be selected in mongoose queries
   },
   passwordConfirm: {
      type: String,
      required: [true, 'Please confirm your password'],
      validate: {
         validator: function (value) {
            return value === this.password;
         },
         message: 'Passwords are not the same',
      },
   },
   passwordChangedAt: Date,
});

userSchema.pre('save', function (next) {
   if (!this.isModified('password') || this.isNew) {
      this.passwordConfirm = undefined;
      return next();
   }

   this.passwordChangedAt = Date.now() - 1000;

   bcrypt
      .hash(this.password, 12)
      .then((hashedPassword) => {
         this.password = hashedPassword;
         this.passwordConfirm = undefined;
         next();
      })
      .catch(next);
});

userSchema.methods.changedPasswordAfter = function (tokenIssuedAt) {
   if (this.passwordChangedAt) {
      const changedTimestamp = parseInt(
         this.passwordChangedAt.getTime() / 1000,
         10,
      );
      return tokenIssuedAt < changedTimestamp;
   }

   return false;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
