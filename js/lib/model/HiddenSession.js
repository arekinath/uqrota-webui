//= require <Resource>
//= require <Model>

Model.HiddenSession = Resource.make({
	url_patterns: {
		create: '/my/hidden_sessions/new.json',
		resource: '/my/hidden_sessions/{0}.json'
	},
	relations: [
		belongs_to('course_selection'),
		belongs_to('session'),
		belongs_to('timetable')
	],
	creator: function(opts) {
		var data = {};
		data._class = 'HiddenSession';
		data._keys = ['id'];
		data.course_selection = opts.course_selection.zeroLevelData(true);
		data.timetable = opts.timetable.zeroLevelData(true);
		data.session = opts.session.zeroLevelData(true);
		return data;
	}
});