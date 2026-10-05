const assert = require('node:assert/strict');
const test = require('node:test');
const nodemailer = require('nodemailer');
const sendEmail = require('../utils/email');

test('uses Mailtrap SMTP outside production', () => {
   const config = sendEmail.getProviderConfig({
      NODE_ENV: 'development',
      EMAIL_FROM: 'mail@example.com',
      MAILTRAP_HOST: 'sandbox.smtp.mailtrap.io',
      MAILTRAP_PORT: '2525',
      MAILTRAP_USERNAME: 'mailtrap-user',
      MAILTRAP_PASSWORD: 'mailtrap-password',
      RESEND_API_KEY: 'resend-test-key',
   });

   assert.equal(config.provider, 'smtp');
   assert.equal(
      config.transportOptions.host,
      'sandbox.smtp.mailtrap.io',
   );
   assert.equal(config.transportOptions.port, 2525);
   assert.equal(config.transportOptions.auth.user, 'mailtrap-user');
});

test('uses Resend API in production', () => {
   const config = sendEmail.getProviderConfig({
      NODE_ENV: 'production',
      EMAIL_FROM: 'mail@example.com',
      RESEND_API_KEY: 'resend-test-key',
   });

   assert.equal(config.provider, 'resend');
   assert.equal(config.apiKey, 'resend-test-key');
   assert.equal(config.from, 'mail@example.com');
});

test('uses the Resend onboarding sender when selected in development', () => {
   const config = sendEmail.getProviderConfig({
      NODE_ENV: 'development',
      EMAIL_PROVIDER: 'resend',
      RESEND_API_KEY: 'resend-test-key',
   });

   assert.equal(config.provider, 'resend');
   assert.equal(config.from, 'onboarding@resend.dev');
});

test('returns a successful Resend response', async () => {
   const response = { id: 'email-id' };
   const client = {
      emails: {
         send: async () => ({ data: response, error: null }),
      },
   };

   assert.equal(await sendEmail.sendWithResend(client, {}), response);
});

test('converts Resend API errors into delivery failures', async () => {
   const client = {
      emails: {
         send: async () => ({
            data: null,
            error: {
               name: 'validation_error',
               statusCode: 403,
               message: 'Sender domain is not verified.',
            },
         }),
      },
   };

   await assert.rejects(
      sendEmail.sendWithResend(client, {}),
      (error) =>
         error.code === 'RESEND_SEND_FAILED' &&
         error.providerCode === 'validation_error' &&
         error.statusCode === 403,
   );
});

test('renders branded welcome and reset email messages', () => {
   const welcome = sendEmail.buildEmailMessage({
      from: 'CarthageWay <mail@example.com>',
      email: 'guest@example.com',
      subject: 'Welcome to CarthageWay',
      template: 'welcome',
      templateData: {
         name: 'Mariam',
         homeUrl: 'https://carthageway.example',
         preheader: 'Your account is ready.',
         loginUrl: 'https://carthageway.example/login',
      },
      text: 'Welcome, Mariam. Sign in: https://carthageway.example/login',
   });
   const reset = sendEmail.buildEmailMessage({
      from: 'CarthageWay <mail@example.com>',
      email: 'guest@example.com',
      subject: 'Reset your CarthageWay password',
      template: 'passwordReset',
      templateData: {
         name: 'Mariam',
         homeUrl: 'https://carthageway.example',
         preheader: 'Password reset requested.',
         resetUrl: 'https://carthageway.example/reset-password/token',
      },
      text: 'Reset your password: https://carthageway.example/reset-password/token',
   });

   assert.match(welcome.html, /Welcome, Mariam/);
   assert.match(
      welcome.html,
      /https:\/\/carthageway\.example\/login/,
   );
   assert.match(welcome.text, /Welcome, Mariam/);
   assert.match(reset.html, /expires in 10 minutes/);
   assert.match(reset.html, /reset-password\/token/);
   assert.match(reset.text, /reset-password\/token/);
});

test('propagates provider delivery errors to the caller', async () => {
   const originalCreateTransport = nodemailer.createTransport;
   const originalEnv = {
      NODE_ENV: process.env.NODE_ENV,
      EMAIL_FROM: process.env.EMAIL_FROM,
      MAILTRAP_HOST: process.env.MAILTRAP_HOST,
      MAILTRAP_PORT: process.env.MAILTRAP_PORT,
      MAILTRAP_USERNAME: process.env.MAILTRAP_USERNAME,
      MAILTRAP_PASSWORD: process.env.MAILTRAP_PASSWORD,
   };
   const deliveryError = new Error('SMTP unavailable');

   Object.assign(process.env, {
      NODE_ENV: 'development',
      EMAIL_FROM: 'mail@example.com',
      MAILTRAP_HOST: 'sandbox.smtp.mailtrap.io',
      MAILTRAP_PORT: '2525',
      MAILTRAP_USERNAME: 'mailtrap-user',
      MAILTRAP_PASSWORD: 'mailtrap-password',
   });
   nodemailer.createTransport = () => ({
      sendMail: async () => {
         throw deliveryError;
      },
   });

   try {
      await assert.rejects(
         sendEmail({
            email: 'guest@example.com',
            subject: 'Welcome',
            template: 'welcome',
            templateData: {
               name: 'Mariam',
               homeUrl: 'https://carthageway.example',
               preheader: 'Your account is ready.',
               loginUrl: 'https://carthageway.example/login',
            },
            text: 'Welcome, Mariam.',
         }),
         deliveryError,
      );
   } finally {
      nodemailer.createTransport = originalCreateTransport;
      Object.entries(originalEnv).forEach(([key, value]) => {
         if (value === undefined) delete process.env[key];
         else process.env[key] = value;
      });
   }
});
