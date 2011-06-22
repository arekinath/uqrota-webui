//= require <prototype>
//= require <MoreInfoPanel>
//= require <effects>
//= require <dragdrop>

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