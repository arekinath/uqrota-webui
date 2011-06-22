//= require <Resource>
//= require <Model>
//= require <DataModel>

Model.User = Resource.make({
	url_patterns: {
		resource: '/user/{0}.json',
		count: '/user/count.json'
	},
	relations: [
		has_n('user_semesters'),
		has_n('notifications')
	]
},{
	setPassword: function(pass) {
		this.data.password = pass;
	}
});

Model.UserSemester = Resource.make({
	url_patterns: {
		resource: '/my/usersemester/{0}.json',
		create: '/my/usersemester/new.json'
	},
	relations: [
		belongs_to('user'),
		belongs_to('semester'),
		has_n('plan_boxes'),
		has_n('timetables')
	],
	creator: function(opts) {
		var data = {};
		data._class = 'UserSemester';
		data._keys = ['id'];
		data.user = opts.user.zeroLevelData(true);
		data.semester = opts.semester.zeroLevelData(true);
		data.plan_boxes = [];
		data.timetables = [];
		data.visible = typeof(opts.visible) != 'undefined' ? opts.visible : true;
		return data;
	}
});

Model.PlanBox = Resource.make({
	url_patterns: {
		create: '/my/planbox/new.json',
		resource: '/my/planbox/{0}.json'
	},
	relations: [
		belongs_to('user_semester'),
		has_n('course_selections')
	],
	creator: function(opts) {
		var data = {};
		data._class = 'PlanBox';
		data._keys = ['id'];
		data.title = opts.title;
		data.user_semester = opts.user_semester.zeroLevelData(true);
		data.courses = [];
		data.timetables = [];
		return data;
	}
});

Model.Timetable = Resource.make({
	url_patterns: {
		create: '/my/timetable/new.json',
		resource: '/my/timetable/{0}.json'
	},
	relations: [
		belongs_to('user_semester'),
		has_n('series_selections'),
		has_n('group_selections')
	],
	creator: function(opts) {
		var data = {};
		data._class = 'Timetable';
		data._keys = ['id'];
		data.user_semester = opts.user_semester.zeroLevelData(true);
		return data;
	}
});

Model.CourseSelection = Resource.make({
	url_patterns: {
		create: '/my/courseselection/new.json',
		resource: 'my/courseselection/{0}.json'
	},
	relations: [
		belongs_to('plan_box'),
		belongs_to('course'),
		has_n('series_selections'),
		has_n('group_selections')
	],
	creator: function(opts) {
		var data = {};
		data._class = 'CourseSelection';
		data._keys = ['id'];
		data.plan_box = opts.plan_box.zeroLevelData(true);
		data.course = opts.course.zeroLevelData(true);
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
