/**
 * @author Alex Wilson
 */

var CourseSearchResults = Class.create({
	initialize: function() {
		this.results = [];
		this.observers = {};
		this.observers.updated = [];
		this.observers.searching = [];
	},
	
	size: function() {
		return this.results.length;
	},
	
	observe: function(ev, f) {
		if (!this.observers[ev])
			this.observers[ev] = [];
		this.observers[ev][this.observers[ev].length] = f;
	},
	
	each: function(f) {
		this.results.each(f);
	},
	
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
	
	get: function(n) {
		return this.results[n];
	}
});

var CourseBrowser = Class.create({
	initialize: function(searchBox, resultsPanel, moreInfoPanel, model) {
		this.model = model;
		this.searchBox = searchBox;
		this.searchBox.observe('change', this.searchBoxChanged.bind(this));
		this.searchBox.observe('keypress', this.searchBoxChanged.bind(this));
		this.resultsPanel = resultsPanel;
		this.moreInfoPanel = moreInfoPanel;

		this.model.observe('searching', this.showSearching.bind(this));
		this.model.observe('updated', this.update.bind(this));
		this.update();
	},
	
	showSearching: function() {
		this.resultsPanel.update('Searching...');
	},
	
	update: function() {
		this.resultsPanel.update();
		this.model.each(function(cs) {
			var e = new Element('div');
			e.addClassName('course');
			e.update(cs.getCode());
			var ec = new Element('span');
			ec.addClassName('name');
			ec.update(cs.getName());
			e.appendChild(ec);
			
			this.resultsPanel.appendChild(e);
			var to = null;
			e.observe('mouseenter', function() {
				if (to)
					window.clearTimeout(to);
				to = window.setTimeout(function() {
					this.moreInfoPanel.update('<b>'+cs.getCode() + '</b><br/>'+cs.getDescription()+'<br/>'+cs.getCoordinator());
				}.bind(this), 500);
			}.bind(this));
			e.observe('mouseleave', function() {
				if (to)
					window.clearTimeout(to);
				to = null;
			});
			
			new Draggable(e, { ghosting: true, onEnd: this.update.bind(this) });
			
		}.bind(this));
	},
	
	searchBoxChanged: function() {
		if (this.searchBox.value == this.lastValue)
			return;
		this.lastValue = this.searchBox.value;
		
		if (this.timeout)
			window.clearTimeout(this.timeout);
		this.timeout = window.setTimeout(function() {
			var value = this.searchBox.value;
			this.lastValue = value;
			if (value.length >= 2) {
				this.model.search(value);
			}
		}.bind(this), 500);
	}
});

document.observe("dom:loaded", function () {
	$('boxPanel').update('');
	$('moreInfoPanel').update('');
	$('searchResultsPanel').update('');
	$('searchEdit').value = '';
	
	var cbModel = new CourseSearchResults();
	var cb = new CourseBrowser($('searchEdit'), $('searchResultsPanel'), $('moreInfoPanel'), cbModel);
	
	$('searchEdit').focus();
	
	API.login('alex@alex.com', 'wookie', function(success) {
		if (success) {
			$('loginbox').update("Logged in as <b>alex@alex.com</b>&nbsp;&nbsp;");
			var logoutLink = new Element('a', {'href': '#'});
			logoutLink.update("Log out");
			$('loginbox').appendChild(logoutLink);
			logoutLink.observe('click', function() {
				// do something here
				console.log("testing");
				return false;
			});
		}
	});
});