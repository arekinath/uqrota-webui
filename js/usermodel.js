/**
 * @author Alex Wilson
 */

Model.User = Resource.make({
	url_patterns: {
		resource: '/user/{0}.json',
		count: '/user/count.json'
	},
	relations: [
		has_n('plan_boxes'),
		has_n('notifications')
	]
},{
	setPassword: function(pass) {
		this.data.password = pass;
	}
});

Model.PlanBox = Resource.make({
	url_patterns: {
		create: '/my/planboxes/new.json',
		resource: '/my/planbox/{0}.json'
	},
	relations: [
		belongs_to('user'),
		has_n('timetables')
	],
	creator: function(opts) {
		var data = {};
		data._class = 'PlanBox';
		data._keys = ['id'];
		data.title = opts.title;
		data.user = opts.user.zeroLevelData(true);
		data.semester = opts.semester.zeroLevelData(true);
		data.courses = [];
		data.timetables = [];
		return data;
	}
},{
	save: function($super, callback) {
		var params = this._collectionToParams(this.data.courses, 'courses');
		console.log(params);
		$super(function() {
			new Ajax.Request('/my/planbox/{0}/courses.json'.format(this._id()), {
				method: 'post',
				requestHeaders: {"X-Api-Secret": API.secret},
				parameters: params,
				onSuccess: function(t) {
					this._setData(t.responseJSON);
					if (callback)
						callback();
				}.bind(this)
			});
		}.bind(this));
	},
	
	addCourse: function(course) {
		this.data.courses[this.data.courses.length] = course.zeroLevelData(true);
	},
	
	removeCourse: function(course) {
		this.data.courses = this.data.courses.reject(function(c) {
			return (c['code'] == course.getCode());
		});
	},
	
	setCourses: function(courses) {
		this.data.courses = courses.collect(function(c) {
			return c.zeroLevelData(true);
		});
	}
});

Model.Timetable = Resource.make({
	url_patterns: {
		create: '/my/timetables/new.json',
		resource: '/my/timetable/{0}.json'
	},
	relations: [
		belongs_to('plan_box'),
		has_n('course_selections')
	],
	creator: function(opts) {
		var data = {};
		data._class = 'Timetable';
		data._keys = ['id'];
		data.plan_box = opts.plan_box.zeroLevelData(true);
		return data;
	}
});

Model.CourseSelection = Resource.make({
	url_patterns: {
		create: '/my/course_selections/new.json',
		resource: 'my/course_selection/{0}.json'
	},
	relations: [
		belongs_to('timetable'),
		belongs_to('course'),
		has_n('series_selections'),
		has_n('group_selections')
	],
	creator: function(opts) {
		var data = {};
		data._class = 'CourseSelection';
		data._keys = ['id'];
		data.timetable = opts.timetable.zeroLevelData(true);
		data.course = opts.course.zeroLevelData(true);
		data.visible = typeof(opts.visible) != 'undefined' ? opts.visible : true;
		return data;
	}
});

Model.SeriesSelection = Resource.make({
	url_patterns: {
		create: '/my/series_selections/new.json',
		resource: '/my/series_selection/{0}.json'
	},
	relations: [
		belongs_to('course_selection'),
		belongs_to('series'),
		belongs_to('selected_group')
	],
	creator: function(opts) {
		var data = {};
		data._class = 'SeriesSelection';
		data._keys = ['id'];
		data.course_selection = opts.course_selection.zeroLevelData(true);
		data.series = opts.series.zeroLevelData(true);
		data.selected_group = opts.selected_group.zeroLevelData(true);
		return data;
	}
});

Model.GroupSelection = Resource.make({
	url_patterns: {
		create: '/my/group_selections/new.json',
		resource: '/my/group_selection/{0}.json'
	},
	relations: [
		belongs_to('course_selection'),
		belongs_to('group')
	],
	creator: function(opts) {
		var data = {};
		data._class = 'GroupSelection';
		data._keys = ['id'];
		data.course_selection = opts.course_selection.zeroLevelData(true);
		data.group = opts.group.zeroLevelData(true);
		return data;
	}
});
