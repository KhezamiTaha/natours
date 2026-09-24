const mongoose = require('mongoose');
const slugify = require('slugify');

const tourSchema = new mongoose.Schema(
   {
      name: {
         type: String,
         required: [true, 'A tour must have a Name!'],
         unique: true,
      },
      slug: String,
      rating: {
         type: Number,
         default: 4.5,
      },
      price: {
         type: Number,
         required: [true, 'A tour must have a Price'],
      },
      duration: {
         type: Number,
         required: [true, 'A tour must have a duration'],
      },
      maxGroupSize: {
         type: Number,
         required: [true, 'A tour must have a group size'],
      },
      guides: [
         {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
         },
      ],
      difficulty: {
         type: String,
         required: [true, 'A Tour must have a Difficulty'],
         enum: {
            values: ['easy', 'medium', 'difficult'],
            message:
               'A difficulty must be easy, medium or difficult!',
         },
      },
      ratingsAverage: {
         type: Number,
         default: 4.5,
      },
      ratingsQuantity: {
         type: Number,
         default: 0,
      },
      priceDiscount: {
         type: Number,
         validate: {
            validator: function (value) {
               return value < this.price;
            },
            message:
               'The price Discount {VALUE} must be less than the Price',
         },
      },
      summary: {
         type: String,
         trim: true,
         required: [true, 'A Tour must have a Summary'],
      },

      description: {
         type: String,
         trim: true,
         required: [true, 'A tour must have a description'],
      },
      imageCover: {
         type: String,
         required: [true, 'A tour must have a cover image'],
      },
      images: [String],
      createdAt: {
         type: Date,
         default: Date.now(),
         select: false,
      },
      startLocation: {
         description: String,
         type: {
            type: String,
            enum: ['Point'],
         },
         coordinates: [Number],
         address: String,
      },
      locations: [
         {
            description: String,
            type: {
               type: String,
               enum: ['Point'],
            },
            coordinates: [Number],
            address: String,
            day: Number,
         },
      ],
      startDates: [Date],
      secretTour: {
         type: Boolean,
         default: false,
      },
   },
   {
      toJSON: { virtuals: true },
      toObject: { virtuals: true },
   },
);

tourSchema.virtual('durationPerWeek').get(function () {
   return this.duration / 7;
});

// Document Middleware aka 9bal w mba3d
tourSchema.pre('save', function (next) {
   this.slug = slugify(this.name, { lower: true });
   next();
});

tourSchema.post('save', function (document, next) {
   console.log(document);
   next();
});
//

tourSchema.pre(/^find/, function (next) {
   this.find({ secretTour: { $ne: true } });
   next();
});

tourSchema.pre('aggregate', function (next) {
   this.pipeline().unshift({
      $match: {
         secretTour: { $ne: true },
      },
   });
   next();
});

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
