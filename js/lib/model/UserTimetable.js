//= require <Resource>
//= require <Model>

Model.Timetable = Resource.make({
	url_patterns: {
		create: '/my/timetable/new.json',
		resource: '/my/timetable/{0}.json'
	},
	relations: [
		belongs_to('user_semester'),
		has_n('series_selections'),
		has_n('group_selections'),
		has_n('hidden_sessions')
	],
	creator: function(opts) {
		var data = {};
		data._class = 'Timetable';
		data._keys = ['id'];
		data.user_semester = opts.user_semester.zeroLevelData(true);
		return data;
	}
});