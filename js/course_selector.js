// UQRota
// Copyright Alex Wilson 2010
// course_selector.js -- course selector widget

// line bump
// The Course selector widget
// also stores current state about courses and selections
// (so this is a data/state class as well as view)
var CourseSelector = Class.create({
  initialize: function(target) {
    this.target = target;
    this.courses = new Array;
    this.render();
  },

  render: function() {
    this.headingDiv = new Element('div');
    this.headingDiv.addClassName('menubar');
    this.addButton = new MenuButton(this.headingDiv, 'Add course', 'add');
    var infodiv = new Element('div');
    infodiv.addClassName('hint');
    infodiv.update('click a course or group name to alter or remove');
    this.headingDiv.appendChild(infodiv);

    this.addButton.element.observe('click', (function (event) {
      event.stop();
      new AddCourseContextDialog(this.addButton);
    }).bind(this));

    this.innerDiv = new Element('div');
    this.innerDiv.addClassName('course_sel_inner');
    
    this.target.appendChild(this.headingDiv);
    this.target.appendChild(this.innerDiv);
  },

  // Fetches the selector's internal series object
  // @param series_id	int
  getSeries: function(series_id) {
    var theSeries = null;
    this.courses.each((function(course) {
      course.series.each((function(series) {
	if (series.id == series_id) theSeries = series;
      }).bind(this));
    }).bind(this));
    return theSeries;
  },

  // Adds a course to the UI
  // @param course	Object
  addCourse: function(course) {
    this.addCoursePre(course, null);
  },

  // Adds a course to the UI, using preset selections
  // @param course	Object
  // @param pre		Object		(like course but with active_group_id set on each series)
  addCoursePre: function(course, pre) {
    course.groupDiv = new Element('div');
    this.courses.push(course);

    // construct the button for the course as a whole
    var button = new MenuButton(course.groupDiv, course.code);
    button.element.addClassName('redgradient');
    button.element.observe('click', (function (event) {
      event.stop();
      var cm = new CourseContextMenu(course, button);
    }).bind(this));

    course.series.each(function (series) {
      // figure out what the active group should be
      // default to group[0] if we don't have a preset
      if (pre) {
	var pres = pre.series.detect(function (ss) { return (ss.id == series.id); } );
	if (pres) series.activeGroup = series.groups.detect(function (g) { return (g.id == pres.active_group_id); });
	else series.activeGroup = series.groups[0];
      } else {
	series.activeGroup = series.groups[0];
      }

      // deal with stupid blank series
      if (!series.activeGroup) {
        var serButton = new MenuButton(course.groupDiv, series.name);
        serButton.element.observe('click', function(event) {
          event.stop();
        });
        series.button = serButton;
        return;
      }

      // construct the switcher button for this series
      var serButton = new MenuButton(course.groupDiv, series.activeGroup.name);
      serButton.element.observe('click', (function (event) {
	event.stop();
	var sm = new SeriesSwitchContextMenu(serButton, series);
      }).bind(this));
      series.button = serButton;

      // now fetch the group object and place it on the UI
      Server.fetchGroup(Application.calendar, series.activeGroup.id);
    });

    this.innerDiv.appendChild(course.groupDiv);
  },

  // Removes all courses from the UI
  removeAll: function() {
    this.courses.each((function(c) {
      c.groupDiv.remove();
      c.series.each(function (series) {
	if (series.activeGroup) Application.calendar.removeGroup(series.activeGroup.id);
      });
    }).bind(this));
    this.courses = new Array;
  },

  // Removes a specific course from the UI
  // @param course_id	int
  removeCourse: function(course_id) {
    var cs = this.courses;
    cs.each((function(c) {
      if (c.id == course_id) {
	c.groupDiv.remove();
	c.series.each(function (series) {
	  Application.calendar.removeGroup(series.activeGroup.id);
	});
	this.courses = this.courses.without(c);
      }
    }).bind(this));
  },

  // Forces a given series selector to point to the group given
  // @param series_id	int
  // @param group_id	int
  makeActive: function(series_id, group_id) {
    var series = Application.courseSelector.getSeries(series_id);
    if (series.activeGroup.id != group_id) {
      var oldActive = series.activeGroup.id;

      series.groups.each((function(g) {
	if (g.id == group_id)
	  series.activeGroup = g;
      }).bind(this));

      Application.calendar.removeGroup(oldActive);
      Server.fetchGroup(Application.calendar, group_id);
      series.button.element.update(series.activeGroup.name);
    }
  }
});

