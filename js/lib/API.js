//= require <prototype>
//= require <Model>

/**
 * Auxiliary namespace for API utilities like login management
 */
var API = {};

/**
 * Checks if we are currently logged in, and gets the session's API secret
 * if we don't already know it.
 * @param callback		function(bool logged_in)
 */
API.checkLogin = function(callback) {
	new Ajax.Request('/user/login.json', {
		method: 'get',
		evalJSON: 'force',
		onSuccess: function(t) {
			if (t.responseJSON.logged_in) {
				API.secret = t.responseJSON.secret;
				Model.User.cache.me = undefined;
				callback(true);
			} else {
				callback(false);
			}
		},
		onFailure: function(t) {
			// error message?
		}
	});
}

/**
 * Attempts to log in with the email and password given.
 * @param email			string
 * @param pass			string
 * @param callback		function(bool success)
 */
API.login = function(email, pass, callback) {
	new Ajax.Request('/user/login.json', {
		method: 'post',
		evalJSON: 'force',
		parameters: { "email": email, "password": pass },
		onSuccess: function(t) {
			if (t.responseJSON.success) {
				API.secret = t.responseJSON.secret;
				Model.User.cache.me = undefined;
				callback(true);
			} else {
				callback(false);
			}
		}
	});
}

/**
 * Logs out of the API backend
 * @param callback		function()
 */
API.logout = function(callback) {
	new Ajax.Request('/user/logout.json', {
		method: 'post',
		evalJSON: 'force',
		onSuccess: function(t) {
			if (t.responseJSON.success) {
				API.secret = null;
				Model.User.cache.me = undefined;
				if (callback)
					callback();
			}
		}
	});
}

/**
 * Attempts to register as a new user and create a session
 * as the new login.
 * @param email			string
 * @param pass			string
 * @param callback		function(bool success)
 */
API.register = function(email, pass, callback) {
	new Ajax.Request('/user/me.json', {
		method: 'put',
		evalJSON: 'force',
		parameters: { "user[email]": email, "user[password]": pass },
		onSuccess: function(t) {
			if (t.responseJSON.success) {
				API.secret = t.responseJSON.secret;
				Model.User.cache.me = undefined;
				callback(true);
			} else {
				callback(false);
			}
		}
	});
}