//= require <UserSemesterView>
//= require <UserModel>
//= require <effects>
//= require <dragdrop>

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
		this.usems = [];
		this.update();
	},
	
	addBlank: function(dir, cb) {
		if (dir == 'up') {
			console.log('going up');
			Model.User.get('me', function(me) {
				this.usems[0].getSemester(function(sem) {
					sem.getPred(function(ssem) {
						var usem = Model.UserSemester.create({ "user": me, "semester": ssem });
						this.addUserSemester(usem, 'top');
						if (cb)
							cb();
					}.bind(this));
				}.bind(this));
			}.bind(this));
		} else if (dir == 'down') {
			Model.User.get('me', function(me) {
				this.usems[this.usems.length-1].getSemester(function(sem) {
					sem.getSucc(function(ssem) {
						var usem = Model.UserSemester.create({ "user": me, "semester": ssem });
						this.addUserSemester(usem, 'bottom');
						if (cb)
							cb();
					}.bind(this));
				}.bind(this));
			}.bind(this));
		}
	},
	
	/**
	 * Destroys and re-creates the contents of the Semester browser
	 **/
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
			me.getUserSemesters(function(usems) {
				if (usems.length == 0) {
					Model.Semester.get('current', function(sem) {
						var usem = Model.UserSemester.create({ "user": me, "semester": sem });
						this.addUserSemester(usem);
						
						this.addBlank('up', function() {
							this.addBlank('down', function() {
								this.addBlank('down');
							}.bind(this));
						}.bind(this));						
					}.bind(this));				
				} else {
					for (var i = 0; i < usems.length; i++) {
						this.addUserSemester(usems[i]);
					}
					this.addBlank('up', function() {
						this.addBlank('down', function() {
							this.addBlank('down');
						}.bind(this));
					}.bind(this));
				}
			}.bind(this));
		}.bind(this));
	},
	
	/**
	 * Takes a UserSemester object and adds a representation of it to the view
	 * @param usem		Model.UserSemester
	 **/
	addUserSemester: function(usem, place) {
		var e = new Element('div');
		e.addClassName('usersemester');
		if (typeof(place) == 'undefined') {
			this.mainDiv.appendChild(e);
			this.usems.push(usem);
		} else {
			var insh = {};
			insh[place] = e;
			this.mainDiv.insert(insh);
			
			if (place == 'top')
				this.usems.unshift(usem);
			else
				this.usems.push(usem);
		}
		
		new UserSemesterView(this, usem, e);
	}
});