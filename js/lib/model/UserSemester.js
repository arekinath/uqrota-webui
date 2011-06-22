//= require <Resource>
//= require <Model>

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