const Tour = require("../models/tourModel");

class ApiFeatures {
   constructor(query, requestQuery) {
      this.query = query;
      this.requestQuery = requestQuery;
   }

   // Filtering
   filter() {
      const queryNet = { ...this.requestQuery };
      const excludedFields = ['limit', 'sort', 'fields', 'page'];
      excludedFields.forEach((field) => delete queryNet[field]);

      // regex to add the $ sign
      let queryString = JSON.stringify(queryNet);
      queryString = queryString.replace(
         /\b(gt|gte|lt|lte)\b/,
         (match) => `$${match}`,
      );

      this.query = Tour.find(JSON.parse(queryString));
      return this;
   }

   //Sorting
   sort() {
      if (this.requestQuery.sort) {
         const sortBy = this.requestQuery.sort.split(',').join(' ');
         this.query = this.query.sort(sortBy);
      }
      return this;
   }

   // Fields Limiting
   fieldLimiting() {
      if (this.requestQuery.fields) {
         const fields = this.requestQuery.fields.split(',').join(' ');
         this.query = this.query.select(fields);
      }
      return this;
   }

   paginate() {
      const page = this.requestQuery.page * 1 || 1;
      const limit = this.requestQuery.limit * 1 || 17;
      const skip = (page - 1) * limit;

      this.query = this.query.skip(skip).limit(limit);
      return this;
   }
}

module.exports = ApiFeatures;
