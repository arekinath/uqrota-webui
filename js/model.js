/**
 * @author Alex Wilson
 */

var Model = {};

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
			this[Model._fname('set',r.attr)] = null;
			
			if (r.full) {
				var objs = data[r.attr];
				if (typeof(objs.length) == 'undefined')
					objs = [ objs ];
				
				for (var j = 0; j < objs.length; j++) {
					var me = {};
					var key = data['_keys'][0];
					me[key] = data[key]; 
					objs[j][data['_class'].toLowerCase()] = me;
					
					var klass = Model[objs[j]['_class']];
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

var belongs_to = function(attr, idf) {
	var full = typeof(idf) != 'undefined' ? true : false;
	return { "attr": attr, "full": full, "idf": idf, "type": 'belongs_to' };
}

var has_n = function(attr, idf) {
	var full = typeof(idf) != 'undefined' ? true : false;
	return { "attr": attr, "full": full, "idf": idf, "type": 'has_n' };
}