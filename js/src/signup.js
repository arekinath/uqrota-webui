//= require <prototype>
//= require <SignupController>

document.observe('dom:loaded', function() {
	var c = new SignupController({
		email: $('emailEdit'),
		pw: $('passwordEdit'),
		pwConfirm: $('confirmEdit'),
		submit: $('allDoneButton')
	});
	
	$('emailEdit').focus();
});
