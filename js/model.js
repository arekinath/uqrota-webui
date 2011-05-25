/**
 * @author Alex Wilson
 */

var Resource = Class.create({
	initialize: function() {
		this.data = {};
	},
	setData: function(data) {
		this.data = data;
		for (x in data) {
			this['get' + x.capitalize()] = function() {
				return this.data[x];
			}
			this['set' + x.capitalize()] = function(v) {
				this.data[x] = v;
			}
		}
		
		for (var i = 0; i < this.relations.length; i++) {
			var r = this.relations[i];
			if (r.type == 'belongs_to') {
				this['get' + r.attr.capitalize()] = function(callback) {
					r.klass.get(this.data[r.attr][r.key], callback);
				}
			} else {
				this['get' + r.attr.capitalize()] = function(callback) {
					var rels = this.data[r.attr];
					var rel_objs = [];
					for (var i = 0; i < rels.length; i++) {
						r.klass.get(rels[i][r.key], function (reli) {
							rel_objs[rel_objs.length] = reli;
							if (rel_objs.length == rels.length) {
								callback(rel_objs);
							}
						});
					}
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
			onSuccess: function(response) {
				var o = new klass();
				o.setData(response.responseJSON);
				this.cache[id] = o;
				callback(o);
			},
			onFailure: function(response) {
				callback(null);
			}
		});
	}
}

var belongs_to = function(klass, attr, key) {
	key = typeof(key) != 'undefined' ? key : 'id';
	return { "klass": klass, "attr": attr, "key": key, "type": 'belongs_to' };
}

var has_n = function(klass, attr, key) {
	key = typeof(key) != 'undefined' ? key : 'id';
	return { "klass": klass, "attr": attr, "key": key, "type": 'has_n' };
}