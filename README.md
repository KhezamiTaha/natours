# Natours API

[![Node.js](https://img.shields.io/badge/Node.js-14%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)](https://mongoosejs.com/)
[![License](https://img.shields.io/badge/license-ISC-blue)](https://opensource.org/license/isc-license-txt/)
[![GitHub](https://img.shields.io/badge/GitHub-KhezamiTaha%2Fnatours-181717?logo=github&logoColor=white)](https://github.com/KhezamiTaha/natours)

A Node.js and Express.js tour application backed by MongoDB and Mongoose. The project includes a REST API for tours, reusable query features, static tour pages, and development seed data.

## Features

- Tour CRUD endpoints
- Filtering, sorting, field limiting, and pagination
- Trending tours endpoint
- Tour statistics by difficulty
- Monthly tour planning statistics
- Mongoose schema validation and document/query middleware
- Static tour pages served from `public/`
- Development data and templates in `dev-data/`

## Tech Stack

- Node.js
- Express 4
- MongoDB with Mongoose 5
- Morgan request logging
- Dotenv environment configuration
- Pug templates and static HTML/CSS assets

## Requirements

- Node.js 14 or newer
- npm
- A MongoDB database, such as MongoDB Atlas

## Getting Started

1. Clone the repository:

   ```bash
   git clone https://github.com/KhezamiTaha/natours.git
   cd natours
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a local `config.env` file. Do not commit this file:

   ```env
   PASSWORD=your_database_password
   USERNAME_APP=your_app_username
   PORT=7000
   MONGODB_USERNAME=your_mongodb_username
   MONGODB_PASSWORD=your_mongodb_password
   MONGODB_URI="mongodb+srv://your_mongodb_username:Password@your-cluster.mongodb.net/natours?retryWrites=true"
   NODE_ENV=dev
   ```

   `server.js` replaces `Password` in `MONGODB_URI` with `MONGODB_PASSWORD` at startup.

4. Start the development server:

   ```bash
   npm start
   ```

   The server listens on `http://localhost:7000`.

## Available Pages

- Overview: http://localhost:7000/overview.html
- Tour page: http://localhost:7000/tour.html

## API Reference

The API base URL is `/api/v1`.

### Tours

| Method  | Endpoint                    | Description                                |
| ------- | --------------------------- | ------------------------------------------ |
| `GET`   | `/tours`                    | List tours                                 |
| `POST`  | `/tours`                    | Create a tour                              |
| `GET`   | `/tours/:id`                | Get one tour                               |
| `PATCH` | `/tours/:id`                | Update a tour                              |
| `GET`   | `/tours/trending-tours`     | List five tours sorted by rating and price |
| `GET`   | `/tours/tours-statistics`   | Get statistics grouped by difficulty       |
| `GET`   | `/tours/plan-monthly/:year` | Get monthly tour statistics for a year     |

Example request:

```bash
curl "http://localhost:7000/api/v1/tours?difficulty=easy&sort=-price&limit=5&page=1"
```

Tour list queries support:

- Filtering, for example `?difficulty=easy&price[gte]=300`
- Sorting, for example `?sort=-ratingsAverage,price`
- Field limiting, for example `?fields=name,price,difficulty`
- Pagination, for example `?page=2&limit=10`

### Users

User routes are currently scaffolds and return a not-implemented response:

- `GET /api/v1/users`
- `POST /api/v1/users`
- `GET /api/v1/users/:id`
- `PATCH /api/v1/users/:id`
- `DELETE /api/v1/users/:id`

## Project Structure

```text
controllers/   Request handlers
dev-data/      Seed data, images, and development templates
models/        Mongoose schemas and models
public/        Static HTML, CSS, and image assets
routes/        Express route definitions
utils/         Reusable API query utilities
app.js         Express application configuration
server.js      Environment loading, MongoDB connection, and server startup
```

## Development Notes

- `npm start` runs `nodemon server.js`.
- `npm run debug` runs the project through `ndb` when `ndb` is installed globally.
- `config.env` and `node_modules/` are ignored by Git.
- Never publish database credentials or other secrets. Rotate any credentials that have previously been exposed.

## License

This project is licensed under the ISC license.
