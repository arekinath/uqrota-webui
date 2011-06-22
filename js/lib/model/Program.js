//= require <Model>
//= require <Resource>

Model.Program = Resource.make({
	url_patterns: {
		resource: '/program/{0}.json',
		find: '/programs/find.json'
	},
	relations: [
		has_n('plans')
	]
});