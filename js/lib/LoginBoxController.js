//= require <prototype>
//= require <API>

var LoginBoxController = Class.create({
	initialize: function() {
	},
	
	setView: function(view) {
		this.view = view;
	},
	
	login: function() {
		API.login(this.view.getEmail(), this.view.getPassword());
	},
	
	logout: function() {
		API.logout();
	},
	
	startup: function() {
		API.checkLogin();
	}
	
});
