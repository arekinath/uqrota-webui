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
});

Model.Timetable = Resource.make({
	url_patterns: {
		create: '/my/timetables/new.json',
		resource: '/my/timetable/{0}.json'
	},
	relations: [
		belongs_to('plan_box')
	],
	creator: function(opts) {
		var data = {};
		data._class = 'Timetable';
		data._keys = ['id'];
		data.plan_box = opts.plan_box.zeroLevelData(true);
		return data;
	}
});
