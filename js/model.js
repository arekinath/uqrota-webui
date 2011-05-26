/**
 * @author Alex Wilson
 */

var Model = {};

var API = {};

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

Model._fname = function(pref, usep) {
	return pref + usep.split("_").collect(function (part) {
			return part.capitalize();
		}).join("");
}

var Resource = Class.create({
	initialize: function() {
		this.data = {};
	},
	setData: function(data) {
		this.data = data;
		
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

		if (!this.constructor.relations) return;
		
		for (var i = 0; i < this.constructor.relations.length; i++) {
			var r = this.constructor.relations[i];

			this[Model._fname('get',r.attr)] = function(r) {
				return function(callback) {
					var objs = [];
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
								
						Model[pobj['_class']].get(pobj[idf], function(obj) {
							objs[objs.length] = obj;
							if (objs.length == pobjs.length) {
								if (r.type == 'belongs_to')
									callback(objs[0]);
								else
									callback(objs);
							}
						});
					}
				};
			}(r);
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
			this[Model._fname('set',r.attr)] = null;
			
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

Resource.get = function(klass, url, id, callback) {
	if (klass.cache[id]) {
		callback(klass.cache[id]);
	} else {
		new Ajax.Request(url, {
			method: 'get',
			onSuccess: function(r) {
				var o = new klass();
				o.setData(r.responseJSON);
				klass.cache[id] = o;
				callback(o);
			},
			onFailure: function(r) {
				callback(null);
			}
		});
	}
}

Resource.all = function(url, conditions, callback) {
	new Ajax.Request(url, {
		method: 'get',
		parameters: { "with": Object.toJSON(conditions) },
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
}

Resource.count = function(url, conditions, callback) {
	new Ajax.Request(url, {
		method: 'get',
		parameters: { "with": conditions.toJSON() },
		onSuccess: function(t) {
			callback(t.responseJSON.count);
		}
	});
}

Resource.get_auth = function(klass, url, id, callback) {
	if (klass.cache[id]) {
		callback(klass.cache[id]);
	} else {
		new Ajax.Request(url, {
			method: 'get',
			requestHeaders: {"X-Api-Secret": API.secret},
			onSuccess: function(r) {
				var o = new klass();
				o.setData(r.responseJSON);
				klass.cache[id] = o;
				callback(o);
			},
			onFailure: function(r) {
				callback(null);
			}
		});
	}
}

Resource._get_cache_only = function(klass) {
	return function(id, callback) {
		if (klass.cache[id])
			callback(klass.cache[id]);
		else
			callback(null);
	};
}

var belongs_to = function(attr, idf) {
	var full = typeof(idf) != 'undefined' ? true : false;
	return { "attr": attr, "full": full, "idf": idf, "type": 'belongs_to' };
}

var has_n = function(attr, idf) {
	var full = typeof(idf) != 'undefined' ? true : false;
	return { "attr": attr, "full": full, "idf": idf, "type": 'has_n' };
}