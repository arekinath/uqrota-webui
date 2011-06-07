/**
 * @author Alex Wilson
 */

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

/**
 * The course browser component, on the left-hand side of the Semester plan screen.
 * It allow users to search for courses and drag them out.
 */
var CourseBrowser = Class.create({
	
	/**
	 * @param searchBox	    elem   Element reference to the search text box
	 * @param resultsPanel  elem   panel to be filled with the search results
	 * @param model         CourseSearchResults   model to use
	 */
	initialize: function(searchBox, resultsPanel, model) {
		this.model = model;
		this.searchBox = searchBox;
		this.searchBox.observe('change', this.searchBoxChanged.bind(this));
		this.searchBox.observe('keypress', this.searchBoxChanged.bind(this));
		this.resultsPanel = resultsPanel;

		this.model.observe('searching', this.showSearching.bind(this));
		this.model.observe('updated', this.update.bind(this));
		this.update();
	},
	
	/**
	 * Displays the text saying 'searching' whilst waiting for a reply.
	 */
	showSearching: function() {
		this.resultsPanel.update('Searching...');
	},
	
	/**
	 * Updates the displayed search results, emptying and regenerating the
	 * search results panel.
	 */
	update: function() {
		this.resultsPanel.update();
		this.model.each(function(cs) {
			var e = new Element('div');
			e.addClassName('course');
			e.update(cs.getCode());
			e.courseModel = cs;
			var ec = new Element('span');
			ec.addClassName('name');
			ec.update(cs.getName());
			e.appendChild(ec);
			
			this.resultsPanel.appendChild(e);
			
			MoreInfoPanel.instance.bindHover(e, cs);
			
			new Draggable(e, { ghosting: true, onEnd: this.update.bind(this) });
			
		}.bind(this));
	},
	
	/**
	 * Called whenever the search edit box is updated.
	 */
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

/**
 * A wrapper around displaying data in the 'More Info' panel on the bottom-left.
 * It can display a news feed, or detailed data about a particular course.
 */
var MoreInfoPanel = Class.create({
	/**
	 * @param elem    element  the element to use as the More Info panel
	 */
	initialize: function(elem) {
		this.element = elem;
		this.state = 'feed';
		
		this.update();
	},
	
	/**
	 * Updates the panel's contents
	 */
	update: function() {
		this.element.update('');
		if (this.state == 'feed') {
			this.element.update('Feed here');
		} else if (this.state == 'course') {
			var cs = this.course;
			this.element.update('<b>'+cs.getCode() + '</b><br/>'+cs.getDescription()+'<br/>'+cs.getCoordinator());
		}
	},
	
	/**
	 * Show a given course's detailed data in the panel
	 * Calls update() automatically
	 */
	showCourse: function(c) {
		this.course = c;
		this.state = 'course';
		this.update();
	},
	
	/**
	 * Binds a mouse hover on the element 'e' to display details of the
	 * course 'cs' in the More Info panel.
	 * @param e    element   the element to have mouse hover bound
	 * @param cs   Model.Course    course to display
	 */
	bindHover: function(e, cs) {
		var to = null;
		e.observe('mouseenter', function() {
			if (to)
				window.clearTimeout(to);
			to = window.setTimeout(function() {
				MoreInfoPanel.instance.showCourse(cs);
			}.bind(this), 500);
		}.bind(this));
		e.observe('mouseleave', function() {
			if (to)
				window.clearTimeout(to);
			to = null;
		});
	}
});

/**
 * Displays a particular 'plan box', such as 'Have to do', which contains courses
 * and is contained by a UserSemesterView.
 */
var PlanBoxView = Class.create({
	
	/**
	 * @param planBox 	Model.PlanBox		the model planbox object
	 * @param elem		element				the element to fill with the view
	 */
	initialize: function(planBox, elem) {
		this.element = elem;
		this.planBox = planBox;
		
		this.update();
	},
	
	/**
	 * Destroys and re-creates the contents of the planbox (title and
	 * course bubbles).
	 */
	update: function() {
		this.element.update('');
		
		var petitle = new Element('span');
		petitle.addClassName('title');
		petitle.update(this.planBox.getTitle());
		this.element.appendChild(petitle);
		
		this.planBox.getCourseSelections.each(function(csm) {
			this.addCourseSelection(csm);
		}.bind(this));
		
		Droppables.add(this.element, {
			accept: ['course', 'ucourse'],
			hoverclass: 'hovering',
			onDrop: function(elem) {
				var course = elem.courseModel;
				
				if (elem.courseSelectionModel) {
					elem.courseSelectionModel.destroy(function() {
						this.addCourse(course);
					}.bind(this));
				} else {
					console.log("calling addCourse");
					this.addCourse(course);
				}
				
				elem.remove();
			}.bind(this)
		});
	},
	
	/**
	 * Creates a new CourseSelection for the given course
	 * and adds it to the view.
	 * @param cs	Model.Course		the course to add
	 */
	addCourse: function(cs) {
		var ee = new Element('div');
		ee.addClassName('ucourse');
		ee.courseModel = cs;
		ee.style.opacity = "0.2";
		ee.update(cs.getCode());
		
		this.element.appendChild(ee);
		
		var csm = Model.CourseSelection.create({
			plan_box: this.planBox,
			course: cs
		});
		csm.save(function() {
			this.addCourseSelection(csm, ee);
		}.bind(this));
	},
	
	/**
	 * Adds an already extant CourseSelection to the view
	 * @param csm	Model.CourseSelection
	 * @param ee	element		OPTIONAL used by addCourse()
	 */
	addCourseSelection: function(csm, ee) {
		if (!ee) {
			ee = new Element('div');
			ee.addClassName('ucourse');
			ee.courseSelectionModel = csm;
			ee.style.opacity = "0.2";
			
			this.element.appendChild(ee);
		} else {
			ee.courseSelectionModel = csm;
		}
		
		csm.getCourse(function(course) {
			ee.update(course.getCode());
			ee.courseModel = course;
			ee.fade({ duration: 0.5, from: 0.2, to: 1.0 });
			
			MoreInfoPanel.instance.bindHover(ee, course);
			
			new Draggable(ee, { 
				revert: 'failure'
			});	
		}.bind(this));
	}
});

/**
 * Displays a box representing a UserSemester object, containing
 * PlanBoxes and having a title (such as 'Semester 2, 2011' etc)
 */
var UserSemesterView = Class.create({
	
	/**
	 * @param model		Model.UserSemester
	 * @param elem		element				element to fill
	 */
	initialize: function(model, elem) {
		this.model = model;
		this.element = elem;
		
		this.update();
	},
	
	/**
	 * Destroys and re-creates the contents of the UserSemesterView,
	 * creating the title span and all the PlanBoxViews.
	 */
	update: function() {
		this.element.update('');
		this.model.getSemester(function(sem) {
			var tsp = new Element('span');
			tsp.addClassName('title');
			tsp.update(sem.getName());
			this.element.appendChild(tsp);
			
			this.model.getPlanBoxes.each(function(pbox) {
				var pe = new Element('div');
				pe.addClassName('planbox');
				this.element.appendChild(pe);
				
				new PlanBoxView(pbox, pe);
			}.bind(this));
		}.bind(this));
	}
});

/**
 * The semester browser widget, which forms the right-hand half of the Semester plan
 * page. It contains a box for each UserSemester and also handles dragging a
 * CourseSelection "outside" its owner box to destroy it.
 */
var SemesterBrowser = Class.create({
	
	/**
	 * @param mainDiv	elem	the element to put the main display in
	 * @param trashDiv	elem	the "trash" element where things disappear
	 */
 	initialize: function(mainDiv, trashDiv) {
		this.mainDiv = mainDiv;
		this.trashDiv = trashDiv;
		this.update();
	},
	
	/**
	 * Destroys and re-creates the contents of the Semester browser
	 */
	update: function() {
		this.mainDiv.update('');
		
		Droppables.add(this.trashDiv, {
			accept: ['ucourse'],
			onDrop: function(elem) {
				if (elem.courseSelectionModel) {
					elem.courseSelectionModel.destroy();
				}
				elem.remove();
			}
		});
		
		Model.User.get('me', function(me) {
			me.getUserSemesters.each(function(usem) {
				this.addUserSemester(usem);
			}.bind(this));
		}.bind(this));
	},
	
	/**
	 * Takes a UserSemester object and adds a representation of it to the view
	 * @param usem		Model.UserSemester
	 */
	addUserSemester: function(usem) {
		var e = new Element('div');
		e.addClassName('usersemester');
		this.mainDiv.appendChild(e);
		
		new UserSemesterView(usem, e);
	}
})

document.observe("dom:loaded", function () {
	MoreInfoPanel.instance = new MoreInfoPanel($('moreInfoPanel'));
	
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
			
			var cbModel = new CourseSearchResults();
			var cb = new CourseBrowser($('searchEdit'), $('searchResultsPanel'), cbModel);
			
			var sb = new SemesterBrowser($('boxPanel'), $('main'));
			$('searchEdit').value = '';
			$('searchEdit').focus();
		}
	});
});