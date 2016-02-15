'use strict';

var Stripe = require('stripe'),
stripe;


module.exports = exports = function stripeCustomer (schema, options) {
  stripe = Stripe(options.apiKey);



  schema.add({
    stripe: {
      customerId: String,
      subscriptionId: String,
      last4: String,
      plan: {
        type: String,
        default: options.defaultPlan
      }
    }
  });

  schema.pre('save', function (next) {
    var user = this;
    if(!user.isNew || user.stripe.customerId || user.account_type == 'merchant') return next();

    user.createCustomer(function(err){
      if (err) return next(err);
      next();
    });
  });

  schema.statics.getPlans = function () {
    //var user = this;
    //var plans;
    return options.planData;
    //////return Users.findWhere({ 'account.plans':  });
    //console.log('getting plans')
    ////user.find({'account.plans': { $exists: true } }), function(err, plans) {
    ////  if (err) console.log(err);
    ////  plans = plans;
    ////  console.log(plans);
    ////}
    //user.find({email: { $exists: true } }), function(err, plans) {
    //  if (err) console.log(err);
    //  plans = plans;
    //  console.log(plans);
    //}
    ////
    //console.log('got the plans');
    ////return plans;
  };

  schema.methods.createCustomer = function(cb) {
    var user = this;

    stripe.customers.create({
      email: user.email
    }, function(err, customer){
      if (err) return cb(err);
      user.stripe.customerId = customer.id;
      return cb();
    });
  };

  schema.methods.setCard = function(stripe_token, cb) {
    var user = this;

    var cardHandler = function(err, customer) {
      if (err) return cb(err);

      if(!user.stripe.customerId){
        user.stripe.customerId = customer.id;
      }

      var card = customer.cards ? customers.cards.data[0] : customer.sources.data[0];
      
      user.stripe.last4 = card.last4;
      user.save(function(err){
        if (err) return cb(err);
        return cb(null);
      });
    };

    if(user.stripe.customerId){
      stripe.customers.update(user.stripe.customerId, {card: stripe_token}, cardHandler);
    } else {
      stripe.customers.create({
        email: user.email,
        card: stripe_token
      }, cardHandler);
    }
  };

  schema.methods.setPlan = function(plan, stripe_token, cb) {
    var user = this,
    customerData = {
      plan: plan
    };

    // save new customer subscription with sub-merchant account id
    var subscriptionHandler = function(err, subscription) {
      if(err) return cb(err);

      user.stripe.plan = plan;
      user.stripe.subscriptionId = subscription.id;
      user.subMerchantId = subscription.subMerchantId;
      user.save(function(err){
        if (err) return cb(err);
        return cb(null);
      });
    };

    // create customer subscription on stripe attached to sub-merchant
    var createSubscription = function(){
      stripe.customers.createSubscription(
        user.stripe.customerId,
        {plan: plan},
        {stripe_account: user.subMerchantId},
        subscriptionHandler
      );
    };

    if(stripe_token) {
      user.setCard(stripe_token, function(err){
        if (err) return cb(err);
        createSubscription();
      });


    } else {
      if (user.stripe.subscriptionId){
        // update subscription
        stripe.customers.updateSubscription(
          user.stripe.customerId,
          user.stripe.subscriptionId,
          { plan: plan },
          subscriptionHandler
        );
      } else {
        createSubscription();
      }
    }
  };

  schema.methods.updateStripeEmail = function(cb){
    var user = this;

    if(!user.stripe.customerId) return cb();

    stripe.customers.update(user.stripe.customerId, {email: user.email}, function(err, customer) {
      cb(err);
    });
  };

  schema.methods.cancelStripe = function(cb){
    var user = this;

    if(user.stripe.customerId){
      stripe.customers.del(
        user.stripe.customerId
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
