//= require <prototype>
//= require <API>
//= require <PasswordRating>
//= require <model/User>

var SignupController = Class.create({
	initialize: function(opts) {
		this.emailEdit = opts.email;
		this.pwEdit = opts.pw;
		this.pwConfirmEdit = opts.pwConfirm;
		this.submitButton = opts.submit;
		
		this.emailOk = false;
		this.emailTout = null;
		
		this.setupEvents();
		
		this.emailTout = setTimeout(this.checkEmail.bind(this), 1);
		
		API.getTimeToken(function(token) {
			this.timeToken = token;
		}.bind(this));
	},
	
	checkEmail: function() {
		if (this.emailTout)
			clearTimeout(this.emailTout);
		this.emailTout = null;
		
		Model.User.count({ "email": this.emailEdit.value }, function(cnt) {
			if (cnt == 0) {
				this.emailEdit.style.backgroundColor = "#fff";
				this.emailOk = true;
			} else {
				this.emailEdit.style.backgroundColor = "#f00";
				this.emailOk = false;
			}
		}.bind(this));
	},
	
	setupEvents: function() {
		var f = function(evt) {
			if (evt.keyCode == Event.KEY_RETURN) {
				evt.stop();
				this.go();
			}
		}.bind(this);
		
		this.emailEdit.observe('keypress', f);
		this.emailEdit.observe('keypress', function(evt) {
			this.emailOk = false;
			if (this.emailTout) {
				clearTimeout(this.emailTout);
			}
			this.emailTout = setTimeout(this.checkEmail.bind(this), 500);
		}.bind(this));
		
		this.pwEdit.observe('keypress', f);
		this.pwEdit.observe('keypress', function(evt) {
			var rating = PasswordRating.rate(this.pwEdit.value);
			
			var colours = {};
			colours['very weak'] 	= '#f00';
			colours['weak'] 		= '#f55';
			colours['mediocre'] 	= '#fff';
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
		
		if (!this.emailOk) {
			alert("That email address has already been registered! Try another one, or use the 'Forgot my password' feature if you don't remember your old password.");
			this.emailEdit.focus();
			return false;
		}
		
		if (this.pwEdit.value != this.pwConfirmEdit.value) {
			alert("Woops, the two passwords don't match, please re-type the same password in both boxes.");
			this.pwEdit.value = '';
			this.pwConfirmEdit.value = '';
			this.pwEdit.focus();
			return false;
		}
		
		var rating = PasswordRating.rate(this.pwEdit.value);
		if (rating.verdict == 'very weak') {
			alert('That password is very weak. Please make it at least a little stronger -- adding a number or punctuation symbol is often a good bet.');
			this.pwEdit.value = '';
			this.pwConfirmEdit.value = '';
			this.pwEdit.focus();
			return false;
		}
		
		return true;
	},
	
	go: function() {
		if (this.validate()) {
			this.submitButton.update('Please wait...');
			// send the request
			API.register(this.emailEdit.value, this.pwEdit.value, this.timeToken, function(ok) {
				if (ok) {
					window.location.href = "/courses.html";
				} else {
					this.submitButton.update('Try again');
					alert('Sorry! Something seems to have gone wrong. Please try again shortly, or contact support.');
				}
			}.bind(this));
		}
	},
});
