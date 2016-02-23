'use strict';

var User = require('../models/user');

exports.getDefault = function(req, res, next){
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

  User.getPlans(function(error, plans) {
    res.render(req.render, {user: req.user, form: form, error: error, plans: plans});
  });
};

exports.getBilling = function(req, res, next){
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

  User.getPlans(function(error, plans) {
    //var plans = {};
    //plans['free'] = {
    //  amount: 0,
    //  name: 'free plan',
    //  id: 'freeplan',
    //  accountId: null
    //};
      res.render(req.render, {user: req.user, form: form, error: error, plans: plans});
      });
};

exports.getAccount = function(req, res, next){
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

  User.getPlans(function(err, plans) {
    res.render(req.render, {user: req.user, form: form, error: error, plans: plans});
  });

};

exports.getProfile = function(req, res, next){
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

  User.getPlans(function(err, plans) {
    res.render(req.render, {user: req.user, form: form, error: error, plans: plans});
      });

};