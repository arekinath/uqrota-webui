//= require <prototype>
//= require <API>
//= require <PasswordRating>
//= require <model/User>

var SignupController = Class.create({
	initialize: function(emailEdit, pwEdit, pwConfirmEdit, submitButton) {
		this.emailEdit = emailEdit;
		this.pwEdit = pwEdit;
		this.pwConfirmEdit = pwConfirmEdit;
		this.submitButton = submitButton;
		
		this.setupEvents();
	},
	
	setupEvents: function() {
		var f = function(evt) {
			if (evt.keyCode == Event.KEY_RETURN) {
				evt.stop();
				this.go();
			}
		}.bind(this);
		
		this.emailEdit.observe('keypress', f);
		this.pwEdit.observe('keypress', f);
		this.pwEdit.observe('keypress', function(evt) {
			var rating = PasswordRating.rate(this.pwEdit.value);
			
			var colours = {};
			colours['very weak'] 	= '#f00';
			colours['weak'] 		= '#f55';
			colours['mediocre'] 	= '#fcc';
			colours['strong']		= '#cfc';
			colours['stronger']		= '#5f5';
			
			this.pwEdit.style.backgroundColor = colours[rating.verdict];
		}.bind(this));
		
		this.pwConfirmEdit.observe('keypress', f);
		
		this.submitButton.observe('click', function(evt) {
			evt.stop();
			this.go();
		}.bind(this));
	},
	
	validate: function() {
		var re = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/
		if (!re.test(this.emailEdit.value)) {
			alert('Please input a valid email address.');
			this.emailEdit.focus();
			return false;
		}
		
		if (this.emailEdit.value.indexOf('uq.edu.au') >= 0 ||
				this.emailEdit.value.indexOf('@uqconnect.edu.au') >= 0) {
			if (!confirm('This is a UQ email address. Please use a DIFFERENT password to your normal UQ password -- press Cancel to change')) {
				this.pwEdit.value = '';
				this.pwEdit.focus();
				this.pwConfirmEdit.value = '';
				return false;
			}
		}
		
		if (this.pwEdit.value != this.pwConfirmEdit.value) {
			alert('Passwords do not match, please re-type the same value in both boxes.');
			this.pwEdit.value = '';
			this.pwConfirmEdit.value = '';
			this.pwEdit.focus();
			return false;
		}
		
		var rating = PasswordRating.rate(this.pwEdit.value);
		if (rating.verdict == 'very weak') {
			alert('That password is very weak. Please make it at least a little stronger -- add a number or punctuation symbol somewhere.');
			this.pwEdit.value = '';
			this.pwConfirmEdit.value = '';
			this.pwEdit.focus();
		}
		
		return true;
	},
	
	go: function() {
		if (this.validate()) {
			// send the request
		}
	},
});
