//= require <Model>
//= require <Resource>

Model.Plan = Resource.make({
	url_patterns: {
		resource: '/plan/{0}.json'
	},
	relations: [
		belongs_to('program'),
		has_n('course_groups')
	]
});