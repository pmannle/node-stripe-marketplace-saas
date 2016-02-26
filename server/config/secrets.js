module.exports = {

  db: process.env.MONGODB || process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost:27017/stripe-membership',

  sessionSecret: process.env.SESSION_SECRET || 'change this',

  mailgun: {
    user: process.env.MAILGUN_USER || 'postmaster@sandbox7fb3dd8753e446728824566da833f16a.mailgun.org',
    password: process.env.MAILGUN_PASSWORD || 'password',
    apiKey: process.env.MAILGUN_API_KEY || 'key-06b5e5245f74052fdae305818b3fb686',
    domain: process.env.MAILGUN_DOMAIN || 'sandbox7fb3dd8753e446728824566da833f16a.mailgun.org'
  },

  stripeOptions: {
    apiKey: process.env.STRIPE_KEY || 'sk_test_gPV7zXKrLSIVOKXJxZIBk0Wj',
    stripePubKey: process.env.STRIPE_PUB_KEY || 'pk_test_TtP0GremyqcCDrfW0739NJM8',
    defaultPlan: 'free',
    plans: ['free'],
    planData:
    {
      'free': {
        name: 'Free',
        amount: 0
      }
    }
  },

  googleAnalytics: process.env.GOOGLE_ANALYTICS || ''
};
