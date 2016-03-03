module.exports = {

  db: process.env.MONGODB || process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost:27017/stripe-membership',

  sessionSecret: process.env.SESSION_SECRET || 'change this',

  mailgun: {
    user: process.env.MAILGUN_USER || '',           // your mailgun from address here
    password: process.env.MAILGUN_PASSWORD || '',   // mailgun password
    apiKey: process.env.MAILGUN_API_KEY || '',      // mailgun API key
    domain: process.env.MAILGUN_DOMAIN || ''        // mailgun sandbox/domain
  },

  stripeOptions: {
    apiKey: process.env.STRIPE_KEY || '',           // stripe test or prod key
    stripePubKey: process.env.STRIPE_PUB_KEY || '', // stripe test or pord public key
  },

  googleAnalytics: process.env.GOOGLE_ANALYTICS || ''
};
