'use strict';

var User = require('../models/user');
var _ = require('lodash');


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


      res.render(req.render, {user: req.user, form: form, error: error});




};
