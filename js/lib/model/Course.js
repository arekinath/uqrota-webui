//= require <Model>
//= require <Resource>

Model.Course = Resource.make({
	url_patterns: {
		resource: '/course/{0}.json',
		find: '/courses/find.json'
	},
	relations: [
		has_n("prereqs"),
		has_n("dependents"),
		has_n("offerings")
	]
});