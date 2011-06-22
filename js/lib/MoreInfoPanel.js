//= require <prototype>

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