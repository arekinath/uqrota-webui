//= require <Resource>
//= require <Model>

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