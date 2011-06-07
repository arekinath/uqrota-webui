/**
 * model.js
 *  - contains the shared model-level code, including API
 *  - contains the model-proxy layer
 * @author Alex Wilson
 */

// with thanks to Filipiz, of Stack Overflow
String.prototype.format = function() {
    var formatted = this;
    for (var i = 0; i < arguments.length; i++) {
        var regexp = new RegExp('\\{'+i+'\\}', 'gi');
        formatted = formatted.replace(regexp, arguments[i]);
    }
    return formatted;
};

/**
 * The namespace for model classes
 */
var Model = {};

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
 * Attempts to register as a new user and create a session
 * as the new login.
 * @param email			string
 * @param pass			string
 * @param callback		function(bool success)
 */
API.register = function(email, pass, callback) {
	new Ajax.Request('/user/me.json', {
		method: 'put',
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

/**
 * Convenience function for generating getter and setter names
 * example: _fname('get', 'user_names') => 'getUserNames'
 * @param pref	string		prefix
 * @param usep	string		underscore-separated root name 
 */
Model._fname = function(pref, usep) {
	return pref + usep.split("_").collect(function (part) {
			return part.capitalize();
		}).join("");
}

/**
 * Identifies an array.
 * @param obj		object
 * @return true if obj is an array
 */
function isArray(obj) {
	return obj.constructor.toString().indexOf(' Array()') >= 0;
}

/**
 * Utility mix-in for classes that act as a 'model-proxy' -- these emulate
 * the semantics of the DataMapper API in the backend for the use of frontend
 * Javascript code.
 * 
 * The backend returns JSON objects from all its GET requests. These include
 * a number of items of meta-data: _class and _keys. The '_class' meta-attribute
 * is a string naming the original class that the JSON was generated by in the
 * backend. The '_keys' meta-attribute contains a list of strings, which are the
 * names of other attributes which together uniquely identify any instance of
 * the class.
 * 
 * We use these to automatically generate getters and setters for all the
 * attributes of the instance, as well as their relationships. Implementing
 * classes get a very simple API to specify this behaviour -- datamodel.js and
 * usermodel.js have a lot of examples of this. 
 */
var Resource = Class.create({
	initialize: function() {
		this.data = {};
	},
	
	/**
	 * Retrieves my "resource" URL -- used for get, post and delete.
	 */
	_resourceUrl: function() {
		return this.constructor.url_patterns.resource.format(this._id());
	},
	
	/**
	 * Retrieves my "create" URL -- used for a PUT to create a new resource
	 */
	_createUrl: function() {
		return this.constructor.url_patterns.create;
	},
	
	/**
	 * Gets my unique identifier
	 */
	_id: function() {
		return this.data[this.data._keys[0]];
	},
	
	/**
	 * Request this resource from the database again and refresh its attributes.
	 * @param callback		function()
	 */
	refresh: function(callback) {
		new Ajax.Request(this._resourceUrl(), {
			method: 'get',
			requestHeaders: {"X-Api-Secret": API.secret},
			onSuccess: function(t) {
				this._setData(t.responseJSON);
				if (callback)
					callback();
			}.bind(this)
		});
	},
	
	/**
	 * Commands the backend to destroy this instance in the database.
	 * @param callback		function()
	 */
	destroy: function(callback) {
		new Ajax.Request(this._resourceUrl(), {
			method: 'delete',
			requestHeaders: {"X-Api-Secret": API.secret},
			onSuccess: function(t) {
				this.constructor.cache[this._id()] = undefined;
				this._refreshParents(callback);
			}.bind(this)
		});
	},
	
	/**
	 * Returns an object with the smallest possible set of attributes
	 * which still uniquely identifies this instance.
	 * @param inclClass		bool		include meta-attributes _class and _keys
	 */
	zeroLevelData: function(inclClass) {
		var zld = {};
		for (var i = 0; i < this.data._keys.length; i++) {
			zld[this.data._keys[i]] = this.data[this.data._keys[i]];
		}
		if (this.constructor.relations) {
			for (var i = 0; i < this.constructor.relations.length; i++) {
				var r = this.constructor.relations[i];
				if (r.type == 'belongs_to') {
					zld[r.attr] = this.data[r.attr];
				}
			}
		}
		if (inclClass) {
			zld['_class'] = this.data['_class'];
			zld['_keys'] = this.data['_keys'];
		}
		return zld;
	},
	
	/**
	 * Returns an object with all the standard attributes of this
	 * instance, but no relationships.
	 * @param inclClass		bool		include meta-attributes _class and _keys
	 */
	firstLevelData: function(inclClass) {
		var zld = {};
		for (x in this.data) {
			if (this.data[x] && !isArray(this.data[x]) && x != '_class') {
				zld[x] = this.data[x];
			}
		}
		if (inclClass) {
			zld['_class'] = this.data['_class'];
			zld['_keys'] = this.data['_keys'];
		}
		return zld;
	},
	
	/**
	 * Returns this object as a set of query parameters ready to be sent
	 * in a POST request.
	 * @return object
	 */
	_saveData: function() {
		var params = {};
		var objnm = this.data['_class'].toLowerCase();
		var zld = this.firstLevelData();
		
		for (x in zld) {
			if (typeof(zld[x]) == 'object') {
				if (isArray(zld[x])) {
					for (var i = 0; i < zld[x].length; i++) {
						params[objnm+'['+x+'['+i+']]'] = zld[x][i];
					}
				} else {
					for (q in zld[x]) {
						if (q != '_keys' && q != '_class')
							params[objnm+'['+x+'['+q+']]'] = zld[x][q];
					}
				}
			} else {
				params[objnm+'['+x+']'] = zld[x];
			}
		}
		
		return params;
	},
	
	/**
	 * Turns a collection into a format suitable for query parameters.
	 */
	_collectionToParams: function(collection, name) {
		var params = {};
		for (var i = 0; i < collection.length; i++) {
			if (typeof(collection[i]) == 'object') {
				for (x in collection[i]) {
					params[name+'['+i+']['+x+']'] = collection[i][x];
				}
			} else {
				params[name+'['+i+']'] = collection[i];
			}
		}
		return params;
	},
	
	/**
	 * Forces the 'parents' of this resource (those to whom this resource
	 * 	has belongs_to relationships) to be reloaded.
	 */
	_refreshParents: function(callback) {
		var rels = this.constructor.relations;
		if (rels) {
			var sent = 0, received = 0;
			
			for (var i = 0; i < rels.length; i++) {
				var rel = rels[i];
				if (rel.type == 'belongs_to')
					sent++;
			}
			
			for (var i = 0; i < rels.length; i++) {
				var rel = rels[i];
				if (rel.type == 'belongs_to') {
					var fname = Model._fname('get', rel.attr);
					this[fname](function(obj) {
						obj.refresh(function() {
							received++;
							if (received == sent && callback)
								callback();
						});
					});
				}
			}
		} else if (callback) {
			callback();
		}
	},
	
	/**
	 * Commits any changes in this resource's state into the backend. If
	 * the resource is new, this will perform the necessary steps to create
	 * it.
	 */
	save: function(callback) {
		var params = this._saveData();
		
		if (this.isNew) {
			new Ajax.Request(this._createUrl(), {
				method: 'put',
				requestHeaders: {"X-Api-Secret": API.secret},
				parameters: params,
				onSuccess: function(t) {
					this._setData(t.responseJSON);
					this.isNew = false;
					
					// force parents to refresh
					this._refreshParents(callback);
				}.bind(this)
			});
		} else {
			new Ajax.Request(this._resourceUrl(), {
				method: 'post',
				requestHeaders: {"X-Api-Secret": API.secret},
				parameters: params,
				onSuccess: function(t) {
					this._setData(t.responseJSON);
					if (callback)
						callback();
				}.bind(this)
			});
		}
	},
	
	/**
	 * Where the magic happens
	 */
	_setData: function(data) {
		this.data = data;
		
		// set up all our normal attributes
		for (x in data) {
			if (x != '_class' && x != '_keys') {
				this[Model._fname('get',x)] = function(x) { return function() {
					return this.data[x];
				}; }(x);
				this[Model._fname('set',x)] = function(x) { return function(v) {
					this.data[x] = v;
				}; }(x);
			}
		}

		// skip the rest if we have no relationships
		if (!this.constructor.relations) return;
		
		// for each of our relationships
		for (var i = 0; i < this.constructor.relations.length; i++) {
			var r = this.constructor.relations[i];

			// create the appropriate getter functoin
			this[Model._fname('get',r.attr)] = function(r) {
				return function(callback) {
					var objs = [];
					var objos = [];
					var pobjs = data[r.attr];
					if (typeof(pobjs.length) == 'undefined') pobjs = [ pobjs ];
					
					if (pobjs.length == 0) {
						callback([]);
						return;
					}
					
					for (var j = 0; j < pobjs.length; j++) {
						var pobj = pobjs[j];
						
						// work out identifier field name
						var idf = pobj._keys[0];
								
						Model[pobj['_class']].get(pobj[idf], function(j) { return function(obj) {
							objs[objs.length] = obj;
							objos[j] = obj;
							if (objs.length == pobjs.length) {
								if (r.type == 'belongs_to')
									callback(objs[0]);
								else
									callback(objos);
							}
						}; }(j));
					}
				};
			}(r);
			// add convenience methods -- getSomethings.each, .first and .at(n)
			var getter = this[Model._fname('get',r.attr)];
			getter.each = function(getter) {
				return function(callback) {
					getter(function(list) {
						list.each(callback);
					});
				};
			}(getter);
			getter.first = function(getter) {
				return function(callback) {
					getter(function(list) {
						callback(list[0]);
					});
				};
			}(getter);
			getter.at = function(getter) {
				return function(i, callback) {
					getter(function(list) {
						callback(list[i]);
					});
				};
			}(getter);
			
			// add a setter, but ONLY for belongs_to relationships
			if (r.type == 'belongs_to') {
				this[Model._fname('set',r.attr)] = function(r) {
					return function(val) {
						this.data[r.attr] = val.zeroLevelData(true);
					};
				}(r);
			} else {
				this[Model._fname('set',r.attr)] = undefined;
			}
			
			// .full is a flag specifying that the backend will return
			// a relationship inline rather than just an ID -- so here 
			// we have to load these out of the JSON object
			if (r.full) {
				var objs = data[r.attr];
				if (typeof(objs.length) == 'undefined')
					objs = [ objs ];
				
				for (var j = 0; j < objs.length; j++) {
					var klass = Model[objs[j]['_class']];
					
					var krels = klass.relations;
					var myrel = null;
					krels.each(function (rel) {
						if (rel.type == 'belongs_to')
							myrel = rel.attr;
					});
					if (!myrel)
						myrel = data['_class'].toLowerCase();
					
					var me = {};
					var key = data['_keys'][0];
					me['_class'] = data['_class'];
					me['_keys'] = data['_keys'];
					me[key] = data[key];
					objs[j][myrel] = me;
					
					var x = new klass();
					x.setData(objs[j]);
					
					var id = objs[j][objs[j]._keys[0]];
					klass.cache[id] = x;
				}
			}
		}
	}
});

/**
 * Creates a standard getter for the given class
 */
Resource._get = function(klass) {
	return function(id, callback) {
		if (klass.cache[id]) {
			callback(klass.cache[id]);
		} else {
			new Ajax.Request(klass.url_patterns.resource.format(id), {
				method: 'get',
				requestHeaders: {"X-Api-Secret": API.secret},
				onSuccess: function(r) {
					var o = new klass();
					o._setData(r.responseJSON);
					klass.cache[o._id()] = o;
					callback(o);
				},
				onFailure: function(r) {
					callback(null);
				}
			});
		}
	};
}

/**
 * Creates a getter that only checks the class cache
 * Used for inline-loaded relationships (.full == true)
 */
Resource._get_cache_only = function(klass) {
	return function(id, callback) {
		if (klass.cache[id])
			callback(klass.cache[id]);
		else
			callback(null);
	};
}

/**
 * Creates a 'find' function to retrieve all instances of
 * a class that meet certain criteria.
 */
Resource._all = function(klass) {
	return function(conditions, callback) {
		new Ajax.Request(klass.url_patterns.find, {
			method: 'get',
			parameters: { "with": Object.toJSON(conditions) },
			requestHeaders: {"X-Api-Secret": API.secret},
			onSuccess: function(t) {
				var objs = [];
				var sz = t.responseJSON.length;
				
				if (sz == 0) {
					callback([]);
					return;
				}
				
				t.responseJSON.each(function(obj) {
					var key = obj._keys[0];
					Model[obj._class].get(obj[key], function(obob) {
						objs[objs.length] = obob;
						if (objs.length == sz)
							callback(objs);
					});
				});
			}
		});
	};
}

Resource._count = function(klass) {
	return function(conditions, callback) {
		new Ajax.Request(klass.url_patterns.count, {
			method: 'get',
			requestHeaders: {"X-Api-Secret": API.secret},
			parameters: { "with": conditions.toJSON() },
			onSuccess: function(t) {
				callback(t.responseJSON.count);
			}
		});
	};
}

Resource.make = function(options, funcs) {
	if (typeof(funcs) == 'undefined') funcs = {};
	
	var klass = Class.create(Resource, funcs);
	klass.cache = {};
	klass.url_patterns = options.url_patterns;
	klass.relations = options.relations;
	
	if (klass.url_patterns && klass.url_patterns.resource)
		klass.get = Resource._get(klass);
	else
		klass.get = Resource._get_cache_only(klass);
		
	if (klass.url_patterns && klass.url_patterns.find)
		klass.all = Resource._all(klass);
	
	if (klass.url_patterns && klass.url_patterns.count)
		klass.count = Resource._count(klass);
	
	if (options.creator) {
		klass.create = function(opts) {
			var data = options.creator(opts);
			var obj = new klass();
			obj._setData(data);
			obj.isNew = true;
			return obj;
		};
	}
	
	return klass;
}

var belongs_to = function(attr, idf) {
	var full = typeof(idf) != 'undefined' ? true : false;
	return { "attr": attr, "full": full, "idf": idf, "type": 'belongs_to' };
}

var has_n = function(attr, idf) {
	var full = typeof(idf) != 'undefined' ? true : false;
	return { "attr": attr, "full": full, "idf": idf, "type": 'has_n' };
}