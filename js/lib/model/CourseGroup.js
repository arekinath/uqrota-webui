//= require <Model>
//= require <Resource>

Model.CourseGroup = Resource.make({
	url_patterns: {
		resource: '/coursegroup/{0}.json'
	},
	relations: [
		belongs_to('plan'),
		has_n('courses')
	]
});