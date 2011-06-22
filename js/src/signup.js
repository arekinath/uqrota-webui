//= require <prototype>
//= require <SignupController>

document.observe('dom:loaded', function() {
	var c = new SignupController($('emailEdit'),
								 $('passwordEdit'),
								 $('confirmEdit'),
								 $('allDoneButton'));
	$('emailEdit').focus();
	
});
