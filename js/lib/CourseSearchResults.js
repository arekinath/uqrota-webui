//= require <prototype>
//= require <model/Course>

/**
 * class CourseSearchResults
 * 
 * Model for search results used by the course browser.
 **/
var CourseSearchResults = Class.create({
	
	/**
	 * new CourseSearchResults()
	 **/
	initialize: function() {
		this.results = [];
		this.observers = {};
		this.observers.updated = [];
		this.observers.searching = [];
	},
	
	/**
	 * CourseSearchResults#size() -> int
	 * 
	 * Gets the size of the current results array 
	 **/
	size: function() {
		return this.results.length;
	},
	
	/**
	 * CourseSearchResults#observe(event, func) -> null
	 * - event (string)
	 * - func (function)
	 * 
	 * Add an event callback.
	 **/
	observe: function(ev, f) {
		if (!this.observers[ev])
			this.observers[ev] = [];
		this.observers[ev][this.observers[ev].length] = f;
	},
	
	/**
	 * CourseSearchResults#each(func) -> null
	 * - func (function)
	 * 
	 * Executes a function for each current course in the search
	 **/
	each: function(f) {
		this.results.each(f);
	},
	
	/**
	 * CourseSearchResults#search(string) -> null
	 * - string (string): string to search for
	 * 
	 * Updates the search model with a new search input string.
	 * Input string is separated into space-separated terms and
	 * searched for using database 'LIKE' operators. Each term
	 * is surrounded with '%' characters automatically.
	 **/
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
	 * CourseSearchResults#get(n) -> object
	 * - n (int): index into results
	 * 
	 * Gets the course model object that is result number n
	 **/
	get: function(n) {
		return this.results[n];
	}
});