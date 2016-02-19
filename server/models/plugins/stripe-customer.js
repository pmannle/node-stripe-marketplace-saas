'use strict';

var Stripe = require('stripe'),
    stripe;


var customerId;


// var ProxyAgent = require('https-proxy-agent');

module.exports = exports = function stripeCustomer(schema, options) {
    stripe = Stripe(options.apiKey);

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
            last4: String,
            subscriptions: {}, // track subscriptions
            connectedAccounts: {} // track connected accounts, and connected customer Ids
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

    schema.statics.getPlans = function () {
        return options.planData;
    };

    schema.methods.createCustomer = function (cb) {
        var user = this;

        stripe.customers.create({
            email: user.email
        }, function (err, customer) {
            if (err) return cb(err);
            user.stripe.platformCustomerId = customer.id;
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
            user.save(function (err) {
                if (err) return cb(err);
                return cb(null);
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

        console.log('3) setting the subscription charge token ' + stripe_token + ' or creating connected customer ')

        // save stripe response with last 4 into database
        var cardHandler = function (err, customer) {
            if (err) return cb(err);

            // we need the the customer ID as stored on the connected account
            customerId = customer.id;

            //if (user.stripe.connectedAccounts[accountId]) {
            if (accountId in user.stripe.connectedAccounts) {
                 user.stripe.connectedAccounts[accountId].customerId = customerId;
            }

            var card = customer.cards ? customers.cards.data[0] : customer.sources.data[0];
            // track that we have user billing info on platform account
            user.stripe.last4 = card.last4;
            // add connected customer to connected account
            user.stripe.connectedAccounts[accountId].card = card.last4;
            user.stripe.connectedAccounts[accountId].customer = customer;



            user.save(function (err) {
                if (err) return cb(err);
                return cb(null, customer.id);
            });
        };

        // update the credit card on stripe, or create the customer on the connected account

        // update the credit card on stripe, or create the customer on the connected account

        if( !user.stripe._doc.stripe.hasOwnProperty('connectedAccounts')) {
            user.stripe.connectedAccounts = {};
            user.stripe.connectedAccounts[accountId] = {
                customerId: null
            };
        }

        if(user.stripe.connectedAccounts[accountId].customerId) {
            console.log('4) we have a (connected?) customer, so proceed to subscription')
            //
            //// do we have an updated token? if not, use the credit card on file
            //stripe_token = stripe_token ? stripe_token : user.stripe.connectedAccounts[accountId].customer.default_source;
            //
            //stripe.customers.update(
            //    user.stripe.connectedAccounts[accountId].customerId,
            //    {card: stripe_token},
            //    {stripe_account: accountId},
            //    cardHandler);

            try {
                return cb(null, user.stripe.connectedAccounts[accountId].customerId);
            } catch (err) {
                return cb(err);
            }
        } else {
            console.log('4) we dont have a customer, so create a connected customer with account: ' + accountId)
            stripe.customers.create({
                    email: user.email,
                    card: stripe_token
                },
                {stripe_account: accountId},
                cardHandler);
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

            user.stripe.subscriptions[subscriptionId] = {
                planId: plan.id, // connected account plan ID
                accountId: plan.accountId, // connected account ID
                // name: name, // connected account plan name
                customerId: customerId, // this customers ID for the connected account
                subscription: subscription
            };

            user.save(function (err) {
                if (err) return cb(err);
                return cb(null);
            })
        };


        // create customer subscription with plan attached to connected customer and stripe_account id
        var createSubscription = function (err, customerId) {
            if (err) return cb(err);

            console.log('5) creating the subscription with connected customer')

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

        console.log('1) calling to stripe to create a token:  ' + stripe_token);

        user.setSubscriptionCard(stripe_token, plan.accountId, createSubscription);

        //stripe.tokens.create(
        //    {customer: user.stripe.platformCustomerId, card: user.stripe.last4},
        //    {stripe_account: plan.accountId}, // id of the connected account
        //    function (err, token) {
        //        console.log('2) got the token (' + token + '), use accountID (' + plan.accountId + ') to set the subscription charge card')
        //
        //    });
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
