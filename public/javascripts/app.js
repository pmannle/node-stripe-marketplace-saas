jQuery(function($) {

  var cardWrapper = $('#cardWrapper'),
  cardForm = $('#cardForm'),
  formError = $('#cardFormError'),
  cardFormBtn = cardForm.find('button'),
  cardFormAccountId = cardForm.find("input[name='accountId']");

  // hide different merchant forms until user selects one
  $('[data-merchant]').hide();

  $('#account-selector').change(function (e) {
    e.preventDefault();
    var selectedAccount = '[data-' + this.value + ']';
    $('[data-merchant]').hide();
    $(selectedAccount).show();
  })


  if(cardWrapper.length > 0){
    $("input[name=plan]:radio").change(function (e) {
      var selectedPlan = JSON.parse(this.value);
      if(selectedPlan.id == 'freeplan'){
        cardWrapper.hide();
      } else {
        cardWrapper.show();
        var selectedPlan = this.value;
        cardFormAccountId.val(function() {
          var planAccount = JSON.parse(selectedPlan);
          return planAccount.accountId;
        });
      }
    });
    var checkedPlan = $("input:radio[name=plan]:checked").val();
    var selectedPlan = JSON.parse(checkedPlan);
    if(selectedPlan.id != 'freeplan') {
      cardWrapper.hide();
    }
  }

  cardForm.submit(function(e) {
    e.preventDefault();

    var cardNum,
    cardMonth,
    cardYear,
    cardCVC;

    var checkedPlan = $("input:radio[name=plan]:checked").val();
    var selectedPlan = JSON.parse(checkedPlan);
    if(selectedPlan.id != 'freeplan'){
      cardFormBtn.prop('disabled', true);

      cardNum = $('#card-num').val();
      cardMonth = $('#card-month').val();
      cardYear = $('#card-year').val();
      cardCVC = $('#card-cvc').val();

      Stripe.card.createToken({
        number: cardNum,
        exp_month: cardMonth,
        exp_year: cardYear,
        cvc: cardCVC
      }, function(status, response) {
        if (response.error) {
          formError.find('p').text(response.error.message);
          formError.removeClass('hidden');
          cardForm.find('button').prop('disabled', false);
        } else {
          var token = response.id;
          console.log('got token: ' + token);
          cardForm.append($('<input type="hidden" name="stripeToken" />').val(token));
          cardForm.get(0).submit();
        }

      });

      return false;
    }
  });

});