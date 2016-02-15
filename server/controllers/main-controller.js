'use strict';

var User = require('../models/user');
var plans = User.getPlans();

var getAccountWithPlans = function () {
  User.find({'account.plans.0': { $exists: true } }, function(err, plans) {
    if (err) console.log(err);
    console.log(plans);
    return plans;
  })
};

var accountsWithPlans = getAccountWithPlans();


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
