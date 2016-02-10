'use strict';

var Stripe = require('stripe'),
stripe;

module.exports = exports = function stripeAccount (schema, options) {
  stripe = Stripe(options.apiKey);

  schema.add({
    account: {
      accountId: String,
      keys: {
        secret: String,
        publishable: String
      },
      managed: Boolean
    }
  });

  schema.pre('save', function (next) {
    var user = this;
    if(!user.isNew || user.account.accountId) {
      console.log('User account already exists')
      return next();
    }

    user.createAccount(function(err){
      if (err) return next(err);
      next();
    });
  });


  schema.methods.createAccount = function(cb) {
    var user = this;

    console.log('creating new stripe account')

    stripe.accounts.create({
      country: "US",
      managed: true,
      email: user.email
    }, function(err, customer){
      if (err) return cb(err);

      user.account.accountId = customer.id;
      user.account.keys.secret = customer.keys.secret;
      user.account.keys.publishable = customer.keys.publishable;
      return cb();
    });
  };


  schema.methods.setAccount = function(account, cb) {
    var user = this// ,
    //customerData = {
    //  plan: plan
    //};

    console.log('account: ', account)

    var accountHandler = function(err, account) {
      if(err) return cb(err);

      user.account.id = account.id;
      user.save(function(err){
        if (err) return cb(err);
        return cb(null);
      });
    };

     accountHandler(account)

  };

  schema.methods.updateStripeEmail = function(cb){
    var user = this;

    if(!user.stripe.accountId) return cb();

    stripe.accounts.update(user.stripe.accountId, {email: user.email}, function(err, customer) {
      cb(err);
    });
  };

  schema.methods.cancelStripe = function(cb){
    var user = this;

    if(user.stripe.accountId){
      stripe.accounts.del(
        user.stripe.accountId
      ).then(function(confirmation) {
        cb();
      }, function(err) {
        return cb(err);
      });
    } else {
      cb();
    }
  };
};
