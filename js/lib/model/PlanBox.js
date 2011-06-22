//= require <Resource>
//= require <Model>

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
