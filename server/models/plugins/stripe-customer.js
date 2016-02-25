'use strict';

var Stripe = require('stripe'),
    stripe;
var _ = require('lodash');

var customerId;

// if you are behind a proxy, uncomment these lines
// var ProxyAgent = require('https-proxy-agent');

module.exports = exports = function stripeCustomer(schema, options) {
    stripe = Stripe(options.apiKey);

    // if you are behind a proxy, uncomment these lines
/*
    stripe.setHttpAgent(new ProxyAgent({
        //host: 'hybrid-web.global.blackspider.com',
        //port: 80,
        host: 'webproxy.amgen.com',
        port: 8080
    }));
    */


    schema.add({
        stripe: {
            platformCustomerId: String, // platform master account customer ID
            last4: String, // last four of current credit card
            default_source: String, // token for current default credit card
            subscriptions: Object, // track subscriptions
            connectedAccounts: {}, // track connected accounts, and connected customer Ids
            currentPlan: {}
        }
    });

    schema.pre('save', function (next) {
        var user = this;
        if (!user.isNew || user.stripe.platformCustomerId || user.account_type == 'merchant') return next();

        user.createCustomer(function (err) {
            if (err) return next(err);
            next();
        });
    });

    schema.statics.getPlans = function (cb) {
        var user = this;

        var plans = [];

        user.find({'account.plans.0': { $exists: true } }, 'account', {lean: true}, function(err, accounts) {
            if (err) cb(err);
            //return accounts;
            var plans = {};
            _.forEach(accounts, function(account) {
                plans[account.account.accountId] = {};
                _.forEach(account.account.plans, function(newplan, key) {
                    //console.log(newplan);
                    plans[account.account.accountId][newplan.id] = newplan;
                })
            })
            //console.log(plans);
            cb(err, plans);
        })

    };

    schema.methods.createCustomer = function (cb) {
        var user = this;

        stripe.customers.create({
            email: user.email
        }, function (err, customer) {
            if (err) return cb(err);
            user.stripe.platformCustomerId = customer.id;
            user.stripe.currentPlan = 'free';
            return cb();
        });
    };

    schema.methods.setCard = function (stripe_token, cb) {
        var user = this;

        // save stripe response with last 4 into database
        var cardHandler = function (err, customer) {
            if (err) return cb(err);

            if (!user.stripe.platformCustomerId) {
                user.stripe.platformCustomerId = customer.id;
            }

            var card = customer.cards ? customers.cards.data[0] : customer.sources.data[0];

            user.stripe.last4 = card.last4;
            user.stripe.default_source = customer.default_source;
            user.save(function (err) {
                if (err) return cb(err);
                return cb(null, customer.default_source);
            });
        };

        // update the credit card on stripe, or create the customer
        if (user.stripe.platformCustomerId) {
            stripe.customers.update(user.stripe.platformCustomerId, {card: stripe_token}, cardHandler);
        } else {
            stripe.customers.create({
                email: user.email,
                card: stripe_token
            }, cardHandler);
        }
    };

    schema.methods.setSubscriptionCard = function (stripe_token, accountId, cb) {
        var user = this;


        // save stripe response with last 4 into database
        var connectedCardHandler = function (err, customer) {
            if (err) return cb(err);

            // we need the the customer ID as stored on the connected account
            customerId = customer.id;

            if (accountId in user.stripe.connectedAccounts) {
                 user.stripe.connectedAccounts[accountId].customerId = customerId;
            }

            var card = customer.cards ? customers.cards.data[0] : customer.sources.data[0];
            // track that we have user billing info on platform account
            user.stripe.last4 = card.last4;
            // add connected customer to connected account
            user.stripe.connectedAccounts[accountId].card = card.last4;
            user.stripe.connectedAccounts[accountId].customer = customer;

            //user.save(function (err) {
                if (err) return cb(err);
                return cb(null, customer.id);
            //});
        };

        // check first if we have the connected merchant account
        if( !user.stripe._doc.stripe.hasOwnProperty('connectedAccounts')) {
                user.stripe.connectedAccounts = {};
                user.stripe.connectedAccounts[accountId] = {
                    customerId: null
                };
        } else if ( !user.stripe._doc.stripe.connectedAccounts.hasOwnProperty(accountId)) {
            user.stripe.connectedAccounts[accountId] = {
                customerId: null
            };
        }


        // do we already have a connected customer for this merchant accountID? If not, create them
        if(user.stripe.connectedAccounts[accountId].customerId) {
            try {
                return cb(null, user.stripe.connectedAccounts[accountId].customerId);
            } catch (err) {
                return cb(err);
            }
        } else {

            if (stripe_token) {


                // this is the first time a user has entered their card, and selected a plan
                // so we have the token available
                user.setCard(stripe_token, function (err, default_source) {
                    if (err) cb(err);
                    stripe.tokens.create(
                        {customer: user.stripe.platformCustomerId, card: default_source},
                        {stripe_account: accountId}, // id of the connected account
                        function (err, token) {
                            // callback
                            if (err) return cb(err);
                            stripe.customers.create({
                                    email: user.email,
                                    card: token.id
                                },
                                {stripe_account: accountId},
                                connectedCardHandler);
                        }
                    );
                })


            } else {

                // otherwise, we have a saved customer, but not a token for this session,
                // so get a token using the API
                stripe.tokens.create(
                    {customer: user.stripe.platformCustomerId, card: user.stripe.default_source},
                    {stripe_account: accountId}, // id of the connected account
                    function (err, token) {
                        // callback
                        if (err) return cb(err);
                        stripe.customers.create({
                                email: user.email,
                                card: token.id
                            },
                            {stripe_account: accountId},
                            connectedCardHandler);
                    }
                );
            }
        }
    };

    schema.methods.setPlan = function (plan, stripe_token, cb) {
        var user = this;
        var plan = JSON.parse(plan);

        // handle subscription response from stripe
        var subscriptionHandler = function (subscription) {

            var subscriptionId = subscription.id;

            if (!user.stripe.subscriptions) {
                user.stripe.subscriptions = {};
            }

            //var subscriptions = user.stripe.subscriptions;
            //
            //subscriptions[subscriptionId] = {
            //    planId: plan.id, // connected account plan ID
            //    accountId: plan.accountId, // connected account ID
            //    // name: name, // connected account plan name
            //    customerId: customerId, // this customers ID for the connected account
            //    subscription: subscription
            //};
            //
            //subscriptions['phil'] = {
            //    planId: plan.id, // connected account plan ID
            //    accountId: plan.accountId, // connected account ID
            //    // name: name, // connected account plan name
            //    customerId: customerId, // this customers ID for the connected account
            //    subscription: subscription
            //};

            user.stripe.currentPlan = plan.id;


            user.stripe.subscriptions[plan.accountId] = {
                currentPlan: plan.id, // connected account plan ID
                accountId: plan.accountId, // connected account ID
                // name: name, // connected account plan name
                customerId: customerId, // this customers ID for the connected account
                subscription: subscription
            };

            user.stripe.markModified('stripe.subscriptions');

            //user.stripe.subscriptions = subscriptions;

            user.save(function (err) {
                if (err) return cb(err);
                return cb(null);
            })
        };


        // create customer subscription with plan attached to connected customer and stripe_account id
        var createSubscription = function (err, customerId) {
            if (err) return cb(err);

            // create the subscription using connected account customer ID
            stripe.customers.createSubscription(
                customerId,
                {plan: plan.id},
                {stripe_account: plan.accountId},
                function (err, subscription) {
                    // asynchronously called
                    if (err) {
                        console.log(err);
                        console.log(subscription);
                        cb(err);
                    } else {
                        subscriptionHandler(subscription)
                    }

                });
        };

        user.setSubscriptionCard(stripe_token, plan.accountId, createSubscription);

    };

    schema.methods.updateStripeEmail = function (cb) {
        var user = this;

        if (!user.stripe.platformCustomerId) return cb();

        stripe.customers.update(user.stripe.platformCustomerId, {email: user.email}, function (err, customer) {
            cb(err);
        });
    };

    schema.methods.cancelStripe = function (cb) {
        var user = this;

        if (user.stripe.platformCustomerId) {
            stripe.customers.del(
                user.stripe.platformCustomerId
            ).then(function (confirmation) {
                cb();
            }, function (err) {
                return cb(err);
            });
        } else {
            cb();
        }
    };
};
