//= require <prototype>
//= require <DataModel>

/**
 * Model for search results used by the course browser.
 */
var CourseSearchResults = Class.create({
	
	initialize: function() {
		this.results = [];
		this.observers = {};
		this.observers.updated = [];
		this.observers.searching = [];
	},
	
	/**
	 * Gets the size of the current results array 
	 * @return int
	 */
	size: function() {
		return this.results.length;
	},
	
	/**
	 * Add an event callback.
	 * @param ev   string   event name
	 * @param f    function callback
	 */
	observe: function(ev, f) {
		if (!this.observers[ev])
			this.observers[ev] = [];
		this.observers[ev][this.observers[ev].length] = f;
	},
	
	/**
	 * Executes a function for each current course in the search
	 * @param f  function
	 */
	each: function(f) {
		this.results.each(f);
	},
	
	/**
	 * Updates the search model with a new search input string.
	 * Input string is separated into space-separated terms and
	 * searched for using database 'LIKE' operators. Each term
	 * is surrounded with '%' characters automatically.
	 * @param string		string		the new search string
	 */
	search: function(string) {
		var parts = string.split(' ').collect(function(p) { return '%'+p+'%'; });
		var query = {};
		var obj = query;
		
		for (var i=0; i < parts.length; i++) {
			var p = parts[i];
			
			obj['code.like'] = p;
			obj.or = {'name.like': p};
			obj.or.or = {'description.like': p};
			obj.or.or.or = {'coordinator.like': p};
			obj.or.or.or.or = {'school.like': p};
			
			if (i < parts.length - 1) {
				obj.orand = {};
				obj = obj.orand;
			}
		}
		
		this.observers.searching.each(function(f) {
			f();
		});
		
		Model.Course.all(query, function(courses) {
			this.results = courses;
			this.observers.updated.each(function(f) {
				f();
			});
		}.bind(this));
	},
	
	/**
	 * Gets the course model object that is result number n
	 * @param n   int   index into results
	 */
	get: function(n) {
		return this.results[n];
	}
});