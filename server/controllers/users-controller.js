'use strict';

var User = require('../models/user');

// show user page

exports.getProfile = function (req, res, next) {
    var form = {},
        error = null,
        formFlash = req.flash('form'),
        errorFlash = req.flash('error');

    if (formFlash.length) {
        form.email = formFlash[0].email;
    }
    if (errorFlash.length) {
        error = errorFlash[0];
    }
    res.render(req.render, {user: req.user, form: form, error: error});
};

// Updates generic profile information

exports.postProfile = function (req, res, next) {
    req.assert('email', 'Email is not valid').isEmail();
    req.assert('name', 'Name is required').notEmpty();

    var errors = req.validationErrors();

    if (errors) {
        req.flash('errors', errors);
        return res.redirect(req.redirect.failure);
    }

    if (req.body.email != req.user.email) {
        User.findOne({email: req.body.email}, function (err, existingUser) {
            if (existingUser) {
                req.flash('errors', {msg: 'An account with that email address already exists.'});
                return res.redirect(req.redirect.failure);
            } else {
                User.findById(req.user.id, function (err, user) {
                    if (err) return next(err);
                    user.email = req.body.email || '';
                    user.profile.name = req.body.name || '';
                    user.profile.gender = req.body.gender || '';
                    user.profile.location = req.body.location || '';
                    user.profile.website = req.body.website || '';

                    user.save(function (err) {
                        if (err) return next(err);
                        user.updateStripeEmail(function (err) {
                            if (err) return next(err);
                            req.flash('success', {msg: 'Profile information updated.'});
                            res.redirect(req.redirect.success);
                        });
                    });
                });
            }
        });
    } else {
        User.findById(req.user.id, function (err, user) {
            if (err) return next(err);
            user.profile.name = req.body.name || '';
            user.profile.gender = req.body.gender || '';
            user.profile.location = req.body.location || '';
            user.profile.website = req.body.website || '';

            user.save(function (err) {
                if (err) return next(err);
                user.updateStripeEmail(function (err) {
                    if (err) return next(err);
                    req.flash('success', {msg: 'Profile information updated.'});
                    res.redirect(req.redirect.success);
                });
            });
        });
    }
};

// Removes account

exports.deleteAccount = function (req, res, next) {
    User.findById(req.user.id, function (err, user) {
        if (err) return next(err);

        user.remove(function (err, user) {
            if (err) return next(err);
            user.cancelStripe(function (err) {
                if (err) return next(err);

                req.logout();
                req.flash('info', {msg: 'Your account has been deleted.'});
                res.redirect(req.redirect.success);
            });
        });
    });
};

// Adds or updates a users card.

exports.postBilling = function (req, res, next) {
    var stripeToken = req.body.stripeToken;

    if (!stripeToken) {
        req.flash('errors', {msg: 'Please provide a valid card.'});
        return res.redirect(req.redirect.failure);
    }

    User.findById(req.user.id, function (err, user) {
        if (err) return next(err);

        user.setCard(stripeToken, function (err) {
            if (err) {
                if (err.code && err.code == 'card_declined') {
                    req.flash('errors', {msg: 'Your card was declined. Please provide a valid card.'});
                    return res.redirect(req.redirect.failure);
                }
                req.flash('errors', {msg: 'An unexpected error occurred.'});
                return res.redirect(req.redirect.failure);
            }
            req.flash('success', {msg: 'Billing has been updated.'});
            res.redirect(req.redirect.success);
        });
    });
};

exports.postPlan = function (req, res, next) {
    var plan = req.body.plan;
    var stripeToken = null;

    if (plan) {
        plan = plan.toLowerCase();
    }

    if (req.user.stripe.plan == plan) {
        req.flash('info', {msg: 'The selected plan is the same as the current plan.'});
        return res.redirect(req.redirect.success);
    }

    if (req.body.stripeToken) {
        stripeToken = req.body.stripeToken;
    }

    if (!req.user.stripe.last4 && !req.body.stripeToken) {
        req.flash('errors', {msg: 'Please add a card to your account before choosing a plan.'});
        return res.redirect(req.redirect.failure);
    }

    User.findById(req.user.id, function (err, user) {
        if (err) return next(err);

        user.setPlan(plan, stripeToken, function (err) {
            var msg;

            if (err) {
                if (err.code && err.code == 'card_declined') {
                    msg = 'Your card was declined. Please provide a valid card.';
                } else if (err && err.message) {
                    msg = err.message;
                } else {
                    msg = 'An unexpected error occurred.';
                }

                req.flash('errors', {msg: msg});
                return res.redirect(req.redirect.failure);
            }
            req.flash('success', {msg: 'Plan has been updated.'});
            res.redirect(req.redirect.success);
        });
    });
};

exports.postAccount = function (req, res, next) {
    //var account = req.body.plan;

    var account = {
        country: "US",
        managed: true
    };

    var stripeToken = null;

    User.findById(req.user.id, function (err, user) {
        if (err) return next(err);

        user.setAccount(account, function (err) {
            var msg;

            if (err) {

                req.flash('errors', {msg: JSON.stringify(err)});
                return res.redirect(req.redirect.failure);
            }
            req.flash('success', {msg: 'Your account has been created.'});
            res.redirect(req.redirect.success);
        });
    });
};

exports.getAccountPlans = function () {
    //var user = this,
    var plans;
    // return options.planData;
    //return Users.findWhere({ 'account.plans':  });
    //console.log(user)
    User.find({'account.plans.0': { $exists: true } }), function(err, plans) {
        if (err) console.log(err);
        plans = plans;
    }

    console.log(plans);
    return plans;
};

exports.postAccountPlan = function (req, res, next) {

    console.log('Posting new account plan')

    if (req.body.plan_name && req.body.plan_amount) {

        console.log('creating plan: ' + req.body.plan_name)
        var id = req.body.plan_name.toLowerCase();

        var plan = {
            amount: req.body.plan_amount,            // plan.amount,            // 2000,
            interval: "month",          // plan.interval,        // "month",
            name: req.body.plan_name,  // plan.name,                // "Amazing Gold Plan",
            currency: "usd",            //plan.currency,        // "usd",
            id: id                  //plan.id                     // "gold"
        }

        User.findById(req.user.id, function (err, user) {
            if (err) return next(err);

            user.createPlan(plan, function (err) {
                var msg;

                if (err) {
                    req.flash('errors', {msg: JSON.stringify(err)});
                    console.log('redirecting from user-controller create plan error')
                    return res.redirect(req.redirect.failure);
                    //next(err);
                }

                req.flash('success', {msg: 'You plane has been created.'});
                res.redirect(req.redirect.success);
            });
        });

    } else {
        req.flash('errors', {msg: 'You must fill out the plan details'});
        return res.redirect(req.redirect.failure);

    }


};