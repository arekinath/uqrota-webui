//= require <prototype>
//= require <API>
//= require <model/User>

var LoginBoxView = Class.create({
	initialize: function(div) {
		this.elem = div;
		this.update();
	},
	
	update: function() {
		API.checkLogin(function(loggedIn) {
			if (loggedIn) {
				Model.User.get('me', function(me) {
					this.elem.update("Logged in as <b>" + me.getEmail() + "</b>&nbsp;&nbsp;");
					var logoutLink = new Element('a', {'href': '#'});
					logoutLink.addClassName('bluebutton');
					logoutLink.update("Log out");
					this.elem.appendChild(logoutLink);
					logoutLink.observe('click', function(evt) {
						evt.stop();
						API.logout(function() {
							window.location.href = "/index.html";
						});
					});
				}.bind(this));
			} else {
				var emailEdit = new Element('input', { type: 'text', value: 'email' });
				var passwordEdit = new Element('input', { type: 'password', value: 'password' });
				var loginBtn = new Element('a', { href: '#' });
				loginBtn.update('Log in');
				loginBtn.addClassName('bluebutton');
				
				var lbox = this.elem;
				lbox.update('');
				lbox.appendChild(emailEdit);
				lbox.insert('&nbsp;');
				lbox.appendChild(passwordEdit);
				lbox.insert('&nbsp;');
				lbox.appendChild(loginBtn);
				
				emailEdit.observe('focus', function(evt) {
					if (emailEdit.value == 'email')
						emailEdit.value = '';
				});
				
				passwordEdit.observe('focus', function(evt) {
					if (passwordEdit.value == 'password')
						passwordEdit.value = '';
				});
				
				var loginHandler = function() {
					this.elem.update('Logging in...');
					API.login(emailEdit.value, passwordEdit.value, function(success) {
						if (success) {
							this.update();
							if (window.location.href.indexOf('index.html') > 0)
								window.location.href = '/courses.html';
						} else {
							alert('Sorry, but that email or password was not recognised');
							this.update();
						}
					}.bind(this));
				}.bind(this);
				
				loginBtn.observe('click', function(evt) {
					evt.stop();
					loginHandler();
				});
				emailEdit.observe('keypress', function(evt) {
					if (evt.keyCode == Event.KEY_RETURN) {
						evt.stop();
						loginHandler();
					}
				});
				passwordEdit.observe('keypress', function(evt) {
					if (evt.keyCode == Event.KEY_RETURN) {
						evt.stop();
						loginHandler();
					}
				});
			}
		}.bind(this));
	}
});