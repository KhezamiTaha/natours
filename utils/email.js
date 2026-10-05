const nodemailer = require('nodemailer');
const path = require('path');
const pug = require('pug');
const { Resend } = require('resend');

const emailTemplates = {
   welcome: 'welcome.pug',
   passwordReset: 'passwordReset.pug',
};

const getProviderConfig = (env = process.env) => {
   const isProduction = env.NODE_ENV === 'production';
   const providerOverride = env.EMAIL_PROVIDER?.toLowerCase();

   if (
      !isProduction &&
      providerOverride &&
      !['mailtrap', 'resend'].includes(providerOverride)
   ) {
      throw new Error(
         'EMAIL_PROVIDER must be either mailtrap or resend.',
      );
   }

   if (isProduction || providerOverride === 'resend') {
      if (!env.RESEND_API_KEY) {
         throw new Error(
            'RESEND_API_KEY must be configured to use Resend.',
         );
      }
      const from = isProduction
         ? env.EMAIL_FROM
         : env.RESEND_FROM || 'onboarding@resend.dev';
      if (!from) {
         throw new Error(
            'EMAIL_FROM must be configured in production.',
         );
      }

      return {
         provider: 'resend',
         apiKey: env.RESEND_API_KEY,
         from,
      };
   }

   if (!env.EMAIL_FROM) {
      throw new Error('EMAIL_FROM must be configured to send email.');
   }

   const port = Number(env.MAILTRAP_PORT);
   if (
      !env.MAILTRAP_HOST ||
      !Number.isInteger(port) ||
      port < 1 ||
      !env.MAILTRAP_USERNAME ||
      !env.MAILTRAP_PASSWORD
   ) {
      throw new Error(
         'Mailtrap SMTP settings must be configured outside production.',
      );
   }

   return {
      provider: 'smtp',
      transportOptions: {
         host: env.MAILTRAP_HOST,
         port,
         secure: port === 465,
         auth: {
            user: env.MAILTRAP_USERNAME,
            pass: env.MAILTRAP_PASSWORD,
         },
      },
   };
};

const buildEmailMessage = ({
   from,
   email,
   subject,
   template,
   templateData = {},
   text,
}) => {
   const templateFile = emailTemplates[template];
   if (!templateFile) throw new Error('Unsupported email template.');
   if (!from || !email || !subject || !text) {
      throw new Error(
         'Email sender, recipient, subject, and text are required.',
      );
   }

   return {
      from,
      to: email,
      subject,
      text,
      html: pug.renderFile(
         path.join(__dirname, '../views/emails', templateFile),
         { subject, ...templateData },
      ),
   };
};

const sendWithResend = async (client, message) => {
   const { data, error } = await client.emails.send(message);
   if (error) {
      const deliveryError = new Error(
         'Resend email delivery failed.',
      );
      deliveryError.code = 'RESEND_SEND_FAILED';
      deliveryError.providerCode =
         error.name || error.code || 'UNKNOWN';
      deliveryError.statusCode = error.statusCode;
      throw deliveryError;
   }
   return data;
};

const sendEmail = async (options) => {
   const provider = getProviderConfig(process.env);
   const message = buildEmailMessage({
      ...options,
      from: provider.from || process.env.EMAIL_FROM,
   });

   if (provider.provider === 'resend') {
      return sendWithResend(new Resend(provider.apiKey), message);
   }

   const transporter = nodemailer.createTransport(
      provider.transportOptions,
   );
   return transporter.sendMail(message);
};

module.exports = sendEmail;
module.exports.getProviderConfig = getProviderConfig;
module.exports.buildEmailMessage = buildEmailMessage;
module.exports.sendWithResend = sendWithResend;
