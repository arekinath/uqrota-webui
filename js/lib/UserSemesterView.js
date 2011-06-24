//= require <prototype>
//= require <PlanBoxView>

/**
 * class UserSemesterView
 * 
 * Displays a box representing a UserSemester object, containing
 * PlanBoxes and having a title (such as 'Semester 2, 2011' etc)
 **/

/* TODO: separate concerns between this class and the model better */

var UserSemesterView = Class.create({
	
	/**
	 * new UserSemesterView(semesterBrowser, model, elem)
	 * - model (Model.UserSemester)
	 * - elem (element): element to fill
	 **/
	initialize: function(sb, model, elem) {
		this.browser = sb;
		this.model = model;
		this.element = elem;
		
		this.update();
	},
	
	/**
	 * UserSemesterBrowser#remove() -> null
	 * 
	 * Destroys the model object and removes this view from the display
	 **/
	remove: function() {
		this.model.destroy(function() {
			this.element.remove();
		}.bind(this));
	},
	
	/**
	 * UserSemesterBrowser#update() -> null
	 * 
	 * Destroys and re-creates the contents of the UserSemesterView,
	 * creating the title span and all the PlanBoxViews.
	 **/
	update: function() {
		this.element.update('');
		this.model.getSemester(function(sem) {
			var tsp = new Element('span');
			tsp.addClassName('title');
			tsp.update(sem.getName());
			
			var ttLink = new Element('a', { href: '#' });
			ttLink.addClassName('bluebutton');
			ttLink.update('Timetable');
			tsp.appendChild(ttLink);
			
			var asLink = new Element('a', { href: '#' });
			asLink.addClassName('bluebutton');
			asLink.update('Assessment');
			tsp.appendChild(asLink);
			
			var remLink = new Element('a', { href: '#' });
			remLink.addClassName('bluebutton');
			remLink.update('X');
			tsp.appendChild(remLink);
			
			remLink.observe('click', function(evt) {
				evt.stop();
				this.remove();
			}.bind(this));
			
			this.element.appendChild(tsp);
			
			this.model.getPlanBoxes(function(pboxes) {
				for (var i = 0; i < pboxes.length; i++) {
					var pe = new Element('div');
					pe.addClassName('planbox');
					this.element.appendChild(pe);
				
					new PlanBoxView(pboxes[i], pe);
				}
				
				if (pboxes.length == 0) {
					var createLink = new Element('a', { href: '#' });
					createLink.addClassName('bluebutton');
					createLink.update('Plan this semester');
					tsp.appendChild(createLink);
					
					createLink.observe('click', function(evt) {
						evt.stop();
						
						this.model.save(function() {
							var pbHave = Model.PlanBox.create({ user_semester: this.model, title: 'Have to do' });
							pbHave.save(function() {
								var pbWant = Model.PlanBox.create({ user_semester: this.model, title: 'Want to do' });
								pbWant.save(function() {
									var pbMaybe = Model.PlanBox.create({ user_semester: this.model, title: 'Maybe' });
									pbMaybe.save(function() {
										this.model.refresh(function() {
											this.update();
										}.bind(this));
									}.bind(this));
								}.bind(this));
							}.bind(this));
						}.bind(this));
						
						createLink.remove();
						if (this.browser.usems.indexOf(this.model) == 0)
							this.browser.addBlank('up');
						else if (this.browser.usems.indexOf(this.model) == this.browser.usems.length - 1)
							this.browser.addBlank('down');
					}.bind(this));
					
					ttLink.remove();
					asLink.remove();
					remLink.remove();
				}
			}.bind(this));
		}.bind(this));
	}
});