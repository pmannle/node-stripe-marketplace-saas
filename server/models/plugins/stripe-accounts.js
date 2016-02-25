'use strict';

var Stripe = require('stripe'),
stripe;
var mongoose = require('mongoose');
var _ = require('lodash');


//var ProxyAgent = require('https-proxy-agent');

module.exports = exports = function stripeCustomer (schema, options) {
  stripe = Stripe(options.apiKey);

/*
  stripe.setHttpAgent(new ProxyAgent({
    //host: 'hybrid-web.global.blackspider.com',
    //port: 80,
    host: 'webproxy.amgen.com',
    port: 8080
  }));
  */


  var Plans = new mongoose.Schema({
    id : String,
    object : String,
    amount : Number,
    created : Number,
    currency : String,
    interval : String,
    interval_count : Number,
    livemode : Boolean,
    metadata : {},
    name : String,
    statement_descriptor : String,
    trial_period_days : String,
    accountId: String
  });

  schema.add({
    account: {
      accountId: String,
      keys: {
        secret: String,
        publishable: String
      },
      managed: Boolean,
      plans: [Plans]
    }
  });

  schema.pre('save', function (next) {
    var user = this;
    if(!user.isNew || user.account.accountId || user.account_type == 'customer') {
      return next();
    }

    console.log('Creating sub-merchant account')
    user.createAccount(function(err){
      if (err) return next(err);
      next();
    });
  });


  // created new connected account
  schema.methods.createAccount = function(cb) {
    var user = this;

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

  // create plan for connected account
  schema.methods.createPlan = function(plan, cb) {
    var user = this;

    // stripe user cents
    plan.amount = (parseFloat(plan.amount) * 100).toFixed(0);

    stripe.plans.create({
      amount: plan.amount,            // 2000,
      interval: plan.interval,        // "month",
      name: plan.name,                // "Amazing Gold Plan",
      currency: plan.currency,        // "usd",
      id: plan.id                     // "gold"
    },
    { stripe_account: user.account.accountId },

        function(err, plan){

      if (err) return cb(err);

      // add accountId to plan object so we can assign it later to customer subscriptions
      plan['accountId'] = user.account.accountId;
      user.account.plans.push(plan)

      user.save(function(err){
        if (err) return cb(err);
        return cb(null);
      });
    });
  };

  // delete plan for connected account
  schema.methods.deleteAccountPlan = function(plan, cb) {
    var user = this;

    var planId = plan.id;
    var accountId = plan.accountId;

    stripe.plans.del(planId,
        { stripe_account: user.account.accountId },

        function(err, confirmation){

          if(!confirmation) {
            // plan wasn't delted
            return cb('Account could not be deleted.');
          }

          if (err) return cb(err);

          var plans = user.account.plans;

          try {
          _.forEach(plans, function (plan, index) {
            if (plans[index].id == planId) {
              user.account.plans.pop(index)
            }
          })

        } catch (err) {
          return cb(err);
        }


          user.save(function(err){
            if (err) return cb(err);
            return cb(null);
          });
        });
  };

  schema.methods.setAccount = function(account, cb) {
    var user = this;

    var accountHandler = function(err, account) {
      if(err) return cb(err);

      user.account.id = account.accountId;
      user.save(function(err){
        if (err) return cb(err);
        return cb(null);
      });
    };

     accountHandler(account)

  };

  schema.statics.getAccountPlans = function (cb, user) {
    var user =user;

      //return accounts;
      var plans = {};
      plans[user.account.accountId] = {};
      _.forEach(user.account.plans, function(plan) {
        plans[user.account.accountId][plan.id] = plan;
      })
      //if (err) cb(err);
      cb(null, plans);

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
