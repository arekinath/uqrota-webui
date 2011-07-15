//= require <Resource>
//= require <Model>

Model.CourseSelection = Resource.make({
	url_patterns: {
		create: '/my/courseselection/new.json',
		resource: 'my/courseselection/{0}.json'
	},
	relations: [
		belongs_to('plan_box'),
		belongs_to('course'),
		belongs_to('offering'),
		has_n('series_selections'),
		has_n('hidden_sessions')
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