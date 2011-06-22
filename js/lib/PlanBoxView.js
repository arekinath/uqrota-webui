//= require <prototype>
//= require <effects>
//= require <dragdrop>

//= require <model/Course>
//= require <model/User>
//= require <model/UserSemester>
//= require <model/PlanBox>
//= require <model/CourseSelection>

//= require <MoreInfoPanel>

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