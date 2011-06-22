//= require <prototype>
//= require <Model>

/**
 * API
 * Auxiliary namespace for API utilities like login management
 **/
var API = {};

/**
 * API.checkLogin([callback]) -> null
 * - callback (function(bool))
 * 
 * Checks if we are currently logged in, and gets the session's API secret
 * if we don't already know it.
 **/
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
 * API.login(email, pass[, callback]) -> null
 * - email (string)
 * - pass (string)
 * - callback (function(bool))
 * 
 * Attempts to log in with the email and password given.
 **/
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
 * API.logout([callback]) -> null
 * - callback (function())
 * 
 * Logs out of the API backend
 **/
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
 * API.getTimeToken(callback) -> null
 * - callback (function(object))
 * 
 * Requests a new time token from the server
 **/
API.getTimeToken = function(callback) {
	new Ajax.Request('/user/timetoken.json', {
		method: 'get',
		evalJSON: 'force',
		onSuccess: function(t) {
			callback(t.responseJSON);
		}
	});
}

/**
 * API.register(email, pass, token[, callback]) -> null
 * - email (string)
 * - token (object): a time token retrieved by API.getTimeToken()
 * - pass (string)
 * - callback (function(bool))
 * 
 * Attempts to register as a new user and create a session
 * as the new login.
 **/
API.register = function(email, pass, token, callback) {
	new Ajax.Request('/user/me.json', {
		method: 'put',
		evalJSON: 'force',
		parameters: { "user[email]": email, "user[password]": pass, "tdata": token.tdata, "hash": token.hash },
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