//= require <prototype>
//= require <API>
//= require <Model>

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
 * isArray(obj) -> bool
 * - obj: any object
 * 
 * Identifies an array. Returns true if the object in question is an array.
 **/
function isArray(obj) {
	return obj.constructor.toString().indexOf(' Array()') >= 0;
}

/**
 * class Resource
 * 
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
 **/
var Resource = Class.create({
	
	initialize: function() {
		this.data = {};
		this._observers = {};
	},
	
/**
 * Resource#observe(event, callback) -> null
 * - event (string)
 * - callback (function)
 * 
 * Registers a callback to be called when an event occurs
 **/
	observe: function(evt, callback) {
		if (!this._observers[evt])
			this._observers[evt] = [];
		this._observers[evt].push(callback);
	},
	
	/*
	 * Calls the observers for a given event
	 */
	_call: function(evt, arg) {
		if (this._observers[evt]) {
			this._observers[evt].each(function(cb) {
				if (typeof(arg) != 'undefined')
					cb(arg);
				else
					cb();
			});
		}
	},
	
	/*
	 * Retrieves my "resource" URL -- used for get, post and delete.
	 */
	_resourceUrl: function() {
		return this.constructor.url_patterns.resource.format(this._id());
	},
	
	/*
	 * Retrieves my "create" URL -- used for a PUT to create a new resource
	 */
	_createUrl: function() {
		return this.constructor.url_patterns.create;
	},
	
	/*
	 * Gets my unique identifier
	 */
	_id: function() {
		return this.data[this.data._keys[0]];
	},
	
/**
 * Resource#refresh([callback]) -> null
 * - callback (function())
 * 
 * Request this resource from the database again and refresh its attributes.
 **/
	refresh: function(callback) {
		new Ajax.Request(this._resourceUrl(), {
			method: 'get',
			evalJSON: 'force',
			requestHeaders: {"X-Api-Secret": API.secret},
			onSuccess: function(t) {
				this._setData(t.responseJSON);
				if (callback)
					callback();
				this._call('refresh');
			}.bind(this)
		});
	},
	
/**
 * Resource#destroy([callback]) -> null
 * - callback (function())
 * 
 * Commands the backend to destroy this instance in the database.
 **/
	destroy: function(callback) {
		new Ajax.Request(this._resourceUrl(), {
			method: 'delete',
			evalJSON: 'force',
			requestHeaders: {"X-Api-Secret": API.secret},
			onSuccess: function(t) {
				this.constructor.cache[this._id()] = undefined;
				this._refreshParents(function() {
					if (callback)
						callback();
					this._call('destroy');
				});
			}.bind(this)
		});
	},
	
/**
 * Resource#zeroLevelData(inclClass) -> object
 * - inclClass (bool): include meta-attributes _class and _keys
 * 
 * Returns an object with the smallest possible set of attributes
 * which still uniquely identifies this instance.
 **/
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
 * Resource#firstLevelData(inclClass) -> object
 * - inclClass (bool): include meta-attributes _class and _keys
 * 
 * Returns an object with all the standard attributes of this
 * instance, but no relationships.
 **/
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
	
	/*
	 * Resource#_saveData() -> object
	 * 
	 * Returns this object as a set of query parameters ready to be sent
	 * in a POST request.
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
	
	/*
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
	
	/*
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
 * Resource#save([callback]) -> null
 * - callback (function())
 * 
 * Commits any changes in this resource's state into the backend. If
 * the resource is new, this will perform the necessary steps to create
 * it.
 **/
	save: function(callback) {
		var params = this._saveData();
		
		if (this.isNew) {
			new Ajax.Request(this._createUrl(), {
				method: 'put',
				evalJSON: 'force',
				requestHeaders: {"X-Api-Secret": API.secret},
				parameters: params,
				onSuccess: function(t) {
					this._setData(t.responseJSON);
					this.isNew = false;
					
					// force parents to refresh
					this._refreshParents(function() {
						if (callback)
							callback();
						this._call('save');
					});
				}.bind(this)
			});
		} else {
			new Ajax.Request(this._resourceUrl(), {
				method: 'post',
				evalJSON: 'force',
				requestHeaders: {"X-Api-Secret": API.secret},
				parameters: params,
				onSuccess: function(t) {
					this._setData(t.responseJSON);
					if (callback)
						callback();
					this._call('save');
				}.bind(this)
			});
		}
	},
	
	/*
	 * Where the magic happens. This gets called when there's new JSON data
	 * from the backend available for this object.
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
					this._call(Model._fname('change', x), v);
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
						this._call(Model._fname('change', r.attr), val);
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
 * Resource.get(id, callback) -> null
 * - id (any type): unique identifier of the object to be retrieved
 * - callback (function(Resource))
 * 
 * Retrieves a resource from the database and calls the callback with it
 * as its parameter when ready.
 **/

/*
 * Creates a standard getter for the given class
 */
Resource._get = function(klass) {
	return function(id, callback) {
		if (klass.cache[id]) {
			callback(klass.cache[id]);
		} else {
			new Ajax.Request(klass.url_patterns.resource.format(id), {
				method: 'get',
				evalJSON: 'force',
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

/*
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
 * Resource.all(conditions, callback) -> null
 * - conditions (object): search query to send to backend
 * - callback (function(array(Resource)))
 * 
 * Retrieves an array of all matching resources from the backend.
 **/

/*
 * Creates a 'find' function to retrieve all instances of
 * a class that meet certain criteria.
 */
Resource._all = function(klass) {
	return function(conditions, callback) {
		new Ajax.Request(klass.url_patterns.find, {
			method: 'get',
			evalJSON: 'force',
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
			evalJSON: 'force',
			requestHeaders: {"X-Api-Secret": API.secret},
			parameters: { "with": Object.toJSON(conditions) },
			onSuccess: function(t) {
				callback(t.responseJSON.count);
			}
		});
	};
}

/**
 * Resource.create(options) -> Resource
 * - options (object): initial attributes for the object
 * 
 * Creates a new Resource instance. Call Resource#save() to store it in the database.
 **/

/**
 * Resource.make(options[, funcs]) -> klass
 * 
 * Creates a Resource class. 'options' object should have at least two attributes:
 * 'url_patterns' and 'relations'.
 * 
 * 'relations' should be filled with objects made by belongs_to() and has_n() 
 **/
Resource.make = function(options, funcs) {
	if (typeof(funcs) == 'undefined') funcs = {};
	
	var klass = Class.create(Resource, funcs);
	klass.cache = {};
	klass.url_patterns = options.url_patterns;
	klass.relations = options.relations;
	
	// if we have a resource URL, generate a getter
	if (klass.url_patterns && klass.url_patterns.resource)
		klass.get = Resource._get(klass);
	else
		klass.get = Resource._get_cache_only(klass);
		
	// if we have a find URL, generate a .all() function
	if (klass.url_patterns && klass.url_patterns.find)
		klass.all = Resource._all(klass);
	
	// if we have a count URL, generate a .count() function
	if (klass.url_patterns && klass.url_patterns.count)
		klass.count = Resource._count(klass);
	
	// and if they gave us a creator, generate a .create() function to use it
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

/**
 * Resource.belongs_to(attr, immediate) -> attrobject
 * - attr (string): name of the attribute in JSON that contains this relationship
 * - immediate (bool): if true, expect that the entirety of the parent's data is embedded in the attribute
 * 
 * Creates a 'belongs-to' relationship for use with Resource.make()
 **/
var belongs_to = function(attr, idf) {
	var full = typeof(idf) != 'undefined' ? true : false;
	return { "attr": attr, "full": full, "idf": idf, "type": 'belongs_to' };
}

/**
 * Resource.has_n(attr, immediate) -> attrobject
 * - attr (string): name of the attribute in JSON that contains this relationship
 * - immediate (bool): if true, expect that the entirety of the children's data is embedded in the attribute
 * 
 * Creates a 'has-N' relationship for use with Resource.make()
 **/
var has_n = function(attr, idf) {
	var full = typeof(idf) != 'undefined' ? true : false;
	return { "attr": attr, "full": full, "idf": idf, "type": 'has_n' };
}