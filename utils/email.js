const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
   host: process.env.MAILTRAP_HOST,
   port: Number(process.env.MAILTRAP_PORT),
   auth: {
      user: process.env.MAILTRAP_USERNAME,
      pass: process.env.MAILTRAP_PASSWORD,
   },
});

module.exports = async ({ email, subject, message }) => {
   await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject,
      text: message,
   });
};