// the "context menu" that pops up when you click a series button
var SeriesSwitchContextMenu = Class.create({
  initialize: function(button, series) {
    this.button = button;
    this.series = series;
    this.render();
  },

  render: function() {
    var menu = new Element('div');
    menu.addClassName('context_menu');
    menu.setStyle({ width: '70px', maxHeight: '200px', overflow: 'auto' });
    menu.clonePosition(this.button.element, { setWidth: false, setHeight: false, offsetTop: 25 });

    InstrumentCounters.fire('series switcher menu');

    this.series.groups.each((function (group) {

      var icon = (group.id == this.series.activeGroup.id ? 'tick' : '');
      var link = new ContextMenuItem(menu, icon, group.name);
      link.element.observe('click', (function (event) {
	event.stop();
	ContextMenu.close();
	Application.calendar.removeGroup(this.series.activeGroup.id);
	this.series.activeGroup = group;
	Server.fetchGroup(Application.calendar, group.id);
	this.button.element.update(group.name);
      }).bind(this));

    }).bind(this));

    ContextMenu.open(menu);
  }
});

// little context dialog that appears when you want to add a new course
var AddCourseContextDialog = Class.create({
  initialize: function(button) {
    this.button = button;
    this.render();
  },

  render: function() {
    var menu = new Element('div');
    menu.addClassName('context_menu');
    menu.setStyle({ background: '#ddf', paddingLeft: '5px' });
    menu.clonePosition(this.button.element, { setWidth: false, setHeight: false, offsetTop: 25 });

    this.inputBox = new Element('input');
    this.inputBox.type = 'text';
    this.inputBox.value = '<course code>';
    this.inputBox.setStyle({ color: '#999', width: '10em' });

    this.inputBox.observe('click', (function (event) {
      event.stop();
      this.inputBox.value = '';
      this.inputBox.setStyle({ color: 'black' });
    }).bind(this));
    this.inputBox.observe('keypress', (function (event) {
      if (event.keyCode == Event.KEY_RETURN) {
	event.stop();
        if (this.inputBox.value.length == 8) {
  	  ContextMenu.close();
	  Server.fetchCourse(Application.courseSelector, Application.currentSemester.id, this.inputBox.value);
        } else {
          this.inputBox.setStyle({ background: 'red' });
        }
      } else if (this.inputBox.value == '<course code>') {
	this.inputBox.value = '';
	this.inputBox.setStyle({ color: 'black' });
      }
    }).bind(this));

    menu.appendChild(this.inputBox);

    this.okayButton = new MenuButton(menu, 'ok', 'tick');
    this.okayButton.element.setStyle('float: right');
    this.okayButton.element.observe('click', (function (event) {
      event.stop();
      if (this.inputBox.value.length == 8) {
        ContextMenu.close();
        Server.fetchCourse(Application.courseSelector, Application.currentSemester.id, this.inputBox.value);
      } else {
        this.inputBox.setStyle({ background: 'red' });
      }
    }).bind(this));

    ContextMenu.open(menu);
    this.inputBox.focus();
  }
});

// the menu that pops up when you click a course button
var CourseContextMenu = Class.create({
  initialize: function(course, button) {
    this.course = course;
    this.button = button;
    this.render();
  },

  render: function() {
    var menu = new Element('div');
    menu.addClassName('context_menu');
    menu.clonePosition(this.button.element, { setWidth: false, setHeight: false, offsetTop: 25 });

    var link = new ContextMenuItem(menu, 'cross', 'Remove');
    link.element.observe('click', this.removeCourse.bind(this));

    link = new ContextMenuItem(menu, 'arrow_refresh', 'Reload from server');
    link.element.observe('click', this.reloadCourse.bind(this));

    link = new ContextMenuItem(menu, 'arrow_rotate_anticlockwise', 'Force reload from mySI-net');
    link.element.observe('click', this.forceReload.bind(this));

    ContextMenu.open(menu);
  },

  removeCourse: function(event) {
    Application.courseSelector.removeCourse(this.course.id);
    event.stop();
    ContextMenu.close();
    InstrumentCounters.fire('remove course');
  },

  forceReload: function(event) {
    Application.courseSelector.removeCourse(this.course.id);
    Server.forceCourseReload(Application.courseSelector, this.course);
    event.stop();
    ContextMenu.close();
    InstrumentCounters.fire('force reload');
  },

  reloadCourse: function(event) {
    Application.courseSelector.removeCourse(this.course.id);
    Server.fetchCourse(Application.courseSelector, this.course.semester_id, this.course.code);
    event.stop();
    ContextMenu.close();
  }
});
