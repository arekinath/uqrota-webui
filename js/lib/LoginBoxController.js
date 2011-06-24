//= require <prototype>
//= require <API>

var LoginBoxController = Class.create({
	initialize: function() {
	},
	
	setView: function(view) {
		this.view = view;
	},
	
	login: function() {
		API.login(this.view.getEmail(), this.view.getPassword(), function(success) {
			if (!success) {
				alert("Sorry, we couldn't find anyone with that email and password. Please try again or use the 'forgot my password' feature if you're stuck.");
			}
		});
	},
	
	logout: function() {
		API.logout();
	},
	
	startup: function() {
		API.checkLogin();
	}
	
});
