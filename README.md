# Node Stripe Membership SaaS with Connected Marketplace

This project is a boilerplate express app for creating a membership/subscription Marketplace  with [Stripe](https://stripe.com), [Mailgun](https://mailgun.com/signup), mongodb and swig. Inspired by [sahat/hackathon-starter](https://github.com/sahat/hackathon-starter) and [RailsApps/rails-stripe-membership-saas](https://github.com/RailsApps/rails-stripe-membership-saas). It also handles stripe webhooks.

It is a frontend for a Stripe Connected Marketplace, and allows you to:

- create new merchant accounts
- allows merchants to create their own subscription plans
- create new customer accounts
- allows customers to subscribe to merchant plans
- allows customers to update subscriptions

Check out the [demo](https://node-stripe-marketplace-app.herokuapp.com/)!

<a href="https://node-stripe-membership-saas.herokuapp.com/dashboard">
    <img src="https://a16545fb495c8760fb33-4cec33efbe2744e99ba863e52edb2075.ssl.cf2.rackcdn.com/stripe-membership-app-screenshot.png">
</a>

### System Requirements

- mongodb
- nodejs

### Getting Started

First update `/server/config/secrets.js` with the following credentials:

- Stripe [API keys](https://dashboard.stripe.com/account/apikeys) and [plan info](https://dashboard.stripe.com/test/plans)
- [Mailgun](https://mailgun.com/signup) for sending forgot/reset password confirmations.
- session secret
- google analytics id

Install dependencies with `npm install`.

Start the server with `node server`.

Note: Stripe webhooks can be recieved at `https://your-url.com/stripe/events`.

### Heroku Deployment

```
heroku create your-stripe-marketplace
heroku addons:create mongolab
heroku config:set SESSION_SECRET='your_secret';
heroku config:set STRIPE_KEY='sk_test_example'
heroku config:set STRIPE_PUB_KEY='pk_test_example'
heroku config:set MAILGUN_USER='example.org'
heroku config:set MAILGUN_PASSWORD='key-secret'
heroku config:set MAILGUN_API_KEY='your-key'
heroku config:set MAILGUN_DOMAIN='your_sandbox_domain'
heroku config:set GOOGLE_ANALYTICS='UA-XXXXXX-1'
```

Then, push your code to heroku:
```
git push heroku master
```
