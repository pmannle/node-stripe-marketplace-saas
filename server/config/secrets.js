module.exports = {

  db: process.env.MONGODB || process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost:27017/stripe-membership',

  sessionSecret: process.env.SESSION_SECRET || 'change this',

  mailgun: {
    user: process.env.MAILGUN_USER || '',
    password: process.env.MAILGUN_PASSWORD || ''
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
