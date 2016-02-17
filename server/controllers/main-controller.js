'use strict';

var User = require('../models/user');
var _ = require('lodash');
var plans = User.getPlans();

var getAccountWithPlans = function () {
  User.find({'account.plans.0': { $exists: true } }, 'account.plans', function(err, accounts) {
    if (err) console.log(err);
    //return accounts;
    _.forEach(accounts, function(account) {
      _.forEach(account.account.plans, function(newplan) {
        newplan['belongsToAccount'] = account.accountId;
        plans[newplan.id] = newplan;
      })
    })
    // console.log(plans);
    return plans;
  })
};

getAccountWithPlans();

exports.getHome = function(req, res, next){
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
  res.render(req.render, {form: form, error: error, plans: plans});
};
