//= require <prototype>
//= require <API>
//= require <model/User>

var LoginBoxView = Class.create({
	initialize: function(opts) {
		if (opts && opts.target) {
			this.elem = opts.target;
		}
		if (opts && opts.controller) {
			this.controller = opts.controller;
		}
		API.observe('status', this.on_apiStatus.bind(this));
	},
	
	getEmail: function() {
		return this.emailEdit.value;
	},
	
	getPassword: function() {
		return this.passwordEdit.value;
	},
	
	makeLogOutUi: function() {
		Model.User.get('me', function(me) {
			this.elem.update("Logged in as <b>" + me.getEmail() + "</b>&nbsp;&nbsp;");
			this.logoutLink = new Element('a', {'href': '#'});
			this.logoutLink.addClassName('bluebutton');
			this.logoutLink.update("Log out");
			this.elem.appendChild(logoutLink);
			this.logoutLink.observe('click', function(evt) {
				evt.stop();
				this.controller.logout();
			}.bind(this));
		}.bind(this));
	},
	
	makeLogInUi: function() {
		this.emailEdit = new Element('input', { type: 'text', value: 'email' });
		this.passwordEdit = new Element('input', { type: 'password', value: 'password' });
		this.loginBtn = new Element('a', { href: '#' });
		this.loginBtn.update('Log in');
		this.loginBtn.addClassName('bluebutton');
		
		var lbox = this.elem;
		lbox.update('');
		lbox.appendChild(emailEdit);
		lbox.insert('&nbsp;');
		lbox.appendChild(passwordEdit);
		lbox.insert('&nbsp;');
		lbox.appendChild(loginBtn);
		
		this.emailEdit.observe('focus', function(evt) {
			if (this.emailEdit.value == 'email')
				this.emailEdit.value = '';
		}.bind(this));
		
		this.passwordEdit.observe('focus', function(evt) {
			if (this.passwordEdit.value == 'password')
				this.passwordEdit.value = '';
		}.bind(this));
			
		var loginHandler = this.controller.login.bind(this.controller);
		
		this.loginBtn.observe('click', function(evt) {
			evt.stop();
			loginHandler();
		});
		this.emailEdit.observe('keypress', function(evt) {
			if (evt.keyCode == Event.KEY_RETURN) {
				evt.stop();
				loginHandler();
			}
		});
		this.passwordEdit.observe('keypress', function(evt) {
			if (evt.keyCode == Event.KEY_RETURN) {
				evt.stop();
				loginHandler();
			}
		});
	},
	
	on_apiStatus: function(status) {
		if (status) {
			this.makeLogOutUi();
		} else {
			this.makeLogInUi();
		}
	}
});