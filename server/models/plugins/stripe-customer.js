'use strict';

var Stripe = require('stripe'),
    stripe;


module.exports = exports = function stripeCustomer(schema, options) {
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
        if (!user.isNew || user.stripe.customerId || user.account_type == 'merchant') return next();

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
            user.stripe.customerId = customer.id;
            return cb();
        });
    };

    schema.methods.setCard = function (stripe_token, cb) {
        var user = this;

        // save stripe response with last 4 into database
        var cardHandler = function (err, customer) {
            if (err) return cb(err);

            if (!user.stripe.customerId) {
                user.stripe.customerId = customer.id;
            }

            var card = customer.cards ? customers.cards.data[0] : customer.sources.data[0];

            user.stripe.last4 = card.last4;
            user.save(function (err) {
                if (err) return cb(err);
                return cb(null);
            });
        };

        // update the credit card on stripe, or create the customer
        if (user.stripe.customerId) {
            stripe.customers.update(user.stripe.customerId, {card: stripe_token}, cardHandler);
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
            if (!user.stripe.customerId) {
                user.stripe.customerId = customer.id;
            }
            var card = customer.cards ? customers.cards.data[0] : customer.sources.data[0];
            user.stripe.last4 = card.last4;
            user.save(function (err) {
                if (err) return cb(err);
                return cb(null);
            });
        };

        // update the credit card on stripe, or create the customer on the connected account
        //if (!user.stripe.customerId) {
        //    console.log('4) we have a (connected?) customer, so store the token')
        //    stripe.customers.update(user.stripe.customerId,
        //        {card: stripe_token},
        //        {stripe_account: accountId},
        //        cardHandler);
        //} else {
            console.log('4) we dont have a customer, so create a connected customer with account: ' + accountId)
            stripe.customers.create({
                    email: user.email,
                    card: stripe_token
                },
                {stripe_account: accountId},
                cardHandler);
        //}
    };

    schema.methods.setPlan = function (plan, stripe_token, cb) {
        var user = this;
        var plan = JSON.parse(plan);



        // handle subscription response from stripe
        var subscriptionHandler = function (err, subscription) {
            if (err) return cb(err);

            console.log('6) subscription created, recieving stripe response')

            user.stripe.plan = plan;
            user.stripe.subscriptionId = subscription.id;
            user.save(function (err) {
                if (err) return cb(err);
                return cb(null);
            });
        };

        // create customer subscription with plan attached to connected customer and stripe_account id
        var createSubscription = function () {

            console.log('5) creating the subscription with connected customer')

            stripe.customers.createSubscription(
                user.stripe.customerId,
                {plan: plan.id},
                {stripe_account: plan.accountId},
                function (err, subscription) {
                    // asynchronously called
                    if (err) {
                        console.log(err);
                        console.log(subscription);
                        cb(err);
                    } else {
                        subscriptionHandler()
                    }

                });
        };

        console.log('1) calling to stripe to create a token:  ' + stripe_token);

        user.setSubscriptionCard(stripe_token, plan.accountId, createSubscription)

        //stripe.tokens.create(
        //    {customer: user.stripe.customerId, card: user.stripe.last4},
        //    {stripe_account: plan.accountId}, // id of the connected account
        //    function (err, token) {
        //        console.log('2) got the token (' + token + '), use accountID (' + plan.accountId + ') to set the subscription charge card')
        //
        //    });
    };

    schema.methods.updateStripeEmail = function (cb) {
        var user = this;

        if (!user.stripe.customerId) return cb();

        stripe.customers.update(user.stripe.customerId, {email: user.email}, function (err, customer) {
            cb(err);
        });
    };

    schema.methods.cancelStripe = function (cb) {
        var user = this;

        if (user.stripe.customerId) {
            stripe.customers.del(
                user.stripe.customerId
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
