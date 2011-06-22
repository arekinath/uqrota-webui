//= require <Resource>
//= require <Model>

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